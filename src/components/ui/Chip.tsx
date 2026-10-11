import { Pressable, View, type PressableProps, type ViewProps } from "react-native";
import { Text } from "@/components/ui/Text";

import { hitSlopFor } from "@/components/ui/touchTarget";
import { cn } from "@/lib/utils";

/**
 * ONE chip/pill style for the whole app (genre tags, filter/category chips,
 * mode chips, selection chips). See docs/interim-decisions.md "Einheitliche
 * Chips". Rounded box (12px, not an oval), 36px high:
 *  - inactive: opaque accent-tinted fill (`accent-soft` = accent 15% over field, precomputed per theme),
 *    1px accent border (55%), accent-light medium text.
 *  - active: solid accent fill, dark text.
 * Tokens are exported so bespoke layouts (provider picker with a logo) can reuse
 * the exact same colours.
 */
/** Chip height token. */
const CHIP_HEIGHT_CLASSNAME = "h-9";
const CHIP_BASE_CLASSNAME = `${CHIP_HEIGHT_CLASSNAME} flex-row items-center justify-center gap-2 rounded-lg border px-3`;
export const CHIP_INACTIVE_CLASSNAME = "border-accent-a55 bg-accent-soft";
export const CHIP_ACTIVE_CLASSNAME = "border-accent bg-accent";
const CHIP_HIT_SLOP = hitSlopFor(48, 36);
const CHIP_TEXT_CLASSNAME = "text-sm";
const CHIP_INACTIVE_TEXT_CLASSNAME = "font-sans-medium text-accent-light";
const CHIP_ACTIVE_TEXT_CLASSNAME = "font-sans-semibold text-bg-primary";

export function chipClassName(active: boolean, className?: string): string {
  return cn(CHIP_BASE_CLASSNAME, active ? CHIP_ACTIVE_CLASSNAME : CHIP_INACTIVE_CLASSNAME, className);
}

export function chipTextClassName(active: boolean, className?: string): string {
  return cn(CHIP_TEXT_CLASSNAME, active ? CHIP_ACTIVE_TEXT_CLASSNAME : CHIP_INACTIVE_TEXT_CLASSNAME, className);
}

export interface ChipProps extends Omit<PressableProps, "children"> {
  label: string;
  active?: boolean;
  className?: string;
  textClassName?: string;
}

/** Pressable chip (filters, modes, selections). */
export function Chip({ label, active = false, className, textClassName, accessibilityState, ...rest }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, ...accessibilityState }}
      className={chipClassName(active, className)}
      // 36dp chip -> 48dp touch target (vertical only; width is content-driven)
      hitSlop={CHIP_HIT_SLOP}
      {...rest}
    >
      <Text className={chipTextClassName(active, textClassName)}>{label}</Text>
    </Pressable>
  );
}

export interface ChipTagProps extends ViewProps {
  label: string;
  className?: string;
}

/** Non-interactive chip (genre tags). */
export function ChipTag({ label, className, ...rest }: ChipTagProps) {
  return (
    <View className={chipClassName(false, className)} {...rest}>
      <Text className={chipTextClassName(false)}>{label}</Text>
    </View>
  );
}
