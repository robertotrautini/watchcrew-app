import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "default" | "sm";

export interface ButtonProps extends Omit<PressableProps, "children" | "disabled" | "style"> {
  /** Visual style. Defaults to `"primary"` (the active group theme's accent color). */
  variant?: ButtonVariant;
  /**
   * Height/padding step. `"default"` uses the 48px "comfortable" touch
   * target, `"sm"` uses the 44px minimum (see tailwind.config.js spacing
   * tokens `touch-comfortable` / `touch-min`).
   */
  size?: ButtonSize;
  /**
   * Simple text label. Ignored if `children` is also given — `children`
   * takes precedence so callers can render custom content (e.g. an icon +
   * text row) when they need something beyond plain text.
   */
  label?: string;
  children?: ReactNode;
  disabled?: boolean;
  /** Shows an ActivityIndicator in place of the label/children and disables interaction. */
  loading?: boolean;
  /** Extra classes merged onto the pressable's own className (via `cn`), e.g. to add margin. */
  className?: string;
  /** Extra classes merged onto the label Text's className. Has no effect when using `children`. */
  textClassName?: string;
}

const VARIANT_CONTAINER_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent",
  secondary: "bg-card border border-border-subtle",
  danger: "bg-danger",
};

const VARIANT_TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: "text-bg-primary",
  secondary: "text-text-primary",
  danger: "text-text-primary",
};

const SIZE_CONTAINER_CLASSES: Record<ButtonSize, string> = {
  // 48px / 44px touch targets, per docs/planning-report.html's "6/8/10-12/16/50%"
  // radius scale note and the design tokens' 44-48px touch-target minimum.
  default: "min-h-touch-comfortable px-4",
  sm: "min-h-touch-min px-3",
};

/**
 * Base themed Button, following the RN Reusables (shadcn/ui-style)
 * convention: a `Pressable` wrapper, variant/size lookup tables, and a
 * `className` prop merged in via `cn()` so callers can override/extend
 * styling without fighting specificity.
 *
 * Border-radius uses the `lg` (12px) token — the design tokens' scale is
 * 6/8/10-12/16px by element size, and 12px reads as the right step for a
 * mid-sized tappable control like a button (as opposed to e.g. a small chip
 * at 6-8px or a card at 16px). This is an implementation-detail call made
 * per the task's authorization to decide non-business-rule specifics.
 *
 * Colors resolve via the `accent` / `bg-card` / `border-subtle` / `danger`
 * Tailwind tokens (tailwind.config.js), so `variant="primary"` automatically
 * matches whichever `.theme-*` class (src/global.css) is active on an
 * ancestor GroupThemeProvider — no group-theme-specific logic needed here.
 */
export function Button({
  variant = "primary",
  size = "default",
  label,
  children,
  disabled = false,
  loading = false,
  className,
  textClassName,
  onPress,
  testID,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerClassName = cn(
    "flex-row items-center justify-center rounded-lg",
    VARIANT_CONTAINER_CLASSES[variant],
    SIZE_CONTAINER_CLASSES[size],
    isDisabled && "opacity-50",
    className,
  );

  const labelClassName = cn("text-base font-semibold", VARIANT_TEXT_CLASSES[variant], textClassName);

  const handlePress: PressableProps["onPress"] = (event) => {
    if (isDisabled) {
      return;
    }
    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={handlePress}
      className={containerClassName}
      testID={testID}
      {...rest}>
      {loading ? (
        <ActivityIndicator testID={testID ? `${testID}-loading-indicator` : undefined} />
      ) : (
        children ?? <Text className={labelClassName}>{label}</Text>
      )}
    </Pressable>
  );
}
