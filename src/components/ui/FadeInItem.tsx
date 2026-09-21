import { useEffect, useRef } from "react";
import { Animated } from "react-native";

import { computeStaggerDelayMs } from "@/lib/staggerAnimation";

/**
 * M11 (animation polish, see docs/interim-decisions.md "M11 — Animation"):
 * a subtle, staggered fade-in for newly-loaded list entries, used by
 * MovieGrid, Watchlist's grid/card list, and Tagebuch's grid/card list (per
 * this task's brief -- a "contained scope" addition, not a general-purpose
 * list-animation system). Entrance-only, matching Toast.tsx's own
 * documented "fade-in only" trade-off -- these are plain `FlatList`/
 * `ScrollView` rows, not modals, so there's no equivalent "dismiss" moment
 * to animate.
 *
 * Runs its animation once per mount only (empty effect deps) -- a list
 * item is expected to mount once when it first appears and then update
 * in place (e.g. a rating changing) without re-mounting, so this does not
 * re-fade an item on every unrelated re-render.
 */
const FADE_DURATION_MS = 220;

export interface FadeInItemProps {
  /** This item's position in the list -- feeds the stagger delay (see `computeStaggerDelayMs`). */
  index: number;
  children: React.ReactNode;
  className?: string;
  testID?: string;
}

export function FadeInItem({ index, children, className, testID }: FadeInItemProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      delay: computeStaggerDelayMs(index),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View testID={testID} className={className} style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
