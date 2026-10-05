import { useContext, useEffect, useRef } from "react";
import { Animated } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { TabSwitchContext } from "@/components/tabSwitchContext";
import {
  computeStaggerDelayMs,
  ITEM_FADE_DURATION_MS,
  ITEM_FADE_EASING,
} from "@/lib/motion";

/**
 * Staggered fade-in for list entries (constants in `src/lib/motion.ts`).
 * - On mount: fades in once (view-mode switch remounts the list via `key`).
 * - Tab switch: with `replayTab` set, the fade replays when that tab becomes
 *   the active one (TabSwitchContext epoch bump) -- same duration, easing and
 *   per-index delay. Plain re-renders/refetches never replay.
 * - Reduce motion: no animation, item is shown at once.
 */
export interface FadeInItemProps {
  /** This item's position in the list -- feeds the stagger delay. */
  index: number;
  children: React.ReactNode;
  className?: string;
  testID?: string;
  /** Tab route name this list lives in; enables the replay on tab switch. */
  replayTab?: string;
}

export function FadeInItem({ index, children, className, testID, replayTab }: FadeInItemProps) {
  const reduceMotion = useReducedMotion();
  const { tab, epoch } = useContext(TabSwitchContext);
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const seenEpoch = useRef(epoch);

  function play() {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: ITEM_FADE_DURATION_MS,
      easing: ITEM_FADE_EASING,
      delay: computeStaggerDelayMs(index),
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    if (!reduceMotion) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (epoch === seenEpoch.current) return;
    seenEpoch.current = epoch;
    if (reduceMotion || !replayTab || tab !== replayTab) return;
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [epoch]);

  return (
    <Animated.View testID={testID} className={className} style={{ opacity }}>
      {children}
    </Animated.View>
  );
}
