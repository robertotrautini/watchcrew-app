import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getGermanReleaseDate,
  getMovieCredits,
  getMovieDetails,
  getMovieProviders,
  getMovieTrailer,
} from "@/lib/movieDetail";
import type {
  GermanReleaseDate,
  NormalizedCredits,
  NormalizedMovieDetails,
  TmdbMovieProviders,
  TmdbVideo,
} from "@/lib/movieDetailTypes";
import { queryKeys } from "@/lib/queryKeys";

// Re-exported so consumers (the M6 part 2a screen-UI layer) can pull both
// the hook and its data types from this one module, same as
// src/hooks/useGroupWatchlist.ts exports `GroupWatchlistData` alongside the
// hook itself.
export type {
  GermanReleaseDate,
  NormalizedCredits,
  NormalizedMovieDetails,
  TmdbMovieProviders,
  TmdbVideo,
};

export interface MovieDetailData {
  details: NormalizedMovieDetails | null;
  trailer: TmdbVideo | null;
  credits: NormalizedCredits | null;
  germanReleaseDate: GermanReleaseDate | null;
  providers: TmdbMovieProviders | null;
}

/**
 * Wraps five independent `tmdb-proxy` Edge Function calls (src/lib/movieDetail.ts)
 * in a single TanStack Query, for the Movie-Detail-Overlay's live/richer
 * detail data (runtime, genres, trailer, credits, DE release-date priority,
 * DE streaming providers) — as opposed to the cached `movies` row's data
 * (src/lib/watchlistTypes.ts `Movie`), which may still be missing these
 * fields per feature-inventory.md's "lazy-loaded via the `details` action if
 * missing" note.
 *
 * Unlike useGroupWatchlist's two sequential calls (the second depends on the
 * first's result), the five calls here are mutually independent, so they
 * fire in parallel via `Promise.all`. None of the five underlying
 * src/lib/movieDetail.ts functions ever throws — they always resolve
 * Supabase's raw `{ data, error }` tuple (mirroring src/lib/watchlist.ts).
 * This hook translates that into React Query's native error channel
 * (throwing on the first `error` found, in a fixed
 * details -> trailer -> credits -> germanReleaseDate -> providers order)
 * rather than aggregating all five into one combined error — a reversible
 * implementation detail, see docs/interim-decisions.md.
 */
export function useMovieDetail(tmdbId: number | undefined): UseQueryResult<MovieDetailData> {
  return useQuery({
    queryKey: queryKeys.movieDetail(tmdbId),
    queryFn: async (): Promise<MovieDetailData> => {
      const id = tmdbId as number;

      const [detailsResult, trailerResult, creditsResult, releaseDateResult, providersResult] =
        await Promise.all([
          getMovieDetails(id),
          getMovieTrailer(id),
          getMovieCredits(id),
          getGermanReleaseDate(id),
          getMovieProviders(id),
        ]);

      if (detailsResult.error) {
        throw detailsResult.error;
      }
      if (trailerResult.error) {
        throw trailerResult.error;
      }
      if (creditsResult.error) {
        throw creditsResult.error;
      }
      if (releaseDateResult.error) {
        throw releaseDateResult.error;
      }
      if (providersResult.error) {
        throw providersResult.error;
      }

      return {
        details: detailsResult.data,
        trailer: trailerResult.data,
        credits: creditsResult.data,
        germanReleaseDate: releaseDateResult.data,
        providers: providersResult.data,
      };
    },
    enabled: !!tmdbId,
  });
}
