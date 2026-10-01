// TMDB/Trakt proxy Edge Function implementing the cache-aside pattern from
// ADR 0005, extended in M6 part 1 with the actions needed by the
// Movie-Detail-Overlay (search/details/videos/credits/release_dates/
// collection/providers/providers_list/trakt_related/search_person/
// person_movies/director_movies/search_company/studio_movies), per
// docs/feature-inventory.md Section 3 (old `tmdb.php` behavior).
//
// Two Postgres tables (created by a parallel migration task, not by this
// function):
//   - movie_metadata_cache(tmdb_id, data jsonb, last_fetched_at)
//   - streaming_availability_cache(tmdb_id, region, data jsonb, last_fetched_at)
//
// Request body: { kind: <see ProxyKind below>, ...kind-specific params }
//
// Caching split (interim decision, see docs/interim-decisions.md):
//   - kind: "metadata" — UNCHANGED from M1 (whole-row cache-aside).
//   - kind: "streaming" | "providers" | "providers_batch" — cache-aside in
//     streaming_availability_cache (24h TTL, ADR 0005), data = regional
//     { flatrate, rent, buy }. "providers" is the DE single-id form,
//     "providers_batch" resolves many ids in one round trip (providers-cache.ts).
//   - kind: "details" | "videos" | "credits" | "release_dates" | "collection"
//     — NEW cache-aside fields, namespaced under their own key inside the
//     SAME movie_metadata_cache row (keyed by tmdb_id), reusing the existing
//     "static, no TTL, refetch only if still null" rule from ADR 0005.
//   - kind: "search" | "search_person" | "search_company" | "trakt_related" |
//     "providers_list" | "person_movies" | "director_movies" |
//     "studio_movies" — fetch-through every time, NOT persisted in any cache
//     table (query/lookup-shaped, no fixed per-movie cache key; consistent
//     with the legacy app's purely in-memory/session-only caches for this
//     data class, per feature-inventory.md).
//   - kind: "upsert_movie" — M7 part 1. Resolves the "movies/genres/
//     movie_genres have no authenticated INSERT/UPDATE RLS policy" gap (see
//     docs/interim-decisions.md "M6-Cleanup / M7-Vorgriff"): authenticated
//     clients call this action instead of writing to those tables directly.
//     Idempotent by tmdb_id — see ./movie-upsert.ts.
//   - kind: "refresh_release_dates" — lazy replacement for the legacy cron
//     that refilled NULL release dates (ADR 0005): batch re-check (24h TTL)
//     of date-less films, writes `movies.release_date`; see
//     ./release-date-refresh.ts.
//
// The freshness/TTL DECISION lives in ./freshness.ts as pure functions,
// unit-tested separately with Deno.test. The actual TMDB/Trakt fetch calls
// and their surrounding logic (merging, priority selection, mapping,
// scoring) live in ./tmdb-client.ts / ./trakt-client.ts, also unit-tested
// separately.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  isCacheAsideFieldFresh,
  isMetadataFresh,
  isStreamingFresh,
  type MetadataCacheRow,
  type StreamingCacheRow,
} from "./freshness.ts";
import {
  fetchCollection,
  fetchDirectorMovies,
  fetchGermanReleaseDates,
  fetchMetadataFromTmdb,
  fetchMovieCredits,
  fetchMovieDetails,
  fetchMovieProviders,
  fetchMovieVideos,
  fetchPersonMovies,
  fetchProvidersList,
  fetchStudioMovies,
  searchCompany,
  searchMovies,
  searchPerson,
} from "./tmdb-client.ts";
import { fetchTraktRelated } from "./trakt-client.ts";
import { enrichRelatedWithPosters } from "./related-posters.ts";
import { createSupabaseMovieUpsertDb, upsertMovie } from "./movie-upsert.ts";
import { MAX_PROVIDERS_BATCH_SIZE, resolveProvidersBatch } from "./providers-cache.ts";
import {
  MAX_RELEASE_DATE_BATCH_SIZE,
  refreshReleaseDatesBatch,
} from "./release-date-refresh.ts";

