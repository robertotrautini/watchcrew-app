import { IconButton } from "@/components/ui/IconButton";
import { TextInput } from "@/components/ui/Text";

import { EntryFilterBar } from "@/components/entries/EntryFilterBar";
import { EntrySortRow } from "@/components/entries/EntrySortRow";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { WATCHLIST_SORT_FIELDS } from "@/lib/entrySorting";
import { activeFilterKeys, hasActiveListFilters } from "@/lib/listFilters";
import type { useWatchlistScreen } from "@/hooks/useWatchlistScreen";

type Screen = ReturnType<typeof useWatchlistScreen>;

export function WatchlistFilterPanel({
  screen,
  onAddMovie,
}: {
  screen: Screen;
  onAddMovie: () => void;
}) {
  const f = screen.filters;
  return (
    <CollapsibleFilterPanel
      testID="watchlist-filter"
      open={f.filterPanelOpen}
      onToggle={f.toggleFilterPanel}
      hasActiveFilters={hasActiveListFilters(f.stored, "watchlist")}
      search={
        <TextInput
          testID="watchlist-search-input"
          className={GLASS_SEARCH_INPUT_CLASSNAME}
          placeholder="Film suchen…"
          placeholderTextColor="#8b8b8b"
          value={f.searchQuery}
          onChangeText={f.setSearchQuery}
        />
      }
      actions={
        <IconButton
          testID="watchlist-add-movie-button"
          icon="add"
          variant="accent"
          accessibilityLabel="Film hinzufügen"
          onPress={onAddMovie}
        />
      }
    >
      <EntrySortRow
        testIDPrefix="watchlist"
        fields={WATCHLIST_SORT_FIELDS}
        sort={f.sort}
        onChange={f.setSort}
      />
      <EntryFilterBar
        testIDPrefix="watchlist"
        keys={activeFilterKeys(f.filters, "watchlist")}
        filters={f.filters}
        genreNamesById={screen.genreNamesById}
        onRemove={f.removeFilter}
        onAdd={() => f.setFlyoutVisible(true)}
        trailing={
          <ViewModeToggle
                testID="watchlist-view-mode-toggle"
                value={screen.watchlistViewMode}
                onChange={screen.setWatchlistViewMode}
                buttonTestID={(mode) => `watchlist-view-mode-${mode}-button`}
              />
        }
      />
    </CollapsibleFilterPanel>
  );
}
