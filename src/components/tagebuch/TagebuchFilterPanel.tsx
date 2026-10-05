import { TextInput, View } from "react-native";

import {
  GenrePills,
  ProviderCategoryPills,
  YearPills,
} from "@/components/entries/EntryFilterPills";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { SortButton } from "@/components/ui/SortButton";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import type { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { sortOptionLabel } from "@/lib/entryFilters";
import {
  DIARY_SORT_SHORT_LABELS,
  hasActiveListFilters,
  toggleProviderCategory,
} from "@/lib/listFilters";
import { TAGEBUCH_SORT_OPTIONS } from "./TagebuchSortSheet";

type Screen = ReturnType<typeof useTagebuchScreen>;

export function TagebuchFilterPanel({ screen }: { screen: Screen }) {
  const f = screen.filters;
  const sortOption = f.sortOption;
  return (
    <CollapsibleFilterPanel
      testID="tagebuch-filter"
      open={f.filterPanelOpen}
      onToggle={f.toggleFilterPanel}
      hasActiveFilters={hasActiveListFilters(f.filters, "my_diary")}
      search={
        <TextInput
          testID="tagebuch-search-input"
          value={f.searchQuery}
          onChangeText={f.setSearchQuery}
          placeholder="Film suchen…"
          placeholderTextColor="#888888"
          className={GLASS_SEARCH_INPUT_CLASSNAME}
        />
      }
    >
      <View className="flex-row items-stretch gap-2">
        <SortButton
          testID="tagebuch-sort-button"
          shortLabel={
            DIARY_SORT_SHORT_LABELS[sortOption] ??
            sortOptionLabel(TAGEBUCH_SORT_OPTIONS, sortOption)
          }
          fullLabel={sortOptionLabel(TAGEBUCH_SORT_OPTIONS, sortOption)}
          onPress={() => f.setSortSheetVisible(true)}
        />
        <ViewModeToggle
          testID="tagebuch-view-mode-toggle"
          value={screen.diaryViewMode}
          onChange={screen.setDiaryViewMode}
          buttonTestID={(mode) => `tagebuch-view-mode-${mode}`}
        />
      </View>
      {sortOption === "genre" ? (
        <GenrePills
          testIDPrefix="tagebuch"
          genreIds={screen.availableGenreIds}
          selectedGenreIds={f.selectedGenreIds}
          genreNamesById={screen.genreNamesById}
          onToggle={f.toggleGenre}
        />
      ) : null}
      {sortOption === "year" ? (
        <YearPills
          testIDPrefix="tagebuch"
          years={screen.availableYears}
          selectedYear={f.selectedYear}
          showNoDate={screen.hasNoDateYear}
          onSelect={(year) => f.updateFilters({ year })}
        />
      ) : null}
      {sortOption === "my_streaming" ? (
        <ProviderCategoryPills
          testIDPrefix="tagebuch"
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
