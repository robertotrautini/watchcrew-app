import { useRouter } from "expo-router";
import { useMemo } from "react";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import {
  deriveGenreNamesById,
  deriveGroupMemberIds,
} from "@/lib/diaryDisplay";
import { deriveSeenYears, getDistinctGenreIds } from "@/lib/entryFilters";
import { navigateToMovieDetail } from "@/lib/movieDetailNavigation";
import {
  searchEntries,
  sortDiary,
  splitWatchlistAndDiary,
} from "@/lib/watchlistLogic";
import type { DiarySortOption, WatchlistEntry } from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * View state of the Tagebuch (diary) tab: data queries, filter/sort/search
 * state and the derived entry lists. Business rules (split/sort/filter) live
 * in src/lib/watchlistLogic.ts and are consumed here, never reimplemented.
 *
 * Member roster: real members (`useGroupMembers`) unioned with rating authors
 * (`deriveGroupMemberIds`); display names come from the joined profiles, with
 * `memberDisplayLabel` falling back to a uuid-prefix placeholder. Genre names
 * come from `deriveGenreNamesById`. Active group: `useActiveGroup`; star
 * colour: `useGroupTheme()` (active group's theme).
 */
export function useTagebuchScreen() {
  const router = useRouter();
  const userId = useCurrentUserId();
  const { activeGroupId, groupsQuery } = useActiveGroup(userId);

  // M10 realtime sync + focused-screen registration, same as the Watchlist.
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const watchlistQuery = useGroupWatchlist(activeGroupId);
  const groupMembersQuery = useGroupMembers(activeGroupId);

  const diaryViewMode = usePreferencesStore((s) => s.diaryViewMode);
  const setDiaryViewMode = usePreferencesStore((s) => s.setDiaryViewMode);
  // M10: "Filmtitel in Grid anzeigen" adds a title below the poster tile in
  // grid mode (docs/interim-decisions.md "M10 — Settings hub").
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  const filters = useEntryFilters<DiarySortOption>(
    "diary",
    activeGroupId,
    "my_diary",
  );
  const {
    sortOption,
    selectedGenreIds,
    selectedYear,
    myProviderIds,
    providerCategories,
  } = filters;

  const starColor = useGroupTheme().colors.starColor;

  const rawEntries = useMemo(
    () => watchlistQuery.data?.entries ?? [],
    [watchlistQuery.data],
  );

  const groupMemberIds = useMemo(
    () =>
      deriveGroupMemberIds(
        rawEntries,
        (groupMembersQuery.data ?? []).map((m) => m.user_id),
      ),
    [rawEntries, groupMembersQuery.data],
  );

  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of groupMembersQuery.data ?? []) {
      if (member.profiles?.display_name) {
        names.set(member.user_id, member.profiles.display_name);
      }
    }
    return names;
  }, [groupMembersQuery.data]);

  const diaryEntries = useMemo(() => {
    if (!userId) return [];
    return splitWatchlistAndDiary(rawEntries, userId).diary;
  }, [rawEntries, userId]);

  // Providers are only loaded (cache-backed, one batch call) while the
  // "Meine Streaming-Dienste" sort is active.
  const providersQuery = useMyStreamingProviders(
    diaryEntries.map((entry) => entry.movie.tmdb_id),
    sortOption === "my_streaming",
  );
  const providersByTmdbId = providersQuery.data;

  const sortedEntries = useMemo(() => {
    if (!userId) return [];
    return sortDiary(diaryEntries, sortOption, userId, {
      groupMemberIds,
      genreIds: selectedGenreIds,
      year: selectedYear,
      providersByTmdbId,
      myProviderIds,
      providerCategories,
    });
  }, [
    diaryEntries,
    sortOption,
    userId,
    groupMemberIds,
    selectedGenreIds,
    selectedYear,
    providersByTmdbId,
    myProviderIds,
    providerCategories,
  ]);

  const visibleEntries = useMemo(
    () => searchEntries(sortedEntries, filters.searchQuery),
    [sortedEntries, filters.searchQuery],
  );

  const availableGenreIds = useMemo(
    () => getDistinctGenreIds(diaryEntries, true),
    [diaryEntries],
  );
  const genreNamesById = useMemo(
    () => deriveGenreNamesById(diaryEntries),
    [diaryEntries],
  );
  const { years: availableYears, hasNoDate: hasNoDateYear } = useMemo(
    () => deriveSeenYears(diaryEntries, userId ?? ""),
    [diaryEntries, userId],
  );

  const isLoading =
    !userId ||
    groupsQuery.isLoading ||
    (!!activeGroupId &&
      (watchlistQuery.isLoading || groupMembersQuery.isLoading));
  const isError =
    groupsQuery.isError || watchlistQuery.isError || groupMembersQuery.isError;
  const isDiaryEmpty = diaryEntries.length === 0;
  const hasNoResults = !isDiaryEmpty && visibleEntries.length === 0;

  function ownRating(entry: WatchlistEntry) {
    return entry.ratings.find((r) => r.member_id === userId);
  }

  function openEntry(entry: WatchlistEntry) {
    if (!activeGroupId) {
      return;
    }
    navigateToMovieDetail(router, {
      tmdbId: entry.movie.tmdb_id,
      groupId: activeGroupId,
      source: "diary",
      watchlistEntryId: entry.id,
    });
  }

  return {
    filters,
    diaryViewMode,
    setDiaryViewMode,
    showTitlesInGrid,
    starColor,
    groupMemberIds,
    displayNameById,
    visibleEntries,
    availableGenreIds,
    genreNamesById,
    availableYears,
    hasNoDateYear,
    isLoading,
    isError,
    isDiaryEmpty,
    hasNoResults,
    ownRating,
    openEntry,
  };
}
