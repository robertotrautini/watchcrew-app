import { TextInput } from "@/components/ui/Text";

import { EntryFilterBar } from "@/components/entries/EntryFilterBar";
import { EntrySortRow } from "@/components/entries/EntrySortRow";
import { CollapsibleFilterPanel } from "@/components/ui/CollapsibleFilterPanel";
import { GLASS_SEARCH_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { ViewModeToggle } from "@/components/ui/ViewModeToggle";
import type { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { DIARY_SORT_FIELDS } from "@/lib/entrySorting";
import { activeFilterKeys } from "@/lib/listFilters";

type Screen = ReturnType<typeof useTagebuchScreen>;

export function TagebuchFilterPanel({ screen }: { screen: Screen }) {
  const f = screen.filters;
  const filterKeys = activeFilterKeys(screen.activeFilters, "diary");
  const hasActiveFilters = filterKeys.length > 0;
  return (
    <CollapsibleFilterPanel
      testID="tagebuch-filter"
      open={f.filterPanelOpen}
      onToggle={f.toggleFilterPanel}
      hasActiveFilters={hasActiveFilters}
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
      <EntrySortRow
        testIDPrefix="tagebuch"
        fields={DIARY_SORT_FIELDS}
        sort={f.sort}
        onChange={f.setSort}
      />
      <EntryFilterBar
        testIDPrefix="tagebuch"
        keys={filterKeys}
        filters={screen.activeFilters}
        genreNamesById={screen.genreNamesById}
        onRemove={f.removeFilter}
        onAdd={() => f.setFlyoutVisible(true)}
        trailing={
          <ViewModeToggle
                testID="tagebuch-view-mode-toggle"
                value={screen.diaryViewMode}
                onChange={screen.setDiaryViewMode}
                buttonTestID={(mode) => `tagebuch-view-mode-${mode}`}
              />
        }
      />
    </CollapsibleFilterPanel>
  );
}
