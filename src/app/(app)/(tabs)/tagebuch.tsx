import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { SafeAreaView } from "react-native-safe-area-context";

import { TagebuchEntryList } from "@/components/tagebuch/TagebuchEntryList";
import { TagebuchFilterPanel } from "@/components/tagebuch/TagebuchFilterPanel";
import { TagebuchScopeSwitch } from "@/components/tagebuch/TagebuchScopeSwitch";
import { EntryFilterFlyout } from "@/components/entries/EntryFilterFlyout";
import { AppHeader } from "@/components/ui/AppHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useTagebuchScreen } from "@/hooks/useTagebuchScreen";
import { getNoResultsMessage } from "@/lib/listFilters";

/**
 * Tagebuch (diary) tab (M5 part 2). View state lives in `useTagebuchScreen`
 * (see its doc comment for member/genre/active-group wiring); the filter
 * scope switch, filter panel, entry list and filter flyout are in
 * src/components/tagebuch/ + src/components/entries/. The sort/filter rules
 * live in src/lib/entrySorting.ts, entryFiltering.ts and watchlistLogic.ts.
 */
export default function TagebuchScreen() {
  const screen = useTagebuchScreen();
  const { filters } = screen;

  if (screen.isLoading) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1"
        testID="tagebuch-screen"
      >
        <AppHeader title="Tagebuch" settingsTestID="tagebuch-settings-button" />
        <LoadingArea testID="tagebuch-loading" />
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
      <TagebuchScopeSwitch scope={filters.scope} onChange={filters.setScope} />
      <TagebuchFilterPanel screen={screen} />

      {screen.providersLoading ? (
        <View
          className="flex-1 items-center justify-center px-6"
          testID="tagebuch-providers-loading"
        >
          <Spinner />
          <Text className="mt-2 text-text-secondary">
            Streaming-Daten werden geladen…
          </Text>
        </View>
      ) : screen.isDiaryEmpty ? (
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
          onSortField={filters.toggleHeaderSort}
        />
      )}

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
    </SafeAreaView>
  );
}
