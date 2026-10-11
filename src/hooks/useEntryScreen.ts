import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";

import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupRealtimeSync } from "@/hooks/useGroupRealtimeSync";
import { useGroupWatchlist } from "@/hooks/useGroupWatchlist";
import { useMyStreamingProviders } from "@/hooks/useMyStreamingProviders";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";
import { deriveGenreNamesById } from "@/lib/diaryDisplay";
import { sortEntries } from "@/lib/entrySorting";
import type { EntryFilters, DiaryScope, ListFiltersTab } from "@/lib/listFilters";
import { searchEntries } from "@/lib/watchlistLogic";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import {
  usePreferencesStore,
  type DiaryViewMode,
} from "@/stores/usePreferencesStore";

/** Queries and ids a tab's data source (`useSource`) builds its entries from. */
export interface EntrySourceContext {
  userId: string | undefined;
  activeGroupId: string | null | undefined;
  scope: DiaryScope;
  /** Entries of the active group's watchlist query (all rows, unsplit). */
  rawEntries: WatchlistEntry[];
  groupsQuery: ReturnType<typeof useActiveGroup>["groupsQuery"];
  watchlistQuery: ReturnType<typeof useGroupWatchlist>;
  groupMembersQuery: ReturnType<typeof useGroupMembers>;
}

/** What a tab's data source hands back to the generic pipeline. */
export interface EntrySource<TExtra> {
  /** Base entries of the tab, before filter/search/sort. */
  entries: WatchlistEntry[];
  isLoading: boolean;
  isError: boolean;
  /** Tab-specific filter input (e.g. member ids, streaming availability); must be memoized. */
  extra: TExtra;
}

export interface EntryFilterOptions {
  genreIds: string[];
  years: number[];
  hasNoDate: boolean;
}

/**
 * The differences between the Tagebuch and the Watchlist tab. A strategy is a
 * module-level constant (stable identity); `useSource` is a hook and is called
 * on every render in the same order.
 */
export interface EntryScreenStrategy<TExtra> {
  tab: ListFiltersTab;
  useSource: (ctx: EntrySourceContext) => EntrySource<TExtra>;
  /** Filters actually applied/shown (default: the stored filters). */
  activeFilters?: (filters: EntryFilters, scope: DiaryScope) => EntryFilters;
  filter: (
    entries: WatchlistEntry[],
    filters: EntryFilters,
    ctx: {
      userId: string;
      providersByTmdbId: ReturnType<typeof useMyStreamingProviders>["data"];
      myProviderIds: number[];
      extra: TExtra;
    },
  ) => WatchlistEntry[];
  deriveOptions: (
    entries: WatchlistEntry[],
    userId: string,
  ) => EntryFilterOptions;
  openEntry: (
    entry: WatchlistEntry,
    ctx: {
      router: ReturnType<typeof useRouter>;
      activeGroupId: string | null | undefined;
      rawEntries: WatchlistEntry[];
      scope: DiaryScope;
    },
  ) => void;
}

/**
 * Shared view state of the Tagebuch and Watchlist tabs: active group, realtime
 * sync, queries, view-mode preference, sort/filter/search state and the
 * pipeline base -> filters (all AND) -> fuzzy search -> sort. Tab differences
 * (data source, scope, filter function, option sets, navigation) come in as an
 * `EntryScreenStrategy`; `useTagebuchScreen` / `useWatchlistScreen` are thin
 * wrappers around this hook.
 */
export function useEntryScreen<TExtra>(strategy: EntryScreenStrategy<TExtra>) {
  const { tab } = strategy;
  const router = useRouter();
  const userId = useCurrentUserId();
  const { activeGroupId, groupsQuery } = useActiveGroup(userId);

  // M10 realtime sync + focused-screen registration (silent cache refresh, or
  // a toast when this tab isn't on screen).
  useGroupRealtimeSync(activeGroupId);
  useRegisterFocusedGroupScreen(activeGroupId);

  const watchlistQuery = useGroupWatchlist(activeGroupId);
  const groupMembersQuery = useGroupMembers(activeGroupId);

  const viewMode = usePreferencesStore((s) =>
    tab === "diary" ? s.diaryViewMode : s.watchlistViewMode,
  ) as DiaryViewMode;
  const setViewMode = usePreferencesStore((s) =>
    tab === "diary" ? s.setDiaryViewMode : s.setWatchlistViewMode,
  );
  // "Filmtitel in Grid anzeigen" adds a title below the poster in grid mode.
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);

  const filters = useEntryFilters(tab);
  const { sort, scope } = filters;

  const rawEntries = useMemo(
    () => watchlistQuery.data?.entries ?? [],
    [watchlistQuery.data],
  );

  const source = strategy.useSource({
    userId,
    activeGroupId,
    scope,
    rawEntries,
    groupsQuery,
    watchlistQuery,
    groupMembersQuery,
  });
  const baseEntries = source.entries;

  const activeFilters = useMemo<EntryFilters>(
    () =>
      strategy.activeFilters
        ? strategy.activeFilters(filters.filters, scope)
        : filters.filters,
    [strategy, filters.filters, scope],
  );

  // Providers are only loaded (cache-backed, one batch call) while the
  // streaming filter is active.
  const streamingFilterActive = filters.filters.myStreaming;
  const providersQuery = useMyStreamingProviders(
    baseEntries.map((entry) => entry.movie.tmdb_id),
    streamingFilterActive,
  );
  const providersByTmdbId = providersQuery.data;

  // One sort for cards, grid and list (panel sort row and table headers).
  const visibleEntries = useMemo(() => {
    const filtered = strategy.filter(baseEntries, activeFilters, {
      userId: userId ?? "",
      providersByTmdbId,
      myProviderIds: filters.myProviderIds,
      extra: source.extra,
    });
    return sortEntries(searchEntries(filtered, filters.searchQuery), sort, {
      userId: userId ?? "",
    });
  }, [
    strategy,
    baseEntries,
    activeFilters,
    userId,
    providersByTmdbId,
    filters.myProviderIds,
    filters.searchQuery,
    source.extra,
    sort,
  ]);

  const options = useMemo(
    () => strategy.deriveOptions(baseEntries, userId ?? ""),
    [strategy, baseEntries, userId],
  );
  const genreNamesById = useMemo(
    () => deriveGenreNamesById(baseEntries),
    [baseEntries],
  );

  const openEntry = useCallback(
    (entry: WatchlistEntry) =>
      strategy.openEntry(entry, { router, activeGroupId, rawEntries, scope }),
    [strategy, router, activeGroupId, rawEntries, scope],
  );

  return {
    filters,
    /** Filters actually applied/shown. */
    activeFilters,
    viewMode,
    setViewMode,
    showTitlesInGrid,
    userId,
    extra: source.extra,
    groupMembers: groupMembersQuery.data,
    baseEntries,
    visibleEntries,
    options,
    genreNamesById,
    isLoading: source.isLoading,
    isError: source.isError,
    providersLoading: streamingFilterActive && providersQuery.isLoading,
    openEntry,
  };
}
