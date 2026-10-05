import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TagebuchEntryList } from "@/components/tagebuch/TagebuchEntryList";
import { TagebuchFilterPanel } from "@/components/tagebuch/TagebuchFilterPanel";
import { TagebuchSortSheet } from "@/components/tagebuch/TagebuchSortSheet";
import { AppHeader } from "@/components/ui/AppHeader";
import { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { getNoResultsMessage } from "@/lib/listFilters";

/**
 * Tagebuch (diary) tab (M5 part 2). View state lives in `useTagebuchScreen`
 * (see its doc comment for member/genre/active-group wiring); the filter
 * panel, entry list and sort sheet are in src/components/tagebuch/. The
 * sort/filter/split rules live in src/lib/watchlistLogic.ts.
 */
export default function TagebuchScreen() {
  const screen = useTagebuchScreen();
  const { filters } = screen;

  if (screen.isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center"
        testID="tagebuch-screen"
      >
        <ActivityIndicator testID="tagebuch-loading" />
      </SafeAreaView>
    );
  }

  if (screen.isError) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 items-center justify-center px-6"
        testID="tagebuch-screen"
      >
        <Text testID="tagebuch-error" className="text-center text-text-primary">
          Fehler beim Laden des Tagebuchs.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    // M11 (platform-quirk review, see docs/interim-decisions.md "M11 —
    // Safe-Area"): same reasoning as tracker.tsx/watchlist.tsx.
    <SafeAreaView edges={["top"]} className="flex-1" testID="tagebuch-screen">
      <AppHeader title="Tagebuch" settingsTestID="tagebuch-settings-button" />
      <TagebuchFilterPanel screen={screen} />

      {screen.isDiaryEmpty ? (
        <View
          className="flex-1 items-center justify-center px-6"
          testID="tagebuch-empty"
        >
          <Text className="text-center text-text-secondary">
            Noch keine bewerteten Filme.
          </Text>
        </View>
      ) : screen.hasNoResults ? (
        <View
          className="flex-1 items-center justify-center px-6"
          testID="tagebuch-no-results"
        >
          <Text className="text-center text-text-secondary">
            {getNoResultsMessage(filters.searchQuery)}
          </Text>
        </View>
      ) : (
        <TagebuchEntryList screen={screen} />
      )}

      <TagebuchSortSheet
        visible={filters.sortSheetVisible}
        sortOption={filters.sortOption}
        onClose={() => filters.setSortSheetVisible(false)}
        onSelect={filters.selectSortOption}
      />
    </SafeAreaView>
  );
}
