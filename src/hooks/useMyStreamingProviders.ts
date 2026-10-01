import { useQuery } from "@tanstack/react-query";

import { loadStreamingRows, rowsToProvidersMap } from "@/lib/streamingAvailability";
import type { TmdbMovieProviders } from "@/lib/tmdbProxy";

/**
 * Providers (DE) for the given movies, from the shared 24h cache
 * (`streaming_availability_cache`, ADR 0005), refreshed through ONE
 * `providers_batch` call for missing/stale ids. Only runs when `enabled`
 * (i.e. while the "Meine Streaming-Dienste" sort is selected), so the
 * non-date-less movies are not looked up unless that sort is used.
 */
export function useMyStreamingProviders(tmdbIds: number[], enabled: boolean) {
  const sortedIds = [...new Set(tmdbIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["streamingProviders", sortedIds],
    queryFn: async (): Promise<Map<number, TmdbMovieProviders>> => {
      const { data, error } = await loadStreamingRows(sortedIds, sortedIds);
      if (error) {
        throw error;
      }
      return rowsToProvidersMap(data ?? []);
    },
    enabled: enabled && sortedIds.length > 0,
  });
}
