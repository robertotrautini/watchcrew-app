import { useRouter, useSegments } from "expo-router";
import { useCallback, useMemo, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { Easing, runOnJS, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

import { useParallaxValues } from "@/components/parallaxContext";
import { swipeTabProgress, tabIndexOf, TAB_PAN_DURATION_MS } from "@/lib/parallax";
import {
  getAdjacentTab,
  shouldCommitSwipe,
  SWIPE_ACTIVE_OFFSET_X,
  SWIPE_FAIL_OFFSET_Y,
} from "@/lib/tabSwipe";

/**
 * Wraps the tab navigator: a horizontal swipe left/right navigates to the
 * next/previous VISIBLE tab (no wrap-around). Vertical scrolling is never
 * blocked (pan fails on early vertical movement). No horizontal scroller
 * exists inside the tab screens; the horizontal cast row lives in the movie
 * detail modal route, outside this wrapper.
 */
export function TabSwipeView({ visibleTabs, children }: { visibleTabs: readonly string[]; children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const current = segments[segments.length - 1] ?? "";
  const parallax = useParallaxValues();
  const { width } = useWindowDimensions();
  const count = visibleTabs.length;
  const startIndex = tabIndexOf(current, visibleTabs) ?? 0;

  const snapBack = useCallback(() => {
    if (parallax) {
      parallax.tabProgress.value = withTiming(startIndex, {
        duration: TAB_PAN_DURATION_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
  }, [parallax, startIndex]);

  const commit = useCallback(
    (direction: "left" | "right") => {
      const target = getAdjacentTab(visibleTabs, current, direction);
      if (target) router.navigate(`/(app)/(tabs)/${target}` as never);
      else snapBack();
    },
    [visibleTabs, current, router, snapBack],
  );

  // Update/end run as worklets on the UI thread (live parallax follow without
  // JS-thread hops); only the commit/cancel decision hops to JS via runOnJS.
  const gesture = useMemo(() => {
    const progress = parallax?.tabProgress;
    return Gesture.Pan()
      .activeOffsetX([-SWIPE_ACTIVE_OFFSET_X, SWIPE_ACTIVE_OFFSET_X])
      .failOffsetY([-SWIPE_FAIL_OFFSET_Y, SWIPE_FAIL_OFFSET_Y])
      .onUpdate((e) => {
        "worklet";
        if (progress) progress.value = swipeTabProgress(startIndex, e.translationX, width, count);
      })
      .onEnd((e) => {
        "worklet";
        const direction = e.translationX < 0 ? "left" : "right";
        if (
          Math.abs(e.translationX) >= Math.abs(e.translationY) &&
          shouldCommitSwipe(e.translationX, e.velocityX, width, direction)
        ) {
          runOnJS(commit)(direction);
        } else {
          runOnJS(snapBack)();
        }
      });
  }, [parallax, width, count, startIndex, commit, snapBack]);

  return (
    <GestureHandlerRootView className="flex-1">
      <GestureDetector gesture={gesture}>
        <View className="flex-1">{children}</View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
