import { useGroupQuickSwitch } from "@/hooks/useGroupQuickSwitch";
import { Icon } from "@/components/ui/Icon";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { SettingsButton } from "@/components/ui/SettingsButton";

/** Header icon/wordmark/group name are always white (never the theme accent). */
const HEADER_WHITE = "#ffffff";

export interface AppHeaderProps {
  /**
   * Fallback subtitle (screen name) shown under the wordmark only while no
   * group name is known. Normally the subtitle slot shows the group name.
   */
  title: string;
  /** testID of the settings button (kept per tab so Maestro flows keep working). */
  settingsTestID: string;
  /** Optional action row (view toggle, add/payment buttons) rendered right-aligned below the brand. */
  actions?: ReactNode;
  /** Optional active group name override; default is the active group from the quick-switch hook. */
  groupName?: string | null;
}

/**
 * Compact legacy-style app header shared by the three main tabs: reel icon +
 * "WATCHCREW" wordmark (Outfit, always white) centred between two hairlines,
 * the screen title as small caps subtitle, round settings button on the right.
 * The top safe-area inset stays with the screen's own SafeAreaView.

 */
export function AppHeader({
  title,
  settingsTestID,
  actions,
  groupName,
}: AppHeaderProps) {
  const { activeGroupName, switchToNext } = useGroupQuickSwitch();
  const shownGroup = groupName ?? activeGroupName;
  return (
    <View testID="app-header">
      <View className="px-4 pt-2">
        <View className="items-center justify-center">
          <Pressable
            testID="app-header-brand-button"
            accessibilityRole="button"
            accessibilityLabel={`Gruppe wechseln, aktuell: ${shownGroup ?? "keine"}`}
            onPress={switchToNext}
            className="min-h-touch-comfortable items-center"
          >
            <Icon testID="app-header-icon" name="film" size="M" color={HEADER_WHITE} />
            <View className="flex-row items-center gap-3">
              <View className="h-px w-8 bg-glass-border" />
              <Text
                testID="app-header-wordmark"
                className="font-title-bold text-xl tracking-widest text-white"
              >
                WATCHCREW
              </Text>
              <View className="h-px w-8 bg-glass-border" />
            </View>
            <Text
              testID="app-header-title"
              numberOfLines={1}
              ellipsizeMode="tail"
              className="max-w-[70%] text-xs uppercase tracking-widest text-text-secondary"
            >
              {shownGroup ?? title}
            </Text>
            {/* Keeps the height of the former group-name line (text-xs = 16dp). */}
            <View testID="app-header-spacer" className="h-4" />
          </Pressable>
          <View className="absolute right-0 top-0">
            <SettingsButton testID={settingsTestID} />
          </View>
        </View>
        {actions ? (
          <View className="mt-2 flex-row items-center justify-end gap-2">
            {actions}
          </View>
        ) : null}
      </View>
    </View>
  );
}
