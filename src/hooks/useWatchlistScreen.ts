import { useRouter } from "expo-router";
import { useMemo } from "react";

import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import { deriveGenreNamesById } from "@/lib/diaryDisplay";
import { deriveReleaseYears, getDistinctGenreIds } from "@/lib/entryFilters";
import { navigateToMovieDetail } from "@/lib/movieDetailNavigation";
import {
  searchEntries,
  sortWatchlist,
  splitWatchlistAndDiary,
} from "@/lib/watchlistLogic";
import type {
  StreamingAvailabilityLookup,
  WatchlistEntry,
  WatchlistSortOption,
} from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * View state of the Watchlist tab (data queries, filter/sort/search state,
 * derived entry lists). The screen and its section components in
 * src/components/watchlist/ only render what this returns.
 */
export function useWatchlistScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  // M9 part 2: real, persisted active-group resolution -- see
  // src/hooks/useActiveGroup.ts.
  const { activeGroupId, groupsQuery: userGroupsQuery } =
    useActiveGroup(currentUserId);

  // M10 (Realtime foreground sync, ADR 0006): silent cache refresh, or a
  // toast when this tab isn't on screen (src/hooks/useGroupRealtimeSync.ts);
  // the focused-screen registration lets that hook tell the two apart.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const groupMembersQuery = useGroupMembers(activeGroupId);
  const watchlistQuery = useGroupWatchlist(activeGroupId);

  const watchlistViewMode = usePreferencesStore((s) => s.watchlistViewMode);
  const setWatchlistViewMode = usePreferencesStore(
    (s) => s.setWatchlistViewMode,
  );
  // "Filmtitel in Grid anzeigen" toggle (settings/display.tsx); see
  // WatchlistPosterCard's `showTitle` prop doc comment.
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  const filters = useEntryFilters<WatchlistSortOption>(
    "watchlist",
    activeGroupId,
    "added",
  );
  const { sortOption } = filters;

  const isLoading =
    userGroupsQuery.isLoading ||
    groupMembersQuery.isLoading ||
    watchlistQuery.isLoading;
  const isError =
    userGroupsQuery.isError ||
    groupMembersQuery.isError ||
    watchlistQuery.isError;

  const totalMembers = groupMembersQuery.data?.length ?? 0;

  const baseWatchlistEntries = useMemo(() => {
    if (!watchlistQuery.data || !currentUserId) {
      return [];
    }
    return splitWatchlistAndDiary(watchlistQuery.data.entries, currentUserId)
      .watchlist;
  }, [watchlistQuery.data, currentUserId]);

  const streamingAvailability: StreamingAvailabilityLookup = useMemo(
    () => watchlistQuery.data?.streamingAvailability ?? new Map(),
    [watchlistQuery.data?.streamingAvailability],
  );

  // Genre/year pill option sets come from the current (pre-sort/filter)
  // watchlist entries.
  const genrePillIds = useMemo(
    () => getDistinctGenreIds(baseWatchlistEntries),
    [baseWatchlistEntries],
  );
  const genreNamesById = useMemo(
    () => deriveGenreNamesById(baseWatchlistEntries),
    [baseWatchlistEntries],
  );
  const yearPillValues = useMemo(
    () => deriveReleaseYears(baseWatchlistEntries),
    [baseWatchlistEntries],
  );

  // Providers are only loaded (cache-backed, one batch call) while the
  // "Meine Streaming-Dienste" sort is active.
  const providersQuery = useMyStreamingProviders(
    baseWatchlistEntries.map((entry) => entry.movie.tmdb_id),
    sortOption === "my_streaming",
  );
  const providersByTmdbId = providersQuery.data;

  const { selectedGenreIds, selectedYear, myProviderIds, providerCategories } =
    filters;
  const sortedEntries = useMemo(() => {
    return sortWatchlist(baseWatchlistEntries, sortOption, {
      streamingAvailability,
      genreIds: selectedGenreIds,
      year: selectedYear,
      providersByTmdbId,
      myProviderIds,
      providerCategories,
    });
  }, [
    baseWatchlistEntries,
    sortOption,
    streamingAvailability,
    selectedGenreIds,
    selectedYear,
    providersByTmdbId,
    myProviderIds,
    providerCategories,
  ]);

  const searchedEntries = useMemo(
    () => searchEntries(sortedEntries, filters.searchQuery),
    [sortedEntries, filters.searchQuery],
  );

  function openEntry(entry: WatchlistEntry) {
    if (!activeGroupId) {
      return;
    }
    navigateToMovieDetail(router, {
      tmdbId: entry.movie.tmdb_id,
      groupId: activeGroupId,
      source: "watchlist",
      watchlistEntryId: entry.id,
    });
  }

  return {
    filters,
    watchlistViewMode,
    setWatchlistViewMode,
    showTitlesInGrid,
    isLoading,
    isError,
    totalMembers,
    baseWatchlistEntries,
    streamingAvailability,
    genrePillIds,
    genreNamesById,
    yearPillValues,
    providersLoading: providersQuery.isLoading,
    searchedEntries,
    openEntry,
  };
}
