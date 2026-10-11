import { useMemo } from "react";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import {
  useEntryScreen,
  type EntryScreenStrategy,
  type EntrySourceContext,
} from "@/hooks/useEntryScreen";
import { useMyDiary } from "@/hooks/useMyDiary";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { deriveGroupMemberIds } from "@/lib/diaryDisplay";
import { filterDiary, selectDiaryScope } from "@/lib/entryFiltering";
import { deriveSeenYears, getDistinctGenreIds } from "@/lib/entryFilters";
import {
  navigateToMovieDetail,
  navigateToMovieDetailWithoutGroup,
} from "@/lib/movieDetailNavigation";
import { DEFAULT_ENTRY_FILTERS } from "@/lib/listFilters";

/**
 * Tagebuch strategy for `useEntryScreen`. Scope (Mein Tagebuch / Gruppe) picks
 * the data source: "Mein Tagebuch" (Phase 5, ADR 0014) = all my rated/seen
 * movies across ALL groups (+ movies in no group), independent of the active
 * group's entries; "Gruppe" = the active group's rated entries. Member roster:
 * real members unioned with rating authors (`deriveGroupMemberIds`).
 */
function useDiarySource({
  userId,
  activeGroupId,
  scope,
  rawEntries,
  groupsQuery,
  watchlistQuery,
  groupMembersQuery,
}: EntrySourceContext) {
  const myDiaryQuery = useMyDiary(userId);
  const isMyDiaryScope = scope === "my_diary";
  const myDiaryEntries = useMemo(
    () => myDiaryQuery.data ?? [],
    [myDiaryQuery.data],
  );

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
  const extra = useMemo(() => ({ groupMemberIds }), [groupMemberIds]);

  const entries = useMemo(() => {
    if (!userId) return [];
    return isMyDiaryScope
      ? myDiaryEntries
      : selectDiaryScope(rawEntries, "group", userId);
  }, [isMyDiaryScope, myDiaryEntries, rawEntries, userId]);

  return {
    entries,
    extra,
    isLoading:
      !userId ||
      groupsQuery.isLoading ||
      (isMyDiaryScope && myDiaryQuery.isLoading) ||
      (!!activeGroupId &&
        (watchlistQuery.isLoading || groupMembersQuery.isLoading)),
    isError:
      groupsQuery.isError ||
      watchlistQuery.isError ||
      groupMembersQuery.isError ||
      (isMyDiaryScope && myDiaryQuery.isError),
  };
}

const DIARY_STRATEGY: EntryScreenStrategy<{ groupMemberIds: string[] }> = {
  tab: "diary",
  useSource: useDiarySource,
  // "Alle bewertet" / "Fehlt noch" only make sense for the group view; a
  // stored choice stays saved but is neither applied nor shown in "Mein Tagebuch".
  activeFilters: (filters, scope) =>
    scope === "my_diary"
      ? {
          ...filters,
          allRated: DEFAULT_ENTRY_FILTERS.allRated,
          missing: DEFAULT_ENTRY_FILTERS.missing,
        }
      : filters,
  filter: (entries, filters, ctx) =>
    filterDiary(entries, filters, {
      userId: ctx.userId,
      groupMemberIds: ctx.extra.groupMemberIds,
      providersByTmdbId: ctx.providersByTmdbId,
      myProviderIds: ctx.myProviderIds,
    }),
  deriveOptions: (entries, userId) => {
    const { years, hasNoDate } = deriveSeenYears(entries, userId);
    return { genreIds: getDistinctGenreIds(entries, true), years, hasNoDate };
  },
  openEntry: (entry, { router, activeGroupId, rawEntries, scope }) => {
    // "Mein Tagebuch" items are synthetic: open in the active group's context
    // when the movie lies there, else without any group context.
    const isMyDiaryScope = scope === "my_diary";
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
};

/**
 * View state of the Tagebuch (diary) tab: `useEntryScreen` with the diary
 * strategy plus diary-only extras (member ids, display names, star colour).
 * Pipeline: scope -> filters (all AND) -> fuzzy search -> sort; the rules live
 * in src/lib/entryFiltering.ts, entrySorting.ts and watchlistLogic.ts.
 * Display names come from the joined profiles, with `memberDisplayLabel`
 * falling back to a uuid-prefix placeholder. Star colour: `useGroupTheme()`.
 */
export function useTagebuchScreen() {
  const screen = useEntryScreen(DIARY_STRATEGY);
  const { userId, groupMembers } = screen;
  const ownProfileQuery = useOwnProfile(userId);
  const starColor = useGroupTheme().colors.starColor;

  const displayNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const member of groupMembers ?? []) {
      if (member.profiles?.display_name) {
        names.set(member.user_id, member.profiles.display_name);
      }
    }
    const ownName = ownProfileQuery.data?.display_name;
    if (userId && ownName && !names.has(userId)) {
      names.set(userId, ownName);
    }
    return names;
  }, [groupMembers, ownProfileQuery.data, userId]);

  const isDiaryEmpty = screen.baseEntries.length === 0;

  return {
    filters: screen.filters,
    /** Filters actually applied/shown (group-only flags cleared in "Mein Tagebuch"). */
    activeFilters: screen.activeFilters,
    isMyDiaryScope: screen.filters.scope === "my_diary",
    diaryViewMode: screen.viewMode,
    setDiaryViewMode: screen.setViewMode,
    showTitlesInGrid: screen.showTitlesInGrid,
    starColor,
    groupMemberIds: screen.extra.groupMemberIds,
    displayNameById,
    visibleEntries: screen.visibleEntries,
    availableGenreIds: screen.options.genreIds,
    genreNamesById: screen.genreNamesById,
    availableYears: screen.options.years,
    hasNoDateYear: screen.options.hasNoDate,
    isLoading: screen.isLoading,
    isError: screen.isError,
    isDiaryEmpty,
    hasNoResults: !isDiaryEmpty && screen.visibleEntries.length === 0,
    providersLoading: screen.providersLoading,
    userId,
    openEntry: screen.openEntry,
  };
}
