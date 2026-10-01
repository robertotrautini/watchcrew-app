// Poster/score enrichment for the `trakt_related` action. Trakt returns no
// images, so each related item is looked up on TMDB (server-side, bounded
// concurrency, per-item graceful fallback to null) in the same Edge Function
// call — one client round trip instead of up to 40.

import { fetchMovieDetails } from "./tmdb-client.ts";
import type { TraktRelatedMovie } from "./trakt-client.ts";

export const POSTER_LOOKUP_CONCURRENCY = 8;

export interface PosterLookupResult {
  posterPath: string | null;
  voteAverage: number | null;
}

export type PosterLookup = (tmdbId: number) => Promise<PosterLookupResult>;

export interface EnrichedRelatedMovie extends TraktRelatedMovie {
  posterPath: string | null;
  voteAverage: number | null;
}

async function defaultLookup(tmdbId: number): Promise<PosterLookupResult> {
  const details = await fetchMovieDetails(tmdbId);
  return { posterPath: details.posterPath, voteAverage: details.vote_average };
}

export async function enrichRelatedWithPosters(
  movies: TraktRelatedMovie[],
  lookup: PosterLookup = defaultLookup,
  concurrency: number = POSTER_LOOKUP_CONCURRENCY,
): Promise<EnrichedRelatedMovie[]> {
  const results: EnrichedRelatedMovie[] = movies.map((m) => ({
    ...m,
    posterPath: null,
    voteAverage: null,
  }));
  let next = 0;
  async function worker(): Promise<void> {
    while (next < movies.length) {
      const index = next++;
      const tmdbId = movies[index].ids.tmdb;
      if (typeof tmdbId !== "number") continue;
      try {
        const { posterPath, voteAverage } = await lookup(tmdbId);
        results[index].posterPath = posterPath ?? null;
        results[index].voteAverage = voteAverage ?? null;
      } catch {
        // graceful fallback: item stays without poster
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(concurrency, movies.length)) }, worker),
  );
  return results;
}
