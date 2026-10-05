import { useMemo } from "react";
import { useParallaxScroll } from "@/components/parallaxContext";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";
import { Button } from "@/components/ui/Button";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupNames } from "@/hooks/useGroupDetails";
import { useGroupPushSubscription } from "@/hooks/useGroupPushSubscription";
import { usePushPermissionStatus } from "@/hooks/usePushPermissionStatus";
import { useUserGroups } from "@/hooks/useUserGroups";
import { groupDisplayLabel } from "@/lib/diaryDisplay";
import { GLASS_TILE_CLASSNAME } from "@/components/ui/Glass";

/**
 * Settings "Benachrichtigungen" (inventory 4.2, ADR 0006): one opt-in toggle
 * PER Watch-Group the user belongs to (not just the active one), plus a hint
 * with a system-settings shortcut when the OS notification permission is
 * denied (the registration hook, usePushRegistration, only asks once).
 *
 * Toggle look follows settings/display.tsx (custom Pressable switch).
 */
const PERMISSION_STEPS = Platform.select({
  ios: "Öffne Einstellungen > WatchCrew > Mitteilungen und erlaube Mitteilungen.",
  default:
    "Öffne Einstellungen > Apps > WatchCrew > Benachrichtigungen und erlaube Benachrichtigungen.",
});

function GroupPushToggleRow({
  groupId,
  userId,
  label,
}: {
  groupId: string;
  userId: string | undefined;
  label: string;
}) {
  const { isSubscribed, isLoading, isMutating, subscribe, unsubscribe } =
    useGroupPushSubscription(groupId, userId);

  return isLoading ? (
    <View className="min-h-touch-comfortable items-center justify-center">
      <ActivityIndicator testID={`settings-notifications-loading-${groupId}`} />
    </View>
  ) : (
    <SettingsToggleRow
      testID={`settings-notifications-toggle-${groupId}`}
      label={label}
      checked={isSubscribed}
      disabled={isMutating}
      onPress={isSubscribed ? unsubscribe : subscribe}
    />
  );
}

export default function SettingsNotificationsScreen() {
  const parallaxScroll = useParallaxScroll();
  const currentUserId = useCurrentUserId();
  const groupsQuery = useUserGroups(currentUserId);
  const groupIds = useMemo(
    () =>
      ((groupsQuery.data ?? []) as Array<{ group_id: string }>).map(
        (m) => m.group_id,
      ),
    [groupsQuery.data],
  );
  const namesQuery = useGroupNames(groupIds);
  const nameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const group of (namesQuery.data ?? []) as Array<{
      id: string;
      name: string;
    }>) {
      names.set(group.id, group.name);
    }
    return names;
  }, [namesQuery.data]);
  const permission = usePushPermissionStatus();

  return (
    <View className="flex-1" testID="settings-notifications-screen">
      <ScrollView {...parallaxScroll} className="flex-1 px-4 pt-4">
        {permission === "denied" ? (
          <View
            testID="settings-notifications-permission-hint"
            className={`mb-4 gap-3 ${GLASS_TILE_CLASSNAME} p-4`}
          >
            <Text className="text-text-primary">
              Benachrichtigungen sind in den Systemeinstellungen deaktiviert.{" "}
              {PERMISSION_STEPS}
            </Text>
            <Button
              testID="settings-notifications-open-settings"
              label="Systemeinstellungen öffnen"
              icon="settings"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          </View>
        ) : null}

        <Text
          testID="settings-notifications-copy"
          className="mb-4 text-sm text-text-secondary"
        >
          Pro Gruppe: Du wirst benachrichtigt, wenn jemand aus dieser Gruppe
          einen neuen Film zur Watchlist hinzufügt, einen Film als Erstes
          bewertet, oder wenn der Kinostart eines vorgemerkten Films näher
          rückt.
        </Text>

        <SettingsGroup testID="settings-notifications-group">
          {groupIds.map((groupId) => (
            <GroupPushToggleRow
              key={groupId}
              groupId={groupId}
              userId={currentUserId}
              label={groupDisplayLabel(groupId, nameById.get(groupId))}
            />
          ))}
        </SettingsGroup>
      </ScrollView>
      <SettingsBackBar />
    </View>
  );
}
