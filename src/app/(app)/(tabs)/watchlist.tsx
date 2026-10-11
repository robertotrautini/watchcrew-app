import { useRouter } from "expo-router";

import { EntryFilterFlyout } from "@/components/entries/EntryFilterFlyout";
import { EntryFilterPanel } from "@/components/entries/EntryFilterPanel";
import { EntryScreenFrame } from "@/components/entries/EntryScreenFrame";
import { IconButton } from "@/components/ui/IconButton";
import { WatchlistEntryList } from "@/components/watchlist/WatchlistEntryList";
import { useWatchlistScreen } from "@/hooks/useWatchlistScreen";
import { WATCHLIST_SORT_FIELDS } from "@/lib/entrySorting";

/**
 * Watchlist tab (M5 part 2). View state lives in `useWatchlistScreen`; the
 * frame (states, header, list container) is `EntryScreenFrame`, the filter
 * panel and entry list are in src/components/watchlist/ + src/components/entries/.
 * See docs/feature-inventory.md for the card/grid/list spec; sort/filter rules
 * live in src/lib/entrySorting.ts, entryFiltering.ts and watchlistLogic.ts.
 */
export default function WatchlistScreen() {
  const router = useRouter();
  const screen = useWatchlistScreen();
  const { filters } = screen;

  const noEntries = screen.searchedEntries.length === 0;

  return (
    <EntryScreenFrame
      testIDPrefix="watchlist"
      title="Watchlist"
      isLoading={screen.isLoading}
      isError={screen.isError}
      errorMessage="Die Watchlist konnte nicht geladen werden."
      panel={
        <EntryFilterPanel
          tab="watchlist"
          testIDPrefix="watchlist"
          sortFields={WATCHLIST_SORT_FIELDS}
          filters={filters}
          activeFilters={filters.filters}
          genreNamesById={screen.genreNamesById}
          viewMode={screen.watchlistViewMode}
          onViewModeChange={screen.setWatchlistViewMode}
          viewModeButtonTestID={(mode) => `watchlist-view-mode-${mode}-button`}
          actions={
            <IconButton
              testID="watchlist-add-movie-button"
              icon="add"
              variant="accent"
              accessibilityLabel="Film hinzufügen"
              onPress={() => router.push("/add-movie")}
            />
          }
        />
      }
      providersLoading={screen.providersLoading}
      body={
        !noEntries
          ? "list"
          : screen.baseWatchlistEntries.length > 0
            ? "no-results"
            : "empty"
      }
      emptyIcon="bookmark"
      emptyTitle="Deine Watchlist ist leer"
      searchQuery={filters.searchQuery}
      flyout={
        <EntryFilterFlyout
          tab="watchlist"
          testIDPrefix="watchlist"
          visible={filters.flyoutVisible}
          filters={filters.filters}
          genreIds={screen.genrePillIds}
          genreNamesById={screen.genreNamesById}
          years={screen.yearPillValues}
          onClose={() => filters.setFlyoutVisible(false)}
          onApply={filters.setFilters}
        />
      }
    >
      <WatchlistEntryList
        entries={screen.searchedEntries}
        viewMode={screen.watchlistViewMode}
        streamingAvailability={screen.streamingAvailability}
        totalMembers={screen.totalMembers}
        showTitlesInGrid={screen.showTitlesInGrid}
        onOpenEntry={screen.openEntry}
        sort={filters.sort}
      />
    </EntryScreenFrame>
  );
}
