// Deno.test suite for the cache-aside freshness/TTL decision logic.
// Run with: deno test supabase/functions/tmdb-proxy/freshness.test.ts
//
// No external test-framework import on purpose: keeps this runnable via the
// bare `deno test` built-in without any network fetch for a std/assert
// module, since Edge Function dev machines may be offline.

import {
  isMetadataFresh,
  isStreamingFresh,
  type MetadataCacheRow,
  type StreamingCacheRow,
} from "./freshness.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// --- streaming_availability_cache (24h TTL) ---------------------------

Deno.test("isStreamingFresh: row fetched within the last 24h is fresh", () => {
  const now = new Date("2026-09-19T12:00:00.000Z");
  const row: StreamingCacheRow = {
    tmdb_id: 123,
    region: "DE",
    data: { providers: ["netflix"] },
    last_fetched_at: new Date("2026-09-19T00:00:00.000Z").toISOString(), // 12h ago
  };

  assert(
    isStreamingFresh(row, now) === true,
    "expected a 12h-old streaming row to be fresh (< 24h TTL)",
  );
});

Deno.test("isStreamingFresh: row older than 24h is stale", () => {
  const now = new Date("2026-09-19T12:00:00.000Z");
  const row: StreamingCacheRow = {
    tmdb_id: 123,
    region: "DE",
    data: { providers: ["netflix"] },
    last_fetched_at: new Date("2026-09-17T00:00:00.000Z").toISOString(), // ~60h ago
  };

  assert(
    isStreamingFresh(row, now) === false,
    "expected a >24h-old streaming row to be stale",
  );
});

Deno.test("isStreamingFresh: no row at all is stale (must fetch)", () => {
  assert(
    isStreamingFresh(null) === false,
    "expected a null streaming row to be stale",
  );
  assert(
    isStreamingFresh(undefined) === false,
    "expected an undefined streaming row to be stale",
  );
});

// --- movie_metadata_cache (unlimited TTL, null-field triggers refetch) --

Deno.test("isMetadataFresh: row with all required fields present is fresh forever", () => {
  const row: MetadataCacheRow = {
    tmdb_id: 456,
    data: {
      runtime: 118,
      director: "Denis Villeneuve",
      genres: ["Sci-Fi"],
      poster: "/poster.jpg",
    },
    // Deliberately ancient timestamp: metadata has no real TTL, so this
    // must still count as fresh.
    last_fetched_at: new Date("2020-01-01T00:00:00.000Z").toISOString(),
  };

  assert(
    isMetadataFresh(row) === true,
    "expected a metadata row with all required fields to be fresh regardless of age",
  );
});

Deno.test("isMetadataFresh: row with a null required field needs a refetch", () => {
  const row: MetadataCacheRow = {
    tmdb_id: 456,
    data: {
      runtime: 118,
      director: null,
      genres: ["Sci-Fi"],
      poster: "/poster.jpg",
    },
    last_fetched_at: new Date().toISOString(),
  };

  assert(
    isMetadataFresh(row) === false,
    "expected a metadata row with a null required field to need a refetch",
  );
});

Deno.test("isMetadataFresh: no row at all needs a fetch", () => {
  assert(
    isMetadataFresh(null) === false,
    "expected a null metadata row to need a fetch",
  );
  assert(
    isMetadataFresh(undefined) === false,
    "expected an undefined metadata row to need a fetch",
  );
});
