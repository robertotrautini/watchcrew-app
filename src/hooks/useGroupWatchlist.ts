import { useQuery } from "@tanstack/react-query";

import { loadStreamingRows } from "@/lib/streamingAvailability";
import { getGroupWatchlistEntries } from "@/lib/watchlist";
import { buildStreamingAvailabilityLookup, getEffectiveReleaseDate } from "@/lib/watchlistLogic";
import type { StreamingAvailabilityLookup, WatchlistEntry } from "@/lib/watchlistTypes";

export interface GroupWatchlistData {
  /** The group's full watchlist_entries set (joined with movie/genres/ratings) — NOT pre-split into Watchlist/Diary; see `splitWatchlistAndDiary`. */
  entries: WatchlistEntry[];
  /** tmdb_id -> "available on streaming per cache", for the 'upcoming' ("Kommt noch") predicate. */
  streamingAvailability: StreamingAvailabilityLookup;
}

/**
 * Shape actually stored in the (JSON-persisted) query cache: the availability
 * lookup is a plain array of tmdb ids (a `Map` would be restored as `{}`);
 * `select` rebuilds the Map for consumers.
 */
interface CachedGroupWatchlistData {
  entries: WatchlistEntry[];
  streamingAvailableIds: number[];
}

function toGroupWatchlistData(cached: CachedGroupWatchlistData): GroupWatchlistData {
  const ids = Array.isArray(cached?.streamingAvailableIds) ? cached.streamingAvailableIds : [];
  return {
    entries: Array.isArray(cached?.entries) ? cached.entries : [],
    streamingAvailability: new Map(ids.map((id) => [id, true] as [number, boolean])),
  };
}

/**
 * Wraps `getGroupWatchlistEntries` (src/lib/watchlist.ts) + the cache-backed
 * `loadStreamingRows` (src/lib/streamingAvailability.ts) in a single TanStack Query.
 *
 * Both underlying calls never throw — they always resolve Supabase's raw
 * `{ data, error }` tuple, even on failure. This hook translates that into
 * React Query's native error channel (throwing on `error`) so consumers can
 * rely on the usual `isLoading`/`data`/`error`/`isError` states, matching
 * the convention in src/hooks/useUserGroups.ts.
 */
export function useGroupWatchlist(groupId: string | undefined) {
  return useQuery({
    queryKey: ["watchlist", groupId],
    queryFn: async (): Promise<CachedGroupWatchlistData> => {
      const { data: entries, error: entriesError } = await getGroupWatchlistEntries(
        groupId as string
      );
      if (entriesError) {
        throw entriesError;
      }

      const safeEntries = (entries ?? []) as unknown as WatchlistEntry[];

      const tmdbIds = Array.from(
        new Set(
          safeEntries
            .map((entry) => entry.movie?.tmdb_id)
            .filter((id): id is number => typeof id === "number")
        )
      );

      // ADR 0005: only date-less movies need a (cached, 24h) availability
      // lookup for "Kommt noch"/"Streaming verfügbar"; all ids are READ so
      // already-cached rows are used anyway. At most 2 round trips.
      const datelessTmdbIds = Array.from(
        new Set(
          safeEntries
            .filter((entry) => (entry.movie ? getEffectiveReleaseDate(entry) : null) == null)
            .map((entry) => entry.movie?.tmdb_id)
            .filter((id): id is number => typeof id === "number")
        )
      );

      const { data: availabilityRows, error: availabilityError } = await loadStreamingRows(
        tmdbIds,
        datelessTmdbIds
      );
      if (availabilityError) {
        throw availabilityError;
      }

      return {
        entries: safeEntries,
        streamingAvailableIds: [...buildStreamingAvailabilityLookup(availabilityRows ?? []).keys()],
      };
    },
    select: toGroupWatchlistData,
    enabled: !!groupId,
  });
}
