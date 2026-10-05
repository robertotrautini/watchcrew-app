import { useRouter } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { WatchlistEntryList } from "@/components/watchlist/WatchlistEntryList";
import { WatchlistFilterPanel } from "@/components/watchlist/WatchlistFilterPanel";
import { WatchlistSortSheet } from "@/components/watchlist/WatchlistSortSheet";
import { AppHeader } from "@/components/ui/AppHeader";
import { useWatchlistScreen } from "@/hooks/useWatchlistScreen";
import { getNoResultsMessage } from "@/lib/listFilters";

/**
 * Watchlist tab (M5 part 2). View state lives in `useWatchlistScreen`; the
 * filter panel, entry list and sort sheet are in src/components/watchlist/.
 * See docs/feature-inventory.md for the card/grid/list spec and the sort/
 * filter rules (implemented in src/lib/watchlistLogic.ts).
 */
export default function WatchlistScreen() {
  const router = useRouter();
  const screen = useWatchlistScreen();
  const { filters } = screen;

  if (screen.isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center"
        testID="watchlist-screen"
      >
        <ActivityIndicator testID="watchlist-loading" />
        <Text className="mt-2 text-text-secondary">
          Watchlist wird geladen…
        </Text>
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

      <WatchlistFilterPanel
        screen={screen}
        onAddMovie={() => router.push("/add-movie")}
      />

      {filters.sortOption === "my_streaming" && screen.providersLoading ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-providers-loading"
        >
          <ActivityIndicator />
          <Text className="mt-2 text-text-secondary">
            Streaming-Daten werden geladen…
          </Text>
        </View>
      ) : noEntries && screen.baseWatchlistEntries.length > 0 ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-no-results"
        >
          <Text className="text-center text-text-secondary">
            {getNoResultsMessage(filters.searchQuery)}
          </Text>
        </View>
      ) : noEntries ? (
        <View
          className="flex-1 items-center justify-center px-8"
          testID="watchlist-empty"
        >
          <Text className="text-center text-text-primary">
            Deine Watchlist ist leer.
          </Text>
          <Text className="mt-1 text-center text-text-secondary">
            Füge Filme hinzu, sobald ihr euch für welche entschieden habt.
          </Text>
        </View>
      ) : (
        <WatchlistEntryList
          entries={screen.searchedEntries}
          viewMode={screen.watchlistViewMode}
          streamingAvailability={screen.streamingAvailability}
          totalMembers={screen.totalMembers}
          showTitlesInGrid={screen.showTitlesInGrid}
          onOpenEntry={screen.openEntry}
        />
      )}

      <WatchlistSortSheet
        visible={filters.sortSheetVisible}
        sortOption={filters.sortOption}
        onClose={() => filters.setSortSheetVisible(false)}
        onSelect={filters.selectSortOption}
      />
    </SafeAreaView>
  );
}
