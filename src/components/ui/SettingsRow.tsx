import { DANGER_ICON_COLOR, DANGER_PRESSED_CLASSNAME, DANGER_TEXT_CLASSNAME } from "@/components/ui/Button";
import { useGroupTheme } from "@/components/GroupThemeProvider";
import { Icon, type IconRole } from "@/components/ui/Icon";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { cn } from "@/lib/utils";

/** Neutral icon grey as raw hex (icon `color` props can't use classNames); the chevron uses the theme accent. */
const ICON_COLOR = "#888888";

export interface SettingsRowProps {
  icon: IconRole;
  label: string;
  onPress: () => void;
  testID?: string;
  /** Right-aligned secondary text ("7 ausgewählt"). */
  value?: string;
  /** Right-aligned content before the chevron (badges). */
  right?: ReactNode;
  /** Destructive row (Konto löschen): shared danger look (docs/style-guide.md): red tint, red icon + label + chevron. */
  danger?: boolean;
  /** Extra classes merged onto the row. */
  className?: string;
}

/**
 * Flat settings list row (icon, label, optional value/badge, accent chevron).
 * Has no box of its own: put rows inside a `SettingsGroup` glass card, which
 * draws the hairlines between them.
 */
export function SettingsRow({
  icon,
  label,
  onPress,
  testID,
  value,
  right,
  danger,
  className,
}: SettingsRowProps) {
  const { colors } = useGroupTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "min-h-touch-comfortable flex-row items-center gap-3 px-4 py-3",
        danger && `bg-danger/15 ${DANGER_PRESSED_CLASSNAME}`,
        className,
      )}
    >
      <Icon name={icon} size="M" color={danger ? DANGER_ICON_COLOR : ICON_COLOR} />
      <Text className={cn("flex-1 text-base", danger ? DANGER_TEXT_CLASSNAME : "text-text-primary")}>{label}</Text>
      {value ? <Text className="text-sm text-text-secondary">{value}</Text> : null}
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
      <Icon
        testID={testID ? `${testID}-chevron` : undefined}
        name="chevronRight"
        size="S"
        color={danger ? DANGER_ICON_COLOR : colors.accent}
      />
    </Pressable>
  );
}
