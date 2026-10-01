import {
  Pressable,
  View,
  type GestureResponderEvent,
  type ViewProps,
} from "react-native";

import { GLASS_CLASSNAMES } from "@/components/ui/Glass";

/**
 * Base themed classes for the Card container, per docs/planning-report.html
 * design tokens (see tailwind.config.js for the actual values):
 *  - `bg-card`   -> semi-transparent dark background (glassmorphism look).
 *    `bg-glass` (heavier .7 opacity) is intentionally NOT used here — that
 *    token reads as intended for overlay-ish surfaces (sheets/modals), while
 *    `bg-card` is the token literally named for card-shaped containers.
 *  - `rounded-xl` -> 16px, the largest non-circular step on the border-radius
 *    scale (sm/DEFAULT/md/lg/xl/full) — a reasonable "card" radius, one step
 *    up from the `lg` (12px) commonly used for buttons/inputs.
 *  - `border border-glass-border` -> subtle 1px white ~8% hairline border
 *    (Design-Angleichung Welle 1; shared with Glass.tsx).
 *  - `shadow-card` -> the exact `0 4px 20px rgba(0,0,0,.3)` card-shadow token
 *    already defined in tailwind.config.js's boxShadow extension.
 */
const CARD_BASE_CLASSNAME = GLASS_CLASSNAMES.default;

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
export function Card({ className, onPress, children, testID, ...rest }: CardProps) {
  const mergedClassName = className ? `${CARD_BASE_CLASSNAME} ${className}` : CARD_BASE_CLASSNAME;

  if (onPress) {
    return (
      <Pressable className={mergedClassName} onPress={onPress} testID={testID} {...rest}>
        {children}
      </Pressable>
    );
  }

  return (
    <View className={mergedClassName} testID={testID} {...rest}>
      {children}
    </View>
  );
}
