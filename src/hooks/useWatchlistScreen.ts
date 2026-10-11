import { useMemo } from "react";

import {
  useEntryScreen,
  type EntryScreenStrategy,
  type EntrySourceContext,
} from "@/hooks/useEntryScreen";
import { filterWatchlist } from "@/lib/entryFiltering";
import { deriveReleaseYears, getDistinctGenreIds } from "@/lib/entryFilters";
import { navigateToMovieDetail } from "@/lib/movieDetailNavigation";
import { splitWatchlistAndDiary } from "@/lib/watchlistLogic";
import type { StreamingAvailabilityLookup } from "@/lib/watchlistTypes";

/** Watchlist source: the group's not-yet-rated-by-me entries + streaming availability. */
function useWatchlistSource({
  userId,
  watchlistQuery,
  groupsQuery,
  groupMembersQuery,
}: EntrySourceContext) {
  const entries = useMemo(() => {
    if (!watchlistQuery.data || !userId) {
      return [];
    }
    return splitWatchlistAndDiary(watchlistQuery.data.entries, userId)
      .watchlist;
  }, [watchlistQuery.data, userId]);

  const extra: StreamingAvailabilityLookup = useMemo(
    () => watchlistQuery.data?.streamingAvailability ?? new Map(),
    [watchlistQuery.data?.streamingAvailability],
  );

  return {
    entries,
    extra,
    isLoading:
      groupsQuery.isLoading ||
      groupMembersQuery.isLoading ||
      watchlistQuery.isLoading,
    isError:
      groupsQuery.isError || groupMembersQuery.isError || watchlistQuery.isError,
  };
}

const WATCHLIST_STRATEGY: EntryScreenStrategy<StreamingAvailabilityLookup> = {
  tab: "watchlist",
  useSource: useWatchlistSource,
  filter: (entries, filters, ctx) =>
    filterWatchlist(entries, filters, {
      userId: ctx.userId,
      streamingAvailability: ctx.extra,
      providersByTmdbId: ctx.providersByTmdbId,
      myProviderIds: ctx.myProviderIds,
    }),
  deriveOptions: (entries) => ({
    genreIds: getDistinctGenreIds(entries),
    years: deriveReleaseYears(entries),
    hasNoDate: false,
  }),
  openEntry: (entry, { router, activeGroupId }) => {
    if (!activeGroupId) {
      return;
    }
    navigateToMovieDetail(router, {
      tmdbId: entry.movie.tmdb_id,
      groupId: activeGroupId,
      source: "watchlist",
      watchlistEntryId: entry.id,
    });
  },
};

/**
 * View state of the Watchlist tab: `useEntryScreen` with the watchlist
 * strategy. The screen and its section components in
 * src/components/watchlist/ only render what this returns.
 */
export function useWatchlistScreen() {
  const screen = useEntryScreen(WATCHLIST_STRATEGY);

  return {
    filters: screen.filters,
    watchlistViewMode: screen.viewMode,
    setWatchlistViewMode: screen.setViewMode,
    showTitlesInGrid: screen.showTitlesInGrid,
    isLoading: screen.isLoading,
    isError: screen.isError,
    totalMembers: screen.groupMembers?.length ?? 0,
    baseWatchlistEntries: screen.baseEntries,
    streamingAvailability: screen.extra,
    genrePillIds: screen.options.genreIds,
    genreNamesById: screen.genreNamesById,
    yearPillValues: screen.options.years,
    providersLoading: screen.providersLoading,
    searchedEntries: screen.visibleEntries,
    openEntry: screen.openEntry,
  };
}