type ProxyKind =
  | "metadata"
  | "streaming"
  | "search"
  | "details"
  | "videos"
  | "credits"
  | "release_dates"
  | "collection"
  | "providers"
  | "providers_batch"
  | "providers_list"
  | "trakt_related"
  | "search_person"
  | "person_movies"
  | "director_movies"
  | "search_company"
  | "studio_movies"
  | "upsert_movie"
  | "refresh_release_dates";

interface ProxyRequestBody {
  kind: ProxyKind;
  tmdbId?: number;
  /** `kind: "providers_batch"` / `"refresh_release_dates"` only: ids to resolve in one round trip. */
  tmdbIds?: number[];
  region?: string;
  query?: string;
  personId?: number;
  collectionId?: number;
  companyId?: number;
  page?: number;
  /**
   * M7 consolidation (Item 1): optional client-supplied ISO date string,
   * `kind: "upsert_movie"` only — see ./movie-upsert.ts's `upsertMovie` doc
   * comment for the full "only fills a genuine TMDB gap, never overrides a
   * real TMDB date" safety rule.
   */
  manualReleaseDate?: string;
}

const VALID_KINDS: ProxyKind[] = [
  "metadata",
  "streaming",
  "search",
  "details",
  "videos",
  "credits",
  "release_dates",
  "collection",
  "providers",
  "providers_batch",
  "providers_list",
  "trakt_related",
  "search_person",
  "person_movies",
  "director_movies",
  "search_company",
  "studio_movies",
  "upsert_movie",
  "refresh_release_dates",
];

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

// --- kind: "metadata" / "streaming" (M1, unchanged) -------------------------

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
      data: { ...(cachedRow?.data ?? {}), ...freshData },
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

  // The cached shape is the regional watch-provider payload
  // ({ flatrate, rent, buy }) -- the same shape `kind: "providers"` returns,
  // so the client can also read these rows directly (RLS: authenticated SELECT).
  const freshData = await fetchMovieProviders(tmdbId, undefined, region);

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

// --- M6 part 1: shared per-field cache-aside for details/videos/credits/ ---
// --- release_dates/collection (same movie_metadata_cache row, own keys) ---

