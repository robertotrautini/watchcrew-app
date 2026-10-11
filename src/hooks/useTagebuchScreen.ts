import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyDiary } from "@/hooks/useMyDiary";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import {
  deriveGenreNamesById,
  deriveGroupMemberIds,
} from "@/lib/diaryDisplay";
import { filterDiary, selectDiaryScope } from "@/lib/entryFiltering";
import { deriveSeenYears, getDistinctGenreIds } from "@/lib/entryFilters";
import { sortEntries } from "@/lib/entrySorting";
import {
  navigateToMovieDetail,
  navigateToMovieDetailWithoutGroup,
} from "@/lib/movieDetailNavigation";
import { searchEntries } from "@/lib/watchlistLogic";
import { DEFAULT_ENTRY_FILTERS, type EntryFilters } from "@/lib/listFilters";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * View state of the Tagebuch (diary) tab: data queries, scope/filter/sort/
 * search state and the derived entry lists. Pipeline: scope (Mein Tagebuch /
 * Gruppe) -> filters (all AND) -> fuzzy search -> sort. The rules live in
 * src/lib/entryFiltering.ts, entrySorting.ts and watchlistLogic.ts and are
 * consumed here, never reimplemented.
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
  // Phase 5 (ADR 0014): "Mein Tagebuch" = all my rated/seen movies across ALL
  // groups (+ movies in no group), independent of the active group's entries.
  const myDiaryQuery = useMyDiary(userId);
  const ownProfileQuery = useOwnProfile(userId);

  const diaryViewMode = usePreferencesStore((s) => s.diaryViewMode);
  const setDiaryViewMode = usePreferencesStore((s) => s.setDiaryViewMode);
  // M10: "Filmtitel in Grid anzeigen" adds a title below the poster tile in
  // grid mode (docs/interim-decisions.md "M10 — Settings hub").
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  const filters = useEntryFilters("diary");
  const { sort, scope } = filters;

  const starColor = useGroupTheme().colors.starColor;

  const rawEntries = useMemo(
    () => watchlistQuery.data?.entries ?? [],
    [watchlistQuery.data],
  );

  const myDiaryEntries = useMemo(
    () => myDiaryQuery.data ?? [],
    [myDiaryQuery.data],
  );
  const isMyDiaryScope = scope === "my_diary";

  const groupMemberIds = useMemo(
    () =>
      isMyDiaryScope && userId
        ? [userId]
        : deriveGroupMemberIds(
            rawEntries,
            (groupMembersQuery.data ?? []).map((m) => m.user_id),
          ),
    [isMyDiaryScope, userId, rawEntries, groupMembersQuery.data],
  );

  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of groupMembersQuery.data ?? []) {
      if (member.profiles?.display_name) {
        names.set(member.user_id, member.profiles.display_name);
      }
    }
    const ownName = ownProfileQuery.data?.display_name;
    if (userId && ownName && !names.has(userId)) {
      names.set(userId, ownName);
    }
    return names;
  }, [groupMembersQuery.data, ownProfileQuery.data, userId]);

  const diaryEntries = useMemo(() => {
    if (!userId) return [];
    return isMyDiaryScope
      ? myDiaryEntries
      : selectDiaryScope(rawEntries, "group", userId);
  }, [isMyDiaryScope, myDiaryEntries, rawEntries, userId]);

  // "Alle bewertet" / "Fehlt noch" only make sense for the group view; a
  // stored choice stays saved but is neither applied nor shown in "Mein Tagebuch".
  const activeFilters = useMemo<EntryFilters>(
    () =>
      isMyDiaryScope
        ? {
            ...filters.filters,
            allRated: DEFAULT_ENTRY_FILTERS.allRated,
            missing: DEFAULT_ENTRY_FILTERS.missing,
          }
        : filters.filters,
    [isMyDiaryScope, filters.filters],
  );

  // Providers are only loaded (cache-backed, one batch call) while the
  // streaming filter is active.
  const streamingFilterActive = filters.filters.myStreaming;
  const providersQuery = useMyStreamingProviders(
    diaryEntries.map((entry) => entry.movie.tmdb_id),
    streamingFilterActive,
  );
  const providersByTmdbId = providersQuery.data;

  const filteredEntries = useMemo(() => {
    if (!userId) return [];
    return filterDiary(diaryEntries, activeFilters, {
      userId,
      groupMemberIds,
      providersByTmdbId,
      myProviderIds: filters.myProviderIds,
    });
  }, [
    diaryEntries,
    activeFilters,
    userId,
    groupMemberIds,
    providersByTmdbId,
    filters.myProviderIds,
  ]);

  const searchedEntries = useMemo(
    () => searchEntries(filteredEntries, filters.searchQuery),
    [filteredEntries, filters.searchQuery],
  );

  // One sort for cards, grid and list (panel sort row and table headers).
  const visibleEntries = useMemo(
    () => (userId ? sortEntries(searchedEntries, sort, { userId }) : []),
    [searchedEntries, sort, userId],
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
    (isMyDiaryScope && myDiaryQuery.isLoading) ||
    (!!activeGroupId &&
      (watchlistQuery.isLoading || groupMembersQuery.isLoading));
  const isError =
    groupsQuery.isError ||
    watchlistQuery.isError ||
    groupMembersQuery.isError ||
    (isMyDiaryScope && myDiaryQuery.isError);
  const isDiaryEmpty = diaryEntries.length === 0;
  const hasNoResults = !isDiaryEmpty && visibleEntries.length === 0;

  const openEntry = useCallback(
    (entry: WatchlistEntry) => {
      // "Mein Tagebuch" items are synthetic: open in the active group's
      // context when the movie lies there, else without any group context.
      const groupEntry = isMyDiaryScope
        ? rawEntries.find((e) => e.movie_id === entry.movie_id)
        : entry;
      if (!activeGroupId || !groupEntry) {
        if (isMyDiaryScope) {
          navigateToMovieDetailWithoutGroup(
            router,
            entry.movie.tmdb_id,
            entry.movie,
          );
        }
        return;
      }
      navigateToMovieDetail(router, {
        tmdbId: entry.movie.tmdb_id,
        groupId: activeGroupId,
        source: "diary",
        watchlistEntryId: groupEntry.id,
      });
    },
    [activeGroupId, isMyDiaryScope, rawEntries, router],
  );

  return {
    filters,
    /** Filters actually applied/shown (group-only flags cleared in "Mein Tagebuch"). */
    activeFilters,
    isMyDiaryScope,
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
    providersLoading: streamingFilterActive && providersQuery.isLoading,
    userId,
    openEntry,
  };
}
