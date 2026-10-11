import { EntryFilterFlyout } from "@/components/entries/EntryFilterFlyout";
import { EntryFilterPanel } from "@/components/entries/EntryFilterPanel";
import { EntryScreenFrame } from "@/components/entries/EntryScreenFrame";
import { TagebuchEntryList } from "@/components/tagebuch/TagebuchEntryList";
import { TagebuchScopeSwitch } from "@/components/tagebuch/TagebuchScopeSwitch";
import { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { DIARY_SORT_FIELDS } from "@/lib/entrySorting";

/**
 * Tagebuch (diary) tab (M5 part 2). View state lives in `useTagebuchScreen`
 * (see its doc comment for member/genre/active-group wiring); the frame
 * (states, header, list container) is `EntryScreenFrame`, the filter scope
 * switch, filter panel, entry list and filter flyout are in
 * src/components/tagebuch/ + src/components/entries/. The sort/filter rules
 * live in src/lib/entrySorting.ts, entryFiltering.ts and watchlistLogic.ts.
 */
export default function TagebuchScreen() {
  const screen = useTagebuchScreen();
  const { filters } = screen;

  return (
    <EntryScreenFrame
      testIDPrefix="tagebuch"
      title="Tagebuch"
      isLoading={screen.isLoading}
      isError={screen.isError}
      errorMessage="Fehler beim Laden des Tagebuchs."
      panel={
        <>
          <TagebuchScopeSwitch
            scope={filters.scope}
            onChange={filters.setScope}
          />
          <EntryFilterPanel
            tab="diary"
            testIDPrefix="tagebuch"
            sortFields={DIARY_SORT_FIELDS}
            filters={filters}
            activeFilters={screen.activeFilters}
            genreNamesById={screen.genreNamesById}
            viewMode={screen.diaryViewMode}
            onViewModeChange={screen.setDiaryViewMode}
            viewModeButtonTestID={(mode) => `tagebuch-view-mode-${mode}`}
          />
        </>
      }
      providersLoading={screen.providersLoading}
      body={
        screen.isDiaryEmpty
          ? "empty"
          : screen.hasNoResults
            ? "no-results"
            : "list"
      }
      emptyIcon="tabDiary"
      emptyTitle="Noch keine bewerteten Filme"
      searchQuery={filters.searchQuery}
      flyout={
        <EntryFilterFlyout
          tab="diary"
          testIDPrefix="tagebuch"
          visible={filters.flyoutVisible}
          filters={screen.activeFilters}
          genreIds={screen.availableGenreIds}
          genreNamesById={screen.genreNamesById}
          years={screen.availableYears}
          showNoDateYear={screen.hasNoDateYear}
          hideRatingState={screen.isMyDiaryScope}
          onClose={() => filters.setFlyoutVisible(false)}
          onApply={filters.setFilters}
        />
      }
    >
      <TagebuchEntryList
        entries={screen.visibleEntries}
        mode={screen.diaryViewMode}
        userId={screen.userId}
        starColor={screen.starColor}
        showTitlesInGrid={screen.showTitlesInGrid}
        groupMemberIds={screen.groupMemberIds}
        displayNameById={screen.displayNameById}
        onOpenEntry={screen.openEntry}
        sort={filters.sort}
      />
    </EntryScreenFrame>
  );
}
