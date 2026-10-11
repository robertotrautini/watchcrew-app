import { type GestureResponderEvent, type ViewProps } from "react-native";

import { Surface } from "@/components/ui/Surface";

/**
 * Base themed classes for the Card container, per docs/planning-report.html
 * design tokens (see tailwind.config.js for the actual values):
 *  - `bg-card`   -> semi-transparent dark background (translucent look).
 *    `bg-surface` (heavier .7 opacity) is intentionally NOT used here — that
 *    token reads as intended for overlay-ish surfaces (sheets/modals), while
 *    `bg-card` is the token literally named for card-shaped containers.
 *  - `rounded-xl` -> 16px, the largest non-circular step on the border-radius
 *    scale (sm/DEFAULT/md/lg/xl/full) — a reasonable "card" radius, one step
 *    up from the `lg` (12px) commonly used for buttons/inputs.
 *  - `border border-surface-border` -> subtle 1px white ~8% hairline border
 *    (Design-Angleichung Welle 1; shared with Surface.tsx).
 *  - no shadow, no highlight edge: flat Material look (docs/style-guide.md).
 */

export interface CardProps extends ViewProps {
  /**
   * Optional press handler. When provided, Card renders as a Pressable with
   * identical visual styling — for tappable cards like a movie poster card.
   * When omitted, Card renders as a plain, non-interactive View.
   */
  onPress?: (event: GestureResponderEvent) => void;
}

/**
 * Themed Card container (React Native Reusables / shadcn-style copied-in
 * component, per ADR 0007). Styling is applied exclusively via NativeWind
 * `className` — no inline styles/StyleSheet, per project convention.
 */
export function Card({
  className,
  onPress,
  children,
  testID,
  ...rest
}: CardProps) {
  return (
    <Surface className={className} onPress={onPress} testID={testID} {...rest}>
      {children}
    </Surface>
  );
}
