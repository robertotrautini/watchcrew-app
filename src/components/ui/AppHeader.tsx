import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { SettingsButton } from "@/components/ui/SettingsButton";

/** Legacy accent-light (--accent-light); icon colour needs a raw hex. */
const REEL_COLOR = "#e8d5a3";

export interface AppHeaderProps {
  /** Screen name, shown small + letter-spaced under the wordmark (legacy "TRAUTMANN" slot). */
  title: string;
  /** testID of the settings button (kept per tab so Maestro flows keep working). */
  settingsTestID: string;
  /** Optional action row (view toggle, add/payment buttons) rendered right-aligned below the brand. */
  actions?: ReactNode;
  /** Optional active group name, shown next to the title. */
  groupName?: string | null;
}

/**
 * Compact legacy-style app header shared by the three main tabs: reel icon +
 * "WATCHCREW" wordmark (Playfair, accent-light) centred between two hairlines,
 * the screen title as small caps subtitle, round settings button on the right.
 * The top safe-area inset stays with the screen's own SafeAreaView.

 */
export function AppHeader({ title, settingsTestID, actions, groupName }: AppHeaderProps) {
  return (
    <View testID="app-header">
      <View className="px-4 pt-2">
        <View className="items-center justify-center">
          <View className="items-center">
            <Ionicons name="film-outline" size={26} color={REEL_COLOR} />
            <View className="flex-row items-center gap-3">
              <View className="h-px w-8 bg-glass-border" />
              <Text
                testID="app-header-wordmark"
                className="font-display-bold text-xl tracking-widest text-accent-light"
              >
                WATCHCREW
              </Text>
              <View className="h-px w-8 bg-glass-border" />
            </View>
            <Text
              testID="app-header-title"
              className="text-xs uppercase tracking-widest text-text-secondary"
            >
              {title}
            </Text>
            {groupName ? (
              <Text testID="app-header-group" className="text-xs text-text-dim">
                {groupName}
              </Text>
            ) : null}
          </View>
          <View className="absolute right-0 top-0">
            <SettingsButton testID={settingsTestID} />
          </View>
        </View>
        {actions ? (
          <View className="mt-2 flex-row items-center justify-end gap-2">{actions}</View>
        ) : null}
      </View>
    </View>
  );
}
