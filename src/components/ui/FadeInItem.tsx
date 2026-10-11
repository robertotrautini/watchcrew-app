import { useContext, useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { TabSwitchContext } from "@/components/tabSwitchContext";
import {
  FADE_MAX_INDEX,
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
 * - The `index` is read once at mount; later changes (re-sort) are ignored.
 * - Items with `index > FADE_MAX_INDEX` (beyond the first screen, or mounted
 *   while scrolling a virtualized list) are plain views: no fade, no
 *   TabSwitchContext subscription (no re-render and no animation on tab switch).
 */
export interface FadeInItemProps {
  /** This item's position in the list -- feeds the stagger delay. */
  index: number;
  children: React.ReactNode;
  className?: string;
  testID?: string;
  /** Tab route name this list lives in; enables the replay on tab switch. */
  replayTab?: string;
  /** Mount fully visible (no initial fade), e.g. after a sort-triggered list remount. Tab replay still works. */
  skipInitialFade?: boolean;
}

export function FadeInItem(props: FadeInItemProps) {
  // Frozen at first mount: re-sorting changes `index` but must neither swap the
  // component type (remount) nor replay the fade.
  const [initialIndex] = useState(props.index);
  if (initialIndex > FADE_MAX_INDEX) {
    return (
      <View testID={props.testID} className={props.className}>
        {props.children}
      </View>
    );
  }
  return <FadingItem {...props} index={initialIndex} />;
}

function FadingItem({ index, children, className, testID, replayTab, skipInitialFade }: FadeInItemProps) {
  const reduceMotion = useReducedMotion();
  const { tab, epoch } = useContext(TabSwitchContext);
  const [opacity] = useState(() => new Animated.Value(reduceMotion || skipInitialFade ? 1 : 0));
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
    if (!reduceMotion && !skipInitialFade) play();
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
