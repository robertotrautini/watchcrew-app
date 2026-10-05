import { TextInput, View } from "react-native";

import {
  GenrePills,
  ProviderCategoryPills,
  YearPills,
} from "@/components/entries/EntryFilterPills";
import { Button, BUTTON_ICON_COLORS } from "@/components/ui/Button";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { SortButton } from "@/components/ui/SortButton";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import { sortOptionLabel } from "@/lib/entryFilters";
import {
  hasActiveListFilters,
  toggleProviderCategory,
  WATCHLIST_SORT_SHORT_LABELS,
} from "@/lib/listFilters";
import type { WatchlistSortOption } from "@/lib/watchlistTypes";
import type { WatchlistViewMode } from "@/stores/usePreferencesStore";
import { WATCHLIST_SORT_OPTIONS } from "./WatchlistSortSheet";
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
  const sortOption: WatchlistSortOption = f.sortOption;
  const viewMode: WatchlistViewMode = screen.watchlistViewMode;
  return (
    <CollapsibleFilterPanel
      testID="watchlist-filter"
      open={f.filterPanelOpen}
      onToggle={f.toggleFilterPanel}
      hasActiveFilters={hasActiveListFilters(f.filters, "added")}
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
        <Button
          testID="watchlist-add-movie-button"
          variant="primary"
          iconOnly
          accessibilityLabel="Film hinzufügen"
          onPress={onAddMovie}
        >
          <Icon name="add" size="M" color={BUTTON_ICON_COLORS.primary} />
        </Button>
      }
    >
      <View className="flex-row items-stretch gap-2">
        <SortButton
          testID="watchlist-sort-button"
          shortLabel={
            WATCHLIST_SORT_SHORT_LABELS[sortOption] ??
            sortOptionLabel(WATCHLIST_SORT_OPTIONS, sortOption)
          }
          fullLabel={sortOptionLabel(WATCHLIST_SORT_OPTIONS, sortOption)}
          onPress={() => f.setSortSheetVisible(true)}
        />
        <ViewModeToggle
          testID="watchlist-view-mode-toggle"
          value={viewMode}
          onChange={screen.setWatchlistViewMode}
          buttonTestID={(mode) => `watchlist-view-mode-${mode}-button`}
        />
      </View>
      {sortOption === "genre" ? (
        <GenrePills
          testIDPrefix="watchlist"
          genreIds={screen.genrePillIds}
          selectedGenreIds={f.selectedGenreIds}
          genreNamesById={screen.genreNamesById}
          onToggle={f.toggleGenre}
        />
      ) : null}
      {sortOption === "year" ? (
        <YearPills
          testIDPrefix="watchlist"
          years={screen.yearPillValues}
          selectedYear={f.selectedYear}
          onSelect={(year) => f.updateFilters({ year })}
        />
      ) : null}
      {sortOption === "my_streaming" ? (
        <ProviderCategoryPills
          testIDPrefix="watchlist"
          active={f.providerCategories}
          onToggle={(category) =>
            f.updateFilters({
              providerCategories: toggleProviderCategory(
                f.providerCategories,
                category,
              ),
            })
          }
        />
      ) : null}
    </CollapsibleFilterPanel>
  );
}
