// Stubbed TMDB fetch calls used by the cache-aside Edge Function handler.
//
// The real request/response shaping — DE+EN merge on search, German
// release-date priority (Kino/Digital/TV), genre mapping — from the old
// `tmdb.php` is intentionally NOT implemented here. See the TODOs below and
// the M1-part-3 task report for why (no old tmdb.php source and no network
// access were available to build/verify that logic in this task).
//
// This task focuses on the cache-aside MECHANISM (freshness.ts + index.ts).
// A follow-up task must implement these functions for real, using
// docs/feature-inventory.md Section 3 as the behavior spec.

export interface TmdbMetadata {
  runtime: number | null;
  director: string | null;
  genres: string[] | null;
  poster: string | null;
  [key: string]: unknown;
}

export interface TmdbStreamingAvailability {
  providers: string[];
  [key: string]: unknown;
}

const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY");

/**
 * TODO: implement full DE+EN merge + field mapping per feature-inventory.md
 * Section 3 (old tmdb.php behavior). This placeholder does not call the
 * real TMDB API yet — it only validates that the key is configured and
 * returns an all-null shape, matching movie_metadata_cache's "data" jsonb
 * shape closely enough for the cache-aside plumbing to be exercised.
 */
export function fetchMetadataFromTmdb(
  _tmdbId: number,
): Promise<TmdbMetadata> {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }

  return Promise.resolve({
    runtime: null,
    director: null,
    genres: null,
    poster: null,
  });
}

/**
 * TODO: implement full DE+EN merge + field mapping per feature-inventory.md
 * Section 3 (old tmdb.php behavior). This placeholder does not call the
 * real TMDB API yet.
 */
export function fetchStreamingFromTmdb(
  _tmdbId: number,
  _region: string,
): Promise<TmdbStreamingAvailability> {
  if (!TMDB_API_KEY) {
    throw new Error(
      "TMDB_API_KEY is not set (expected in Supabase Edge Function Secrets, see ADR 0009)",
    );
  }

  return Promise.resolve({
    providers: [],
  });
}
