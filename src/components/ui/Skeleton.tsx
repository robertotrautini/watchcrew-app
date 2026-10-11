import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/Text";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import {
  SKELETON_MAX_OPACITY,
  SKELETON_MIN_OPACITY,
  SKELETON_PULSE_MS,
} from "@/lib/motion";

/**
 * Pulsing placeholder block (Reanimated opacity loop on the UI thread).
 * Size/shape come from `className` (e.g. `h-4 w-40 rounded-md`), so the block
 * can mimic the final content and avoid layout jumps. Reduce-motion: static.
 */
export interface SkeletonProps {
  className?: string;
  testID?: string;
}

export function Skeleton({ className = "", testID }: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(SKELETON_MAX_OPACITY);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = SKELETON_MAX_OPACITY;
      return;
    }
    opacity.value = withRepeat(
      withSequence(
        withTiming(SKELETON_MIN_OPACITY, { duration: SKELETON_PULSE_MS }),
        withTiming(SKELETON_MAX_OPACITY, { duration: SKELETON_PULSE_MS }),
      ),
      -1,
    );
  }, [reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Geometry/colour live on plain Views (className always applies); the
  // Reanimated layer only animates opacity with StyleSheet geometry, because
  // className on Animated views can collapse in release builds (see AppBackground).
  return (
    <View testID={testID} className={`overflow-hidden ${className}`}>
      <Animated.View style={[styles.fill, animatedStyle]}>
        <View className="flex-1 bg-white/10" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: StyleSheet.absoluteFill,
});

export interface SkeletonTextProps {
  /**
   * The SAME text classes the real content uses (size, font, e.g.
   * `text-sm`, `font-title text-2xl`). An invisible Text with these classes
   * sets each line's height, so the skeleton always has the real line height
   * (incl. font changes) and nothing jumps when the data arrives.
   */
  textClassName: string;
  /** Number of lines to reserve (last line is shorter when > 1). */
  lines?: number;
  /** Width class of the visible bar (full lines), default `w-full`. */
  widthClassName?: string;
  className?: string;
  testID?: string;
}

/** Skeleton for text: one block per line with exactly the real line height. */
export function SkeletonText({
  textClassName,
  lines = 1,
  widthClassName = "w-full",
  className = "",
  testID,
}: SkeletonTextProps) {
  return (
    <View testID={testID} className={className}>
      {Array.from({ length: lines }, (_, index) => (
        <View key={index} className="relative">
          <Text className={`opacity-0 ${textClassName}`} accessibilityElementsHidden>
            {" "}
          </Text>
          <Skeleton
            testID={testID ? `${testID}-line-${index}` : undefined}
            className={`absolute inset-y-[15%] left-0 rounded-md ${
              index === lines - 1 && lines > 1 ? "w-3/5" : widthClassName
            }`}
          />
        </View>
      ))}
    </View>
  );
}
