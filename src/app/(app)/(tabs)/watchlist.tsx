import { WATCHLIST_SORT_FIELDS } from "@/lib/entrySorting";
import { EmptyState } from "@/components/ui/EmptyState";
import { useRouter } from "expo-router";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { Spinner } from "@/components/ui/Spinner";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";

import { PANEL_LIST_OVERLAP_CLASSNAME } from "@/components/ui/Surface";
import { WatchlistEntryList } from "@/components/watchlist/WatchlistEntryList";
import { EntryFilterPanel } from "@/components/entries/EntryFilterPanel";
import { IconButton } from "@/components/ui/IconButton";
import { EntryFilterFlyout } from "@/components/entries/EntryFilterFlyout";
import { AppHeader } from "@/components/ui/AppHeader";
import { useWatchlistScreen } from "@/hooks/useWatchlistScreen";
import { getNoResultsMessage } from "@/lib/listFilters";

/**
 * Watchlist tab (M5 part 2). View state lives in `useWatchlistScreen`; the
 * filter panel and entry list are in src/components/watchlist/, the filter
 * flyout in src/components/entries/. See docs/feature-inventory.md for the
 * card/grid/list spec; sort/filter rules live in src/lib/entrySorting.ts,
 * entryFiltering.ts and watchlistLogic.ts.
 */
export default function WatchlistScreen() {
  const router = useRouter();
  const screen = useWatchlistScreen();
  const { filters } = screen;

  if (screen.isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1"
        testID="watchlist-screen"
      >
        <AppHeader title="Watchlist" settingsTestID="watchlist-settings-button" />
        <LoadingArea testID="watchlist-loading" />
      </SafeAreaView>
    );
  }

  if (screen.isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-4"
        testID="watchlist-screen"
      >
        <Text testID="watchlist-error" className="text-center text-danger">
          Die Watchlist konnte nicht geladen werden.
        </Text>
      </SafeAreaView>
    );
  }

  const noEntries = screen.searchedEntries.length === 0;

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): `headerShown: false` tab screen, top inset only (bottom is
    // the Tabs navigator's job).
    <SafeAreaView edges={["top"]} className="flex-1" testID="watchlist-screen">
      <AppHeader title="Watchlist" settingsTestID="watchlist-settings-button" />

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

      {screen.providersLoading ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-providers-loading"
        >
          <Spinner />
          <Text className="mt-2 text-text-secondary">
            Streaming-Daten werden geladen…
          </Text>
        </View>
      ) : noEntries && screen.baseWatchlistEntries.length > 0 ? (
        <EmptyState
          testID="watchlist-no-results"
          icon="filter"
          title={getNoResultsMessage(filters.searchQuery)}
        />
      ) : noEntries ? (
        <EmptyState
          testID="watchlist-empty"
          icon="bookmark"
          title="Deine Watchlist ist leer"
        />
      ) : (
        <View className={PANEL_LIST_OVERLAP_CLASSNAME + " flex-1"}>
          <WatchlistEntryList
            entries={screen.searchedEntries}
            viewMode={screen.watchlistViewMode}
            streamingAvailability={screen.streamingAvailability}
            totalMembers={screen.totalMembers}
            showTitlesInGrid={screen.showTitlesInGrid}
            onOpenEntry={screen.openEntry}
            sort={filters.sort}
          />
        </View>
      )}

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
    </SafeAreaView>
  );
}
