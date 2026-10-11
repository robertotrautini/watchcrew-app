import { createContext, useContext, type ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { DANGER_ICON_COLOR, DANGER_PRESSED_CLASSNAME, DANGER_TEXT_CLASSNAME } from "@/components/ui/Button";
import { CONTROL_HEIGHT_CLASSNAME } from "@/components/ui/controlHeight";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { SURFACE_TILE_CLASSNAME } from "@/components/ui/Surface";
import { Text } from "@/components/ui/Text";
import { PLACEHOLDER_COLOR } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** Provided by `SettingsGroup`: rows inside one shared card render `grouped` (divider, no own chrome). */
export const GroupedRowsContext = createContext<{ isLast: boolean } | null>(null);

export interface ListRowProps {
  label: string;
  icon?: IconRole;
  /** Secondary text at the right (before `trailing`). */
  value?: string;
  valueTestID?: string;
  /** Any trailing element (Switch, SegmentedControl, IconButton ...); a function receives the pressed state. */
  trailing?: ReactNode | ((pressed: boolean) => ReactNode);
  /** Accent chevron at the very end (navigation rows). testID `<testID>-chevron`. */
  chevron?: boolean;
  /** Row is pressable when given. */
  onPress?: () => void;
  testID?: string;
  danger?: boolean;
  disabled?: boolean;
  accessibilityRole?: PressableProps["accessibilityRole"];
  accessibilityState?: PressableProps["accessibilityState"];
  className?: string;
  /** No own border/fill/radius (the parent card draws them); bottom divider unless `isLast`. Defaults to the SettingsGroup context. */
  grouped?: boolean;
  /** Last row of a grouped card: no divider. Defaults to the SettingsGroup context. */
  isLast?: boolean;
  /** Trailing element sits 8dp from the right edge instead of 16dp (compact segmented control). */
  trailingInset?: boolean;
}

/**
 * THE list row (docs/style-guide.md "Felder und Flächen"): every row with a function at the end
 * (switch, chevron, value, segmented control, icon button) is a ListRow. Exactly CONTROL_HEIGHT
 * high (`h-14`), own opaque field fill + border (unless `grouped`: inside a SettingsGroup card, divider only), content vertically centred, label on ONE line
 * with ellipsis (a long label never grows the row). Trailing elements must fit inside 56dp.
 */
export function ListRow({
  label,
  icon,
  value,
  valueTestID,
  trailing,
  chevron,
  onPress,
  testID,
  danger,
  disabled,
  accessibilityRole,
  accessibilityState,
  className,
  grouped: groupedProp,
  isLast: isLastProp,
  trailingInset,
}: ListRowProps) {
  const { colors } = useGroupTheme();
  const groupCtx = useContext(GroupedRowsContext);
  const grouped = groupedProp ?? !!groupCtx;
  const isLast = isLastProp ?? groupCtx?.isLast ?? false;
  const rowClass = cn(
    `${CONTROL_HEIGHT_CLASSNAME} flex-row items-center gap-3 pl-4`,
    trailingInset ? "pr-2" : "pr-4",
    grouped ? (isLast ? "" : "border-b border-surface-border") : SURFACE_TILE_CLASSNAME,
    danger && `bg-btn-danger ${DANGER_PRESSED_CLASSNAME}`,
    disabled && "opacity-50",
    className,
  );
  const content = (pressed: boolean) => (
    <>
      {icon ? <Icon name={icon} size="M" color={danger ? DANGER_ICON_COLOR : PLACEHOLDER_COLOR} /> : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        className={cn(value ? "shrink" : "flex-1", "text-base", danger ? DANGER_TEXT_CLASSNAME : "text-text-primary")}
      >
        {label}
      </Text>
      {value ? (
        <Text testID={valueTestID} numberOfLines={1} className="flex-1 text-right text-sm text-text-secondary">
          {value}
        </Text>
      ) : null}
      {trailing ? (
        <View className="shrink-0 flex-row items-center">
          {typeof trailing === "function" ? trailing(pressed) : trailing}
        </View>
      ) : null}
      {chevron ? (
        <Icon
          testID={testID ? `${testID}-chevron` : undefined}
          name="chevronRight"
          size="S"
          color={danger ? DANGER_ICON_COLOR : colors.accent}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} className={rowClass}>
        {content(false)}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole ?? "button"}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      className={rowClass}
    >
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}