async function handleCacheAsideField<T>(
  supabase: SupabaseClient,
  tmdbId: number,
  fieldKey: string,
  fetchFresh: () => Promise<T>,
): Promise<T> {
  const { data: cachedRow, error: readError } = await supabase
    .from("movie_metadata_cache")
    .select("tmdb_id, data, last_fetched_at")
    .eq("tmdb_id", tmdbId)
    .maybeSingle<MetadataCacheRow>();

  if (readError) throw readError;

  if (isCacheAsideFieldFresh(cachedRow?.data, fieldKey)) {
    return (cachedRow!.data as Record<string, unknown>)[fieldKey] as T;
  }

  const freshValue = await fetchFresh();

  const { error: writeError } = await supabase
    .from("movie_metadata_cache")
    .upsert({
      tmdb_id: tmdbId,
      data: { ...(cachedRow?.data ?? {}), [fieldKey]: freshValue },
      last_fetched_at: new Date().toISOString(),
    });

  if (writeError) throw writeError;

  return freshValue;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, 400);
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

  if (!VALID_KINDS.includes(body.kind)) {
    return badRequest(`Unknown kind. Expected one of: ${VALID_KINDS.join(", ")}`);
  }

  try {
    const supabase = getSupabaseClient();

    switch (body.kind) {
      // --- unchanged M1 kinds -------------------------------------------
      case "metadata": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'metadata' }");
        }
        return jsonResponse({ data: await handleMetadata(supabase, body.tmdbId) }, 200);
      }
      case "streaming": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'streaming', region?: string }");
        }
        // Decision: kind: "streaming" requests that omit `region` default to
        // "DE" (explicitly confirmed by the user, not an autonomous default).
        const region = body.region ?? "DE";
        return jsonResponse({ data: await handleStreaming(supabase, body.tmdbId, region) }, 200);
      }

      // --- M6 part 1: cache-aside actions (movie_metadata_cache, per-field) -
      case "details": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'details' }");
        }
        const tmdbId = body.tmdbId;
        const data = await handleCacheAsideField(
          supabase,
          tmdbId,
          "details",
          () => fetchMovieDetails(tmdbId),
        );
        return jsonResponse({ data }, 200);
      }
      case "videos": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'videos' }");
        }
        const tmdbId = body.tmdbId;
        const data = await handleCacheAsideField(
          supabase,
          tmdbId,
          "videos",
          () => fetchMovieVideos(tmdbId),
        );
        return jsonResponse({ data }, 200);
      }
      case "credits": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'credits' }");
        }
        const tmdbId = body.tmdbId;
        const data = await handleCacheAsideField(
          supabase,
          tmdbId,
          "credits",
          () => fetchMovieCredits(tmdbId),
        );
        return jsonResponse({ data }, 200);
      }
      case "release_dates": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'release_dates' }");
        }
        const tmdbId = body.tmdbId;
        const data = await handleCacheAsideField(
          supabase,
          tmdbId,
          "releaseDatesDE",
          () => fetchGermanReleaseDates(tmdbId),
        );
        return jsonResponse({ data }, 200);
      }
      case "collection": {
        // Requires BOTH tmdbId (the movie whose row is used as the cache
        // key, per the "extend the existing metadata cache table" decision)
        // AND collectionId (the actual TMDB collection to fetch) — see
        // docs/interim-decisions.md.
        if (typeof body.tmdbId !== "number" || typeof body.collectionId !== "number") {
          return badRequest(
            "Expected { tmdbId: number, collectionId: number, kind: 'collection' }",
          );
        }
        const collectionId = body.collectionId;
        const data = await handleCacheAsideField(
          supabase,
          body.tmdbId,
          "collection",
          () => fetchCollection(collectionId),
        );
        return jsonResponse({ data }, 200);
      }

      // --- fetch-through actions (no persistent cache table) --------------
      case "search": {
        if (typeof body.query !== "string" || body.query.trim().length === 0) {
          return badRequest("Expected { query: string, kind: 'search' }");
        }
        return jsonResponse({ data: await searchMovies(body.query) }, 200);
      }
      case "providers": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'providers' }");
        }
        // ADR 0005: cache-backed (24h TTL, shared by the whole group), DE only.
        return jsonResponse({ data: await handleStreaming(supabase, body.tmdbId, "DE") }, 200);
      }
      case "providers_batch": {
        if (
          !Array.isArray(body.tmdbIds) ||
          body.tmdbIds.length > MAX_PROVIDERS_BATCH_SIZE ||
          !body.tmdbIds.every((id) => typeof id === "number")
        ) {
          return badRequest(
            `Expected { tmdbIds: number[] (max ${MAX_PROVIDERS_BATCH_SIZE}), kind: 'providers_batch' }`,
          );
        }
        const data = await resolveProvidersBatch(body.tmdbIds, {
          readRows: async (ids) => {
            const { data: rows, error } = await supabase
              .from("streaming_availability_cache")
              .select("tmdb_id, region, data, last_fetched_at")
              .eq("region", "DE")
              .in("tmdb_id", ids);
            if (error) throw error;
            return (rows ?? []) as StreamingCacheRow[];
          },
          fetchProviders: (id) => fetchMovieProviders(id),
          writeRows: async (rows) => {
            const fetchedAt = new Date().toISOString();
            const { error } = await supabase.from("streaming_availability_cache").upsert(
              rows.map((r) => ({
                tmdb_id: r.tmdb_id,
                region: "DE",
                data: r.data,
                last_fetched_at: fetchedAt,
              })),
            );
            if (error) throw error;
          },
        });
        return jsonResponse({ data }, 200);
      }
      case "providers_list": {
        return jsonResponse({ data: await fetchProvidersList() }, 200);
      }
      case "trakt_related": {
        if (typeof body.tmdbId !== "number") {
          return badRequest("Expected { tmdbId: number, kind: 'trakt_related' }");
        }
        return jsonResponse({
          data: await enrichRelatedWithPosters(await fetchTraktRelated(body.tmdbId)),
        }, 200);
      }
      case "search_person": {
        if (typeof body.query !== "string" || body.query.trim().length === 0) {
          return badRequest("Expected { query: string, kind: 'search_person' }");
        }
        return jsonResponse({ data: await searchPerson(body.query) }, 200);
      }
      case "person_movies": {
        if (typeof body.personId !== "number") {
          return badRequest("Expected { personId: number, kind: 'person_movies' }");
        }
        return jsonResponse({ data: await fetchPersonMovies(body.personId) }, 200);
      }
      case "director_movies": {
        if (typeof body.personId !== "number") {
          return badRequest("Expected { personId: number, kind: 'director_movies' }");
        }
        return jsonResponse({ data: await fetchDirectorMovies(body.personId) }, 200);
      }
      case "search_company": {
        if (typeof body.query !== "string" || body.query.trim().length === 0) {
          return badRequest("Expected { query: string, kind: 'search_company' }");
        }
        return jsonResponse({ data: await searchCompany(body.query) }, 200);
      }
      case "studio_movies": {
        if (typeof body.companyId !== "number") {
          return badRequest("Expected { companyId: number, kind: 'studio_movies', page?: number }");
        }
        return jsonResponse(
          { data: await fetchStudioMovies(body.companyId, body.page ?? 1) },
          200,
        );
      }

      // --- M7 part 1: authenticated-client "add a new movie" resolution ---
      case "upsert_movie": {
        if (typeof body.tmdbId !== "number") {
          return badRequest(
            "Expected { tmdbId: number, kind: 'upsert_movie', manualReleaseDate?: string }",
          );
        }
        if (body.manualReleaseDate !== undefined && typeof body.manualReleaseDate !== "string") {
          return badRequest("Expected manualReleaseDate to be a string (ISO date) when provided");
        }
        const db = createSupabaseMovieUpsertDb(supabase);
        const data = await upsertMovie(body.tmdbId, { db }, body.manualReleaseDate);
        return jsonResponse({ data }, 200);
      }

      case "refresh_release_dates": {
        if (
          !Array.isArray(body.tmdbIds) ||
          body.tmdbIds.length > MAX_RELEASE_DATE_BATCH_SIZE ||
          !body.tmdbIds.every((id) => typeof id === "number")
        ) {
          return badRequest(
            `Expected { tmdbIds: number[] (max ${MAX_RELEASE_DATE_BATCH_SIZE}), kind: 'refresh_release_dates' }`,
          );
        }
        const data = await refreshReleaseDatesBatch(body.tmdbIds, {
          readRows: async (ids) => {
            const { data: rows, error } = await supabase
              .from("movie_metadata_cache")
              .select("tmdb_id, data, last_fetched_at")
              .in("tmdb_id", ids);
            if (error) throw error;
            return (rows ?? []) as MetadataCacheRow[];
          },
          fetchReleaseDate: async (id) => {
            const german = await fetchGermanReleaseDates(id);
            if (german?.release_date) return german.release_date;
            return (await fetchMovieDetails(id)).releaseDate || null;
          },
          updateMovieReleaseDate: async (id, date) => {
            const { error } = await supabase
              .from("movies")
              .update({ release_date: date })
              .eq("tmdb_id", id)
              .is("release_date", null);
            if (error) throw error;
          },
          writeRows: async (rows) => {
            const fetchedAt = new Date().toISOString();
            const { error } = await supabase.from("movie_metadata_cache").upsert(
              rows.map((r) => ({ tmdb_id: r.tmdb_id, data: r.data, last_fetched_at: fetchedAt })),
            );
            if (error) throw error;
          },
        });
        return jsonResponse({ data }, 200);
      }

      default: {
        // Exhaustiveness guard — VALID_KINDS check above should make this
        // unreachable, but keep TypeScript honest.
        const _exhaustive: never = body.kind;
        return badRequest(`Unhandled kind: ${_exhaustive}`);
      }
    }
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
