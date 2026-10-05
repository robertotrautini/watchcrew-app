import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from "react-native";

import { Icon, type IconRole } from "@/components/ui/Icon";
import { hitSlopFor } from "@/components/ui/touchTarget";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "sm" | "xs";

export interface ButtonProps extends Omit<
  PressableProps,
  "children" | "disabled" | "style"
> {
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
  /**
   * Leading icon ROLE (central `Icon` roles) shown before `label`. Colour follows the variant
   * (muted when disabled), size follows `size` (S for xs, M otherwise). Every labelled action
   * Button has one (docs/style-guide.md "Button-Icons"; enforced by __tests__/components/ui/buttonIcons.test.ts).
   */
  icon?: IconRole;
  disabled?: boolean;
  /** Shows an ActivityIndicator in place of the label/children and disables interaction. */
  loading?: boolean;
  /**
   * Icon-only circular button: exact square (48px default / 44px sm / 36px xs), `rounded-full`,
   * no padding. Pass the icon as `children` and an `accessibilityLabel`.
   */
  iconOnly?: boolean;
  /** Extra classes merged onto the pressable's own className (via `cn`), e.g. to add margin. */
  className?: string;
  /** Extra classes merged onto the label Text's className. Has no effect when using `children`. */
  textClassName?: string;
}

/**
 * Shared danger tokens (docs/style-guide.md "Danger"): ONE red look for every
 * destructive control (button, list row, icon button, action tile): faint red
 * fill + 1px red 30% border + `danger-text` label/icon. Reused by
 * SettingsRow (danger) and MovieDetailActionsBar.
 */
export const DANGER_SURFACE_CLASSNAME = "bg-danger/15 border border-danger/30";
export const DANGER_PRESSED_CLASSNAME = "active:bg-danger/25";
export const DANGER_TEXT_CLASSNAME = "text-danger-text";
export const DANGER_ICON_COLOR = "#e5675a";

/**
 * ONE button system for glass surfaces (docs/style-guide.md). Flat Material
 * look: no 3D edge, no highlight; every variant has the same single 1px border
 * (transparent where it should not show):
 *  - primary: accent (gold) fill, dark text. The one main action per screen.
 *  - secondary: neutral glass, white 10% fill, flat `glass-border`, light text.
 *  - ghost: no fill/border, text/icon only.
 *  - danger: shared danger tokens (red tint, red text), all destructive actions.
 * Disabled uses dedicated muted classes (no opacity on gold -> no muddy brown).
 */
const VARIANT_CONTAINER_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-accent border border-transparent active:bg-accent-light",
  secondary: "bg-white/10 border border-glass-border active:bg-white/20",
  ghost: "bg-transparent border border-transparent active:bg-white/10",
  danger: `${DANGER_SURFACE_CLASSNAME} ${DANGER_PRESSED_CLASSNAME}`,
};

const VARIANT_DISABLED_CONTAINER_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-white/10 border border-glass-border",
  secondary: "bg-white/5 border border-glass-border",
  ghost: "bg-transparent border border-transparent",
  danger: "bg-white/5 border border-glass-border",
};

const VARIANT_TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: "text-bg-primary",
  secondary: "text-text-primary",
  ghost: "text-text-primary",
  danger: DANGER_TEXT_CLASSNAME,
};

const DISABLED_TEXT_CLASS = "text-white/35";

const SIZE_CONTAINER_CLASSES: Record<ButtonSize, string> = {
  // 48px / 44px touch targets (tailwind.config.js spacing tokens).
  default: "min-h-touch-comfortable px-4",
  sm: "min-h-touch-min px-3",
  // Compact chip/pill (filter chips, inline edit buttons): 36px, md radius.
  xs: "h-9 rounded-md px-3",
};

// Exact squares (no min-h-*: twMerge does not replace custom-token min-h).
const ICON_ONLY_SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "h-12 w-12 shrink-0 rounded-full p-0",
  sm: "h-11 w-11 shrink-0 rounded-full p-0",
  xs: "h-9 w-9 shrink-0 rounded-full p-0",
};

// Visual heights/sizes (px) of the size steps; hitSlop tops them up to 48 (touchTarget.ts).
const BUTTON_SIZE_PX: Record<ButtonSize, number> = {
  default: 48,
  sm: 44,
  xs: 36,
};

/**
 * Default hitSlop so every button reaches the 48dp touch target without changing its visuals:
 * icon-only buttons grow on both axes, text buttons only vertically (their width is content-driven).
 */
export function buttonHitSlop(size: ButtonSize, iconOnly: boolean) {
  const px = BUTTON_SIZE_PX[size];
  return hitSlopFor(iconOnly ? px : 48, px);
}

/** Icon colour matching a variant (for Icon children). */
export const BUTTON_ICON_COLORS: Record<ButtonVariant, string> = {
  primary: "#0a0a0a",
  secondary: "#e8e8e8",
  ghost: "#e8e8e8",
  danger: DANGER_ICON_COLOR,
};
export const BUTTON_ICON_COLOR_DISABLED = "rgba(255,255,255,0.35)";

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
  icon,
  disabled = false,
  loading = false,
  iconOnly = false,
  className,
  textClassName,
  onPress,
  testID,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  // Loading keeps the normal look (spinner); only `disabled` is muted.
  const isMuted = disabled;

  const containerClassName = cn(
    "flex-row items-center justify-center gap-2 rounded-lg",
    isMuted
      ? VARIANT_DISABLED_CONTAINER_CLASSES[variant]
      : VARIANT_CONTAINER_CLASSES[variant],
    iconOnly ? ICON_ONLY_SIZE_CLASSES[size] : SIZE_CONTAINER_CLASSES[size],
    className,
  );

  const labelClassName = cn(
    size === "xs" ? "text-sm" : "text-base",
    variant === "primary" ? "font-semibold" : "font-medium",
    isMuted ? DISABLED_TEXT_CLASS : VARIANT_TEXT_CLASSES[variant],
    textClassName,
  );

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
      hitSlop={buttonHitSlop(size, iconOnly)}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          testID={testID ? `${testID}-loading-indicator` : undefined}
          color={BUTTON_ICON_COLORS[variant]}
        />
      ) : (
        (children ?? (
          <>
            {icon ? (
              <Icon
                testID={testID ? `${testID}-icon` : undefined}
                name={icon}
                size={size === "xs" ? "S" : "M"}
                color={
                  isMuted
                    ? BUTTON_ICON_COLOR_DISABLED
                    : BUTTON_ICON_COLORS[variant]
                }
              />
            ) : null}
            <Text className={labelClassName}>{label}</Text>
          </>
        ))
      )}
    </Pressable>
  );
}
