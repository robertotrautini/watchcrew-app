import { useState } from "react";

import {
  type SortState,
} from "@/lib/entrySorting";
import {
  DEFAULT_LIST_FILTERS,
  defaultSortFor,
  listFiltersKey,
  removeFilterKey,
  resolveSort,
  type DiaryScope,
  type EntryFilters,
  type FilterKey,
  type ListFiltersTab,
} from "@/lib/listFilters";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Shared sort / filter / search state of the Tagebuch ("diary") and Watchlist
 * tabs. Two independent persisted parts per tab, global across groups (MMKV, see
 * usePreferencesStore `listFilters`): `sort` ({field, direction}) and `filters`
 * (all combinable). The Tagebuch `scope` is one GLOBAL setting (store
 * `diaryScope`), kept across group switches. The search text is session-local.
 */
export function useEntryFilters(tab: ListFiltersTab) {
  const stored = usePreferencesStore((s) => s.listFilters[listFiltersKey(tab)]);
  const setListFilters = usePreferencesStore((s) => s.setListFilters);
  // Global (not per group): stays when the active group changes.
  const scope = usePreferencesStore((s) => s.diaryScope);
  const setDiaryScope = usePreferencesStore((s) => s.setDiaryScope);
  const filterPanelOpen = usePreferencesStore((s) => s.filterPanelOpen[tab]);
  const setFilterPanelOpen = usePreferencesStore((s) => s.setFilterPanelOpen);
  const myProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );

  const list = stored ?? DEFAULT_LIST_FILTERS;
  const sort = resolveSort(stored, tab);
  const defaultSort = defaultSortFor(tab);

  const [searchQuery, setSearchQuery] = useState("");
  const [flyoutVisible, setFlyoutVisible] = useState(false);

  function persist(patch: Partial<typeof DEFAULT_LIST_FILTERS>) {
    setListFilters(tab, patch);
  }

  return {
    stored,
    sort,
    defaultSort,
    filters: list.filters,
    scope,
    myProviderIds,
    filterPanelOpen,
    toggleFilterPanel: () => setFilterPanelOpen(tab, !filterPanelOpen),
    searchQuery,
    setSearchQuery,
    /** Visibility of the "+ Filter" flyout (session-local, rendered at screen root). */
    flyoutVisible,
    setFlyoutVisible,
    setSort: (next: SortState) => persist({ sort: next }),
    setFilters: (next: EntryFilters) => persist({ filters: next }),
    removeFilter: (key: FilterKey) =>
      persist({ filters: removeFilterKey(list.filters, key) }),
    setScope: (next: DiaryScope) => setDiaryScope(next),
  };
}
