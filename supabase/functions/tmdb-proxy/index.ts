// TMDB/Trakt proxy Edge Function implementing the cache-aside pattern from
// ADR 0005.
//
// Two Postgres tables (created by a parallel migration task, not by this
// function):
//   - movie_metadata_cache(tmdb_id, data jsonb, last_fetched_at)
//   - streaming_availability_cache(tmdb_id, region, data jsonb, last_fetched_at)
//
// Request body: { tmdbId: number, kind: "metadata" | "streaming", region?: string }
//
// The freshness/TTL DECISION (serve cached row vs. fetch fresh) lives in
// ./freshness.ts as pure functions, unit-tested separately with Deno.test.
// The actual TMDB fetch calls are stubbed in ./tmdb-client.ts (see TODOs
// there) — this file only wires the cache-aside mechanism together.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  isMetadataFresh,
  isStreamingFresh,
  type MetadataCacheRow,
  type StreamingCacheRow,
} from "./freshness.ts";
import { fetchMetadataFromTmdb, fetchStreamingFromTmdb } from "./tmdb-client.ts";

interface ProxyRequestBody {
  tmdbId: number;
  kind: "metadata" | "streaming";
  region?: string;
}

function getSupabaseClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
  // into every Edge Function's environment (standard pattern, not something
  // this function needs to set up).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in the function environment",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

async function handleMetadata(
  supabase: SupabaseClient,
  tmdbId: number,
): Promise<unknown> {
  const { data: cachedRow, error: readError } = await supabase
    .from("movie_metadata_cache")
    .select("tmdb_id, data, last_fetched_at")
    .eq("tmdb_id", tmdbId)
    .maybeSingle<MetadataCacheRow>();

  if (readError) throw readError;

  if (isMetadataFresh(cachedRow)) {
    return cachedRow!.data;
  }

  const freshData = await fetchMetadataFromTmdb(tmdbId);

  const { error: writeError } = await supabase
    .from("movie_metadata_cache")
    .upsert({
      tmdb_id: tmdbId,
      data: freshData,
      last_fetched_at: new Date().toISOString(),
    });

  if (writeError) throw writeError;

  return freshData;
}

async function handleStreaming(
  supabase: SupabaseClient,
  tmdbId: number,
  region: string,
): Promise<unknown> {
  const { data: cachedRow, error: readError } = await supabase
    .from("streaming_availability_cache")
    .select("tmdb_id, region, data, last_fetched_at")
    .eq("tmdb_id", tmdbId)
    .eq("region", region)
    .maybeSingle<StreamingCacheRow>();

  if (readError) throw readError;

  if (isStreamingFresh(cachedRow)) {
    return cachedRow!.data;
  }

  const freshData = await fetchStreamingFromTmdb(tmdbId, region);

  const { error: writeError } = await supabase
    .from("streaming_availability_cache")
    .upsert({
      tmdb_id: tmdbId,
      region,
      data: freshData,
      last_fetched_at: new Date().toISOString(),
    });

  if (writeError) throw writeError;

  return freshData;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: ProxyRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (
    typeof body.tmdbId !== "number" ||
    (body.kind !== "metadata" && body.kind !== "streaming")
  ) {
    return jsonResponse(
      {
        error:
          "Expected { tmdbId: number, kind: 'metadata' | 'streaming', region?: string }",
      },
      400,
    );
  }

  // NOTE (decision point, not made autonomously): no default region has
  // been decided for kind: "streaming" requests that omit `region`. Rather
  // than guessing a default (e.g. "DE"), this returns a 400 until that's
  // explicitly decided. See task report.
  if (body.kind === "streaming" && !body.region) {
    return jsonResponse(
      { error: "region is required for kind: 'streaming'" },
      400,
    );
  }

  try {
    const supabase = getSupabaseClient();
    const data = body.kind === "metadata"
      ? await handleMetadata(supabase, body.tmdbId)
      : await handleStreaming(supabase, body.tmdbId, body.region!);

    return jsonResponse({ data }, 200);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
