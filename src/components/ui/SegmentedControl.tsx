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
/** `row` size: 32dp cells, slop tops them up to 44dp. */
const SEGMENT_HIT_SLOP_ROW = { top: 6, bottom: 6, left: 2, right: 2 };
/** `row` track sits in a 56dp row with 8dp spacing; its own slop makes the track touch box 56dp. */
const TRACK_HIT_SLOP_ROW = { top: 8, bottom: 8, left: 0, right: 0 };

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
  /** `default`: 48dp track, 40x40 cells. `row`: 40dp track, 32x48 cells, for a 56dp ListRow (8dp to card edge all round, use with `trailingInset`). */
  size?: "default" | "row";
}

/**
 * Shared segmented switch: identical 40x40 cells in a surface pill. Radius and
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
  size = "default",
}: SegmentedControlProps<K>) {
  const row = size === "row";
  const { colors } = useGroupTheme();
  return (
    <View
      testID={testID}
      style={styles.outer}
      hitSlop={row ? TRACK_HIT_SLOP_ROW : undefined}
      className={cn(row ? "h-10" : "h-12", "flex-row items-center gap-1 border border-surface-border bg-field p-[3px]", className)}
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
            hitSlop={row ? SEGMENT_HIT_SLOP_ROW : SEGMENT_HIT_SLOP}
            className={cn(row ? "h-8 w-12" : "h-10 w-10", "items-center justify-center")}
          >
            <View
              testID={`${option.testID}-segment`}
              style={[styles.segment, { backgroundColor: active ? colors.accent : "transparent" }]}
              className={cn(row ? "h-8 w-12" : "h-10 w-10", "items-center justify-center")}
            >
              {option.render(active)}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
