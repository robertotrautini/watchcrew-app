import { MOVIE_TITLE_FONT } from "@/components/ui/movieTitle";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { SURFACE_FILL } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

/**
 * Shared "table" look of the list views (Tracker, Watchlist "Liste",
 * Tagebuch "Liste"). The Tracker renders one `Surface` card around a plain
 * header + rows; virtualized lists (FlatList) cannot wrap all rows in one
 * surface, so header and every row are their own slice with the same fill,
 * a shared side border and the same inner padding. Slices are SQUARE (no
 * default Surface rounding): header rounds the top, the last row the bottom,
 * so the stack reads as one card with thin straight row dividers.
 *
 * Cell classes below are the single source for column typography/widths.
 */
const TABLE_HEADER_TEXT = "text-sm text-text-secondary";
/** Title cell (flex column, two lines max); accent title like sheets/cards. */
export const TABLE_TITLE_CELL = `flex-1 pr-2 ${MOVIE_TITLE_FONT} text-text-primary`;
/** Date column (right aligned), identical to the Tracker "Datum" column. */
export const TABLE_DATE_CELL = "w-28 text-right text-text-secondary";
/**
 * Fixed-width centred columns. Header cell AND data cell of a column use the
 * same constant, so icon and values are centred over each other.
 */
export const TABLE_ICON_CELL = "w-12 items-center";
/** TMDB score column (logo 36px centred). */
export const TABLE_SCORE_CELL = "w-16 text-center text-text-secondary";
/** Emphasised average-rating column. */
export const TABLE_SCORE_STRONG_CELL = "w-12 text-center font-sans-semibold text-text-primary";

/** Shared by header + row slices: flat fill, side border, inner padding. */
const SLICE = `overflow-hidden border-x border-surface-border px-3 ${SURFACE_FILL}`;

/** Static header row (top slice, rounded top); sorting lives in the panel. */
export function DataTableHeader({
  testID,
  children,
}: {
  testID?: string;
  children: ReactNode;
}) {
  return (
    <View className={cn(SLICE, "rounded-t-xl border-t pt-3")}>
      <View
        testID={testID}
        className="flex-row items-center border-b border-surface-border pb-3"
      >
        {children}
      </View>
    </View>
  );
}

/** Plain header text cell. */
export function DataTableHeaderCell({
  className,
  children,
  testID,
}: {
  className?: string;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <Text testID={testID} className={cn(TABLE_HEADER_TEXT, className)}>
      {children}
    </Text>
  );
}

/**
 * Table row slice. Square corners (one container look); only the last row
 * rounds its bottom corners and closes the bottom border.
 */
export function DataTableRow({
  testID,
  isLast,
  onPress,
  children,
}: {
  testID?: string;
  isLast: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <View className={cn(SLICE, isLast && "rounded-b-xl border-b pb-1")}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        className={cn(
          "flex-row items-center py-3",
          !isLast && "border-b border-surface-border",
        )}
      >
        {children}
      </Pressable>
    </View>
  );
}

/** Header cell showing an icon/logo instead of a text label (static). */
export function DataTableHeaderIconCell({
  testID,
  label,
  className,
  children,
}: {
  testID?: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={label}
      className={cn("h-5 items-center justify-center", className)}
    >
      {children}
    </View>
  );
}
