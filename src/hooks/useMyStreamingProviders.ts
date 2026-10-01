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
type ProviderEntries = Array<[number, TmdbMovieProviders]>;

/**
 * The query cache is persisted as JSON (src/lib/queryPersistence.ts), which
 * turns a `Map` into `{}` on restore. The cache therefore holds plain
 * `[tmdbId, providers]` entries and the Map is built here; anything that is
 * not an array (an old, already-persisted bad shape) yields an empty Map.
 */
function entriesToMap(entries: unknown): Map<number, TmdbMovieProviders> {
  return new Map(Array.isArray(entries) ? (entries as ProviderEntries) : []);
}

export function useMyStreamingProviders(tmdbIds: number[], enabled: boolean) {
  const sortedIds = [...new Set(tmdbIds)].sort((a, b) => a - b);
  return useQuery({
    queryKey: ["streamingProviders", sortedIds],
    queryFn: async (): Promise<ProviderEntries> => {
      const { data, error } = await loadStreamingRows(sortedIds, sortedIds);
      if (error) {
        throw error;
      }
      return [...rowsToProvidersMap(data ?? [])];
    },
    select: entriesToMap,
    enabled: enabled && sortedIds.length > 0,
  });
}
