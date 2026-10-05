import { useQueries } from "@tanstack/react-query";

import { getMovieProviders, type TmdbMovieProviders } from "@/lib/tmdbProxy";
import { queryKeys } from "@/lib/queryKeys";

export interface MoviesProvidersResult {
  providersByTmdbId: Map<number, TmdbMovieProviders>;
  isLoading: boolean;
}

/**
 * Batch-fetches providers for a whole grid's worth of tmdbIds via
 * `useQueries` (one query per id), sharing its cache with `useMovieProviders`
 * (same key: `queryKeys.movieProviders(id)`).
 */
export function useMoviesProviders(tmdbIds: number[]): MoviesProvidersResult {
  const queries = useQueries({
    queries: tmdbIds.map((tmdbId) => ({
      queryKey: queryKeys.movieProviders(tmdbId),
      queryFn: async () => {
        const { data, error } = await getMovieProviders(tmdbId);
        if (error) {
          throw error;
        }
        return data;
      },
    })),
  });

  const providersByTmdbId = new Map<number, TmdbMovieProviders>();
  let isLoading = false;

  queries.forEach((query, index) => {
    if (query.isLoading) {
      isLoading = true;
    }
    if (query.data) {
      providersByTmdbId.set(tmdbIds[index], query.data as TmdbMovieProviders);
    }
  });

  return { providersByTmdbId, isLoading };
}
