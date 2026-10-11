import type { ReactNode } from "react";

import { EntryFilterBar } from "@/components/entries/EntryFilterBar";
import { EntrySortRow } from "@/components/entries/EntrySortRow";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { TextField } from "@/components/ui/TextField";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import type { useEntryFilters } from "@/hooks/useEntryFilters";
import type { SortFieldItem } from "@/lib/entrySorting";
import {
  activeFilterKeys,
  type EntryFilters,
  type ListFiltersTab,
} from "@/lib/listFilters";

type EntryFiltersState = ReturnType<typeof useEntryFilters>;

/**
 * Shared filter panel of the Tagebuch and Watchlist tabs (search row, sort
 * row, filter chip bar with view mode toggle). `testIDPrefix` is "tagebuch" or
 * "watchlist" (Maestro relies on the derived testIDs: `<prefix>-filter`,
 * `<prefix>-search-input`, `<prefix>-view-mode-toggle`). `actions` is the
 * optional button next to the search field (Watchlist: add movie).
 */
export function EntryFilterPanel({
  tab,
  testIDPrefix,
  sortFields,
  filters: f,
  activeFilters,
  genreNamesById,
  viewMode,
  onViewModeChange,
  viewModeButtonTestID,
  actions,
}: {
  tab: ListFiltersTab;
  testIDPrefix: string;
  sortFields: SortFieldItem[];
  filters: Pick<
    EntryFiltersState,
    | "filterPanelOpen"
    | "toggleFilterPanel"
    | "searchQuery"
    | "setSearchQuery"
    | "sort"
    | "setSort"
    | "removeFilter"
    | "setFlyoutVisible"
  >;
  activeFilters: EntryFilters;
  genreNamesById: ReadonlyMap<string, string>;
  viewMode: "cards" | "grid" | "list";
  onViewModeChange: (mode: "cards" | "grid" | "list") => void;
  viewModeButtonTestID: (mode: "cards" | "grid" | "list") => string;
  actions?: ReactNode;
}) {
  const filterKeys = activeFilterKeys(activeFilters, tab);
  return (
    <CollapsibleFilterPanel
      testID={`${testIDPrefix}-filter`}
      open={f.filterPanelOpen}
      onToggle={f.toggleFilterPanel}
      hasActiveFilters={filterKeys.length > 0}
      search={
        <TextField
          search
          testID={`${testIDPrefix}-search-input`}
          value={f.searchQuery}
          onChangeText={f.setSearchQuery}
          placeholder="Film suchen…"
          className="flex-1"
        />
      }
      actions={actions}
    >
      <EntrySortRow
        testIDPrefix={testIDPrefix}
        fields={sortFields}
        sort={f.sort}
        onChange={f.setSort}
      />
      <EntryFilterBar
        testIDPrefix={testIDPrefix}
        keys={filterKeys}
        filters={activeFilters}
        genreNamesById={genreNamesById}
        onRemove={f.removeFilter}
        onAdd={() => f.setFlyoutVisible(true)}
        trailing={
          <ViewModeToggle
            testID={`${testIDPrefix}-view-mode-toggle`}
            value={viewMode}
            onChange={onViewModeChange}
            buttonTestID={viewModeButtonTestID}
          />
        }
      />
    </CollapsibleFilterPanel>
  );
}
