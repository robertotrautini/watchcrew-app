import type { PressableProps } from "react-native";

import {
  BUTTON_ICON_COLORS,
  BUTTON_ICON_COLOR_DISABLED,
  Button,
  type ButtonVariant,
} from "@/components/ui/Button";
import { Icon, type IconRole } from "@/components/ui/Icon";

/**
 * neutral = glass fill (secondary), accent = group accent fill, danger = red tint (destructive),
 * ghost = no fill/border (toast/header chrome), overlay = dark scrim for use on top of images/video.
 */
type IconButtonVariant = "neutral" | "accent" | "danger" | "ghost" | "overlay";

export interface IconButtonProps
  extends Omit<PressableProps, "children" | "disabled" | "style" | "accessibilityLabel"> {
  /** Semantic icon ROLE (central `Icon` roles); same action = same role everywhere. */
  icon: IconRole;
  variant?: IconButtonVariant;
  /** Visual diameter in dp. Default 48 (Material touch target); 44 = iOS minimum. */
  size?: 48 | 44;
  /** Required: icon-only controls have no text. */
  accessibilityLabel: string;
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Placement/margin classes only (e.g. `absolute left-1 top-1`). */
  className?: string;
  /** Override of the variant icon colour (toast variants only). */
  iconColor?: string;
}

const BUTTON_VARIANT: Record<IconButtonVariant, ButtonVariant> = {
  neutral: "secondary",
  accent: "primary",
  danger: "danger",
  ghost: "ghost",
  overlay: "ghost",
};

const OVERLAY_CLASSNAME = "bg-black/55 active:bg-black/70";

/**
 * THE icon-only action button (docs/style-guide.md "Icon-Buttons"): round, 48dp, one icon size
 * (token `M`), colour by variant and disabled state. Use this for every action without text.
 */
export function IconButton({
  icon,
  variant = "neutral",
  size = 48,
  className,
  iconColor,
  disabled = false,
  testID,
  ...rest
}: IconButtonProps) {
  const buttonVariant = BUTTON_VARIANT[variant];
  const color = disabled
    ? BUTTON_ICON_COLOR_DISABLED
    : (iconColor ?? BUTTON_ICON_COLORS[buttonVariant]);
  return (
    <Button
      {...rest}
      testID={testID}
      iconOnly
      size={size === 48 ? "default" : "sm"}
      variant={buttonVariant}
      disabled={disabled}
      className={variant === "overlay" ? `${OVERLAY_CLASSNAME} ${className ?? ""}`.trim() : className}
    >
      <Icon testID={testID ? `${testID}-icon` : undefined} name={icon} size="M" color={color} />
    </Button>
  );
}
