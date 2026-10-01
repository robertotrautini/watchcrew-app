import { Pressable, Text, View } from "react-native";

import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * M10 Settings hub — "Darstellung" sub-screen. Currently a single real
 * toggle ("Filmtitel in Grid anzeigen", wired to `showTitlesInGrid` --
 * see src/app/(app)/(tabs)/{watchlist,tagebuch}.tsx for where it's actually
 * read). A custom Pressable-based toggle rather than React Native's built-in
 * `Switch` -- keeps this screen's look consistent with the rest of the
 * app's NativeWind-styled Pressable/Button-based UI instead of introducing
 * a platform-native-look control (no equivalent precedent for a toggle
 * exists yet elsewhere in this codebase, so this is a fresh, reversible
 * implementation-detail choice, logged in docs/interim-decisions.md).
 */
export default function SettingsDisplayScreen() {
  const showTitlesInGrid = usePreferencesStore((s) => s.showTitlesInGrid);
  const setShowTitlesInGrid = usePreferencesStore((s) => s.setShowTitlesInGrid);
  const trackerEnabled = usePreferencesStore((s) => s.trackerEnabled);
  const setTrackerEnabled = usePreferencesStore((s) => s.setTrackerEnabled);

  return (
    <View className="flex-1 px-4 pt-4" testID="settings-display-screen">

      <Pressable
        testID="settings-display-titles-toggle"
        accessibilityRole="switch"
        accessibilityState={{ checked: showTitlesInGrid }}
        onPress={() => setShowTitlesInGrid(!showTitlesInGrid)}
        className="flex-row items-center justify-between rounded-lg border border-border-subtle bg-card px-4 py-3"
      >
        <Text className="flex-1 pr-3 text-text-primary">Filmtitel in Grid anzeigen</Text>
        <View
          className={`h-7 w-12 justify-center rounded-full px-0.5 ${
            showTitlesInGrid ? "items-end bg-accent" : "items-start bg-border-subtle"
          }`}
        >
          <View className="h-6 w-6 rounded-full bg-bg-primary" />
        </View>
      </Pressable>
      <Pressable
        testID="settings-display-tracker-toggle"
        accessibilityRole="switch"
        accessibilityState={{ checked: trackerEnabled }}
        onPress={() => setTrackerEnabled(!trackerEnabled)}
        className="mt-3 flex-row items-center justify-between rounded-lg border border-border-subtle bg-card px-4 py-3"
      >
        <Text className="flex-1 pr-3 text-text-primary">Tracker aktiv</Text>
        <View
          className={`h-7 w-12 justify-center rounded-full px-0.5 ${
            trackerEnabled ? "items-end bg-accent" : "items-start bg-border-subtle"
          }`}
        >
          <View className="h-6 w-6 rounded-full bg-bg-primary" />
        </View>
      </Pressable>
    </View>
  );
}
