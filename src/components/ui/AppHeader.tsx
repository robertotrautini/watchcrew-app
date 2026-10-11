import { useGroupQuickSwitch } from "@/hooks/useGroupQuickSwitch";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { SettingsButton } from "@/components/ui/SettingsButton";

/** Logo height in dp: ~170dp wide (260:64 aspect); at 360dp leaves ~118dp for the group name next to the 48dp gear. */
const LOGO_HEIGHT = 42;

/** Extra space (10dp, `pb-2.5`) below the header; added once here, panels/lists keep their own top margin. */
export const APP_HEADER_BOTTOM_GAP_CLASSNAME = "pb-2.5";

export interface AppHeaderProps {
  /**
   * Fallback label (screen name) shown next to the logo only while no
   * group name is known.
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
 * Compact app header shared by the three main tabs: horizontal WatchCrew logo left
 * (`BrandLogo`, tap = next group), group name display (accent dot + name, no tap
 * target) in the flexible middle, round settings button right (48dp).
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
    <View testID="app-header" className={APP_HEADER_BOTTOM_GAP_CLASSNAME}>
      <View className="px-3 pt-2">
        <View className="min-h-touch-comfortable flex-row items-center">
          {/* Logo tap cycles through the groups (as before); the group name beside it updates immediately. */}
          <Pressable
            testID="app-header-brand-button"
            accessibilityRole="button"
            accessibilityLabel={`Gruppe wechseln, aktuell: ${shownGroup ?? "keine"}`}
            onPress={switchToNext}
            className="justify-center"
          >
            <BrandLogo testID="app-header-logo" height={LOGO_HEIGHT} />
          </Pressable>
          {/* Display only (no tap target): accent dot + active group name; switching = logo tap or Settings. */}
          <View testID="app-header-group" className="flex-1 flex-row items-center justify-center gap-1.5 px-2">
            <View testID="app-header-group-dot" className="h-2 w-2 rounded-full bg-accent" />
            <Text
              testID="app-header-title"
              numberOfLines={1}
              ellipsizeMode="tail"
              className="shrink font-title text-xs uppercase tracking-wide text-text-secondary"
            >
              {shownGroup ?? title}
            </Text>
          </View>
          <SettingsButton testID={settingsTestID} />
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
