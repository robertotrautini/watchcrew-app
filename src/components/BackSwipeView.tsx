import { useMemo, type ReactNode } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

import { useSafeBack } from "@/hooks/useSafeBack";
import {
  BACK_SWIPE_ACTIVE_OFFSET_X,
  BACK_SWIPE_FAIL_OFFSET_Y,
  backSwipeZoneWidth,
  shouldCommitBackSwipe,
} from "@/lib/backSwipe";

export const BACK_SWIPE_GESTURE_TEST_ID = "back-swipe-gesture";

/**
 * Android: left-to-right swipe from the left part of a stack screen pops one
 * level (same as the header back arrow). Complements the system edge gesture,
 * which only starts at the very screen edge. Vertical scrolling is never
 * blocked (pan fails on early vertical movement). iOS/web render children
 * unchanged (iOS has native `fullScreenGestureEnabled`).
 */
export function BackSwipeView({ children }: { children: ReactNode }) {
  const goBack = useSafeBack();
  const { width } = useWindowDimensions();

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(BACK_SWIPE_GESTURE_TEST_ID)
        .hitSlop({ left: 0, width: backSwipeZoneWidth(width) })
        .activeOffsetX(BACK_SWIPE_ACTIVE_OFFSET_X)
        .failOffsetX(-BACK_SWIPE_ACTIVE_OFFSET_X)
        .failOffsetY([-BACK_SWIPE_FAIL_OFFSET_Y, BACK_SWIPE_FAIL_OFFSET_Y])
        .onEnd((e) => {
          "worklet";
          if (shouldCommitBackSwipe(e.translationX, e.translationY, e.velocityX, width)) {
            runOnJS(goBack)();
          }
        }),
    [width, goBack],
  );

  if (Platform.OS !== "android") return <>{children}</>;

  return (
    <GestureHandlerRootView className="flex-1">
      <GestureDetector gesture={gesture}>
        <View className="flex-1">{children}</View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}
