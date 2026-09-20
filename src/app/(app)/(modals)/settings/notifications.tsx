import { Text, View } from "react-native";

/**
 * M10 — MINIMAL PLACEHOLDER, not the real feature. Benachrichtigungen
 * (push-notification subscription management) is built by a PARALLEL M10
 * task; this file only exists so the Settings hub's "Benachrichtigungen"
 * row (src/app/(app)/(modals)/settings.tsx) has a real route to navigate to
 * instead of a dead link, per this task's brief ("just link to a route that
 * may not fully exist yet if the parallel task hasn't landed").
 *
 * RECONCILIATION POINT (see docs/interim-decisions.md, "M10 — Settings
 * hub"): once the parallel notifications task lands, this file should be
 * replaced by its real screen — it is NOT meant to survive as the final
 * implementation.
 */
export default function SettingsNotificationsScreen() {
  return (
    <View
      className="flex-1 items-center justify-center bg-bg-primary px-6"
      testID="settings-notifications-placeholder"
    >
      <Text className="text-center text-text-secondary">
        Benachrichtigungs-Einstellungen sind bald verfügbar.
      </Text>
    </View>
  );
}
