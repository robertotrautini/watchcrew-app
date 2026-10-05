import { useState } from "react";

import {
  DEFAULT_LIST_FILTERS,
  listFiltersKey,
  type ListFiltersTab,
} from "@/lib/listFilters";
import { toggleGenreId } from "@/lib/entryFilters";
import type { YearFilterValue } from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Shared filter/sort/search state of the Tagebuch ("diary") and Watchlist
 * tabs. Sort/genre/year/provider-category choices persist per group (MMKV,
 * see usePreferencesStore `listFilters`); the search text and the sort sheet
 * visibility are session-local.
 */
export function useEntryFilters<TSort extends string>(
  tab: ListFiltersTab,
  activeGroupId: string | null | undefined,
  defaultSort: TSort,
) {
  const storedFilters = usePreferencesStore((s) =>
    activeGroupId ? s.listFilters[listFiltersKey(tab, activeGroupId)] : undefined,
  );
  const setListFilters = usePreferencesStore((s) => s.setListFilters);
  const filterPanelOpen = usePreferencesStore((s) => s.filterPanelOpen[tab]);
  const setFilterPanelOpen = usePreferencesStore((s) => s.setFilterPanelOpen);
  const myProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );

  const filters = storedFilters ?? DEFAULT_LIST_FILTERS;
  const sortOption = (filters.sortOption ?? defaultSort) as TSort;
  const selectedGenreIds = filters.genreIds;
  const selectedYear: YearFilterValue | undefined = filters.year ?? undefined;
  const providerCategories = filters.providerCategories;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortSheetVisible, setSortSheetVisible] = useState(false);

  function updateFilters(patch: Partial<typeof DEFAULT_LIST_FILTERS>) {
    if (activeGroupId) {
      setListFilters(tab, activeGroupId, patch);
    }
  }

  return {
    filters,
    sortOption,
    selectedGenreIds,
    selectedYear,
    providerCategories,
    myProviderIds,
    filterPanelOpen,
    toggleFilterPanel: () => setFilterPanelOpen(tab, !filterPanelOpen),
    searchQuery,
    setSearchQuery,
    sortSheetVisible,
    setSortSheetVisible,
    updateFilters,
    toggleGenre: (genreId: string) =>
      updateFilters({ genreIds: toggleGenreId(selectedGenreIds, genreId) }),
    selectSortOption: (option: TSort) => {
      updateFilters({ sortOption: option });
      setSortSheetVisible(false);
    },
  };
}
