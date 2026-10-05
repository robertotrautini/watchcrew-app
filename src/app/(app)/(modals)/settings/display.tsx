import { View } from "react-native";

import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
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
    <View className="flex-1" testID="settings-display-screen">
      <View className="flex-1 px-4 pt-4">
        <SettingsGroup testID="settings-display-group">
          <SettingsToggleRow
            testID="settings-display-titles-toggle"
            label="Filmtitel in Grid anzeigen"
            checked={showTitlesInGrid}
            onPress={() => setShowTitlesInGrid(!showTitlesInGrid)}
          />
          <SettingsToggleRow
            testID="settings-display-tracker-toggle"
            label="Tracker aktiv"
            checked={trackerEnabled}
            onPress={() => setTrackerEnabled(!trackerEnabled)}
          />
        </SettingsGroup>
      </View>
      <SettingsBackBar />
    </View>
  );
}
