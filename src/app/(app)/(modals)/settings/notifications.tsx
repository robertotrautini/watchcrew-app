import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupPushSubscription } from "@/hooks/useGroupPushSubscription";

/**
 * M10 — the real Settings-hub "Benachrichtigungen" screen, replacing the
 * minimal placeholder the M10 Settings-hub task deliberately left in place
 * (see docs/interim-decisions.md, "M10 — 'Benachrichtigungen'-Zeile
 * verlinkt einen Platzhalter-Screen (Abstimmungspunkt mit der parallelen
 * Push-Task)" — this IS that reconciliation). Wires the already-built,
 * already-tested `useGroupPushSubscription` hook
 * (src/hooks/useGroupPushSubscription.ts) to a single per-group push
 * opt-in toggle for the current active group.
 *
 * Same custom Pressable-based toggle pattern as
 * src/app/(app)/(modals)/settings/display.tsx (no shared `Toggle`
 * component exists yet in src/components/ui/, per that screen's own
 * interim-decision entry — this screen follows the same precedent rather
 * than introducing a second one-off toggle style).
 *
 * `activeGroupId`/`currentUserId` can both be `undefined` briefly (before
 * `useCurrentUserId`/`useActiveGroup` resolve) -- `useGroupPushSubscription`
 * already handles that gracefully (query `enabled: false`,
 * `subscribe`/`unsubscribe` become no-ops), so this screen doesn't need its
 * own extra "no group yet" branch.
 */
export default function SettingsNotificationsScreen() {
  const currentUserId = useCurrentUserId();
  const { activeGroupId } = useActiveGroup(currentUserId);
  const { isSubscribed, isLoading, isMutating, subscribe, unsubscribe } = useGroupPushSubscription(
    activeGroupId,
    currentUserId,
  );

  function handleToggle() {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  }

  return (
    <View className="flex-1 bg-bg-primary px-4 pt-4" testID="settings-notifications-screen">
      <Text className="mb-2 font-display text-xl text-text-primary">Benachrichtigungen</Text>

      <Text testID="settings-notifications-copy" className="mb-4 text-sm text-text-secondary">
        Du wirst benachrichtigt, wenn jemand aus dieser Gruppe einen neuen Film zur Watchlist
        hinzufügt, einen Film als Erstes bewertet, oder wenn der Kinostart eines vorgemerkten Films
        näher rückt.
      </Text>

      {isLoading ? (
        <ActivityIndicator testID="settings-notifications-loading" />
      ) : (
        <Pressable
          testID="settings-notifications-toggle"
          accessibilityRole="switch"
          accessibilityState={{ checked: isSubscribed, disabled: isMutating || isLoading }}
          disabled={isMutating || isLoading}
          onPress={handleToggle}
          className="flex-row items-center justify-between rounded-lg border border-border-subtle bg-card px-4 py-3"
        >
          <Text className="flex-1 pr-3 text-text-primary">
            Push-Benachrichtigungen für diese Gruppe
          </Text>
          <View
            className={`h-7 w-12 justify-center rounded-full px-0.5 ${
              isSubscribed ? "items-end bg-accent" : "items-start bg-border-subtle"
            }`}
          >
            <View className="h-6 w-6 rounded-full bg-bg-primary" />
          </View>
        </Pressable>
      )}
    </View>
  );
}
