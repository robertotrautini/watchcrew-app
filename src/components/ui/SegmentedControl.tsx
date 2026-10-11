import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { cn } from "@/lib/utils";

/** Outer pill radius (token `rounded-lg`). */
const SEGMENTED_OUTER_RADIUS = 12;
/** Border (1) + padding (3) around the segments. */
const SEGMENTED_INSET = 4;
/** Inner radius = outer radius - inset, so the selection follows the pill's curve. */
const SEGMENTED_INNER_RADIUS = SEGMENTED_OUTER_RADIUS - SEGMENTED_INSET;

const SEGMENT_HIT_SLOP = { top: 4, bottom: 4, left: 2, right: 2 };

const styles = StyleSheet.create({
  outer: { borderRadius: SEGMENTED_OUTER_RADIUS, overflow: "hidden" },
  segment: { borderRadius: SEGMENTED_INNER_RADIUS },
});

interface SegmentedOption<K extends string | number> {
  key: K;
  testID: string;
  accessibilityLabel: string;
  /** Segment content; `active` tells whether this segment is selected. */
  render: (active: boolean) => ReactNode;
}

export interface SegmentedControlProps<K extends string | number> {
  options: SegmentedOption<K>[];
  value: K;
  onChange: (key: K) => void;
  testID?: string;
  className?: string;
}

/**
 * Shared segmented switch: identical 40x40 cells in a glass pill. Radius and
 * fill of the selected cell are explicit style values (not a className that
 * flips with the selected state): on Android a runtime className swap
 * dropped the radius until the screen was re-entered. Fill = group accent.
 * Each segment `testID` is the Pressable; `<testID>-segment` is the filled cell.
 */
export function SegmentedControl<K extends string | number>({
  options,
  value,
  onChange,
  testID,
  className,
}: SegmentedControlProps<K>) {
  const { colors } = useGroupTheme();
  return (
    <View
      testID={testID}
      style={styles.outer}
      className={cn("h-12 flex-row items-center gap-1 border border-glass-border bg-black/35 p-[3px]", className)}
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <Pressable
            key={option.key}
            testID={option.testID}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            // identical 40x40 cells; hitSlop tops the touch box up to 44x48 without overlapping neighbours (gap 4)
            hitSlop={SEGMENT_HIT_SLOP}
            className="h-10 w-10 items-center justify-center"
          >
            <View
              testID={`${option.testID}-segment`}
              style={[styles.segment, { backgroundColor: active ? colors.accent : "transparent" }]}
              className="h-10 w-10 items-center justify-center"
            >
              {option.render(active)}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
