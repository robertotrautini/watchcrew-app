import { MOVIE_TITLE_FONT } from "@/components/ui/movieTitle";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { useGroupTheme } from "@/components/GroupThemeProvider";
import { GlassBlur } from "@/components/ui/GlassBlur";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/**
 * Shared "table" look of the list views (Tracker, Watchlist "Liste",
 * Tagebuch "Liste"). The Tracker renders one `Glass` card around a plain
 * header + rows; virtualized lists (FlatList) cannot wrap all rows in one
 * surface, so header and every row are their own `GlassBlur` slice with the
 * same tint tokens, a shared side border and the same inner padding. Header
 * is the top slice (rounded top), the last row is the bottom slice (rounded
 * bottom), so the stack reads as one card.
 *
 * Cell classes below are the single source for column typography/widths.
 */
export const TABLE_HEADER_TEXT = "text-sm text-text-secondary";
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

const FILL = {
  fallbackClassName: "bg-bg-glass",
  blurClassName: "bg-bg-card-blur",
  /** Table slices only live in virtualized lists: no live BlurView per row. */
  cheap: true,
} as const;

export function GlassTableHeader({
  testID,
  children,
}: {
  testID?: string;
  children: ReactNode;
}) {
  return (
    <GlassBlur
      {...FILL}
      className="rounded-t-xl border-x border-t border-glass-border px-3 pt-3"
    >
      <View
        testID={testID}
        className="flex-row items-start border-b border-glass-border pb-3"
      >
        {children}
      </View>
    </GlassBlur>
  );
}

/** Direction of an active column sort; `null` = this column is not sorted. */
export type GlassTableSortState = "asc" | "desc" | null;

function sortStateLabel(label: string, sortState: GlassTableSortState): string {
  if (sortState === "asc") return `${label}, aufsteigend sortiert`;
  if (sortState === "desc") return `${label}, absteigend sortiert`;
  return label;
}

/**
 * Header cells are 24dp high (icon/text row). Idle, the header row is just that
 * (symmetric padding, content vertically centred). Only the ACTIVE cell grows to
 * 36dp (`h-9`) to hold the sort chevron below its icon/text; the row grows with
 * it, cells are top-aligned so nothing moves horizontally or vertically.
 * 10dp slop above/below gives a >= 44dp touch target without a taller row.
 */
const HEADER_HIT_SLOP = { top: 10, bottom: 10 } as const;
const HEADER_CELL = "h-6 justify-start";
const headerCellClass = (sortState: GlassTableSortState) =>
  cn(HEADER_CELL, sortState && "h-9");

const SORT_HINT = "Tippen zum Sortieren: aufsteigend, absteigend, aus";

/** Small chevron (14px, accent) of the active sortable header cell. */
function SortIndicator({
  testID,
  sortState,
}: {
  testID?: string;
  sortState: "asc" | "desc";
}) {
  const { colors } = useGroupTheme();
  return (
    <Icon
      testID={testID ? `${testID}-sort-${sortState}` : undefined}
      name={sortState === "asc" ? "sortAsc" : "sortDesc"}
      size="XS"
      color={colors.accent}
    />
  );
}

/** Chevron centred (or right aligned) in the strip below the 24dp content row. */
function SortChevronBelow({
  testID,
  sortState,
  side = "center",
}: {
  testID?: string;
  sortState: GlassTableSortState;
  side?: "center" | "end";
}) {
  if (!sortState) return null;
  return (
    <View
      pointerEvents="none"
      className={cn(
        "absolute inset-x-0 top-[22px]",
        side === "center" ? "items-center" : "items-end",
      )}
    >
      <SortIndicator testID={testID} sortState={sortState} />
    </View>
  );
}

/**
 * Header text cell. Plain `Text` unless `onPress` is given: then it is a
 * sortable button (`sortState` = this column's current direction or null) that
 * shows an arrow while active. `align` places the label + arrow in sortable cells.
 */
export function GlassTableHeaderCell({
  className,
  children,
  testID,
  onPress,
  sortState = null,
  accessibilityLabel,
  align = "start",
}: {
  className?: string;
  children: ReactNode;
  testID?: string;
  onPress?: () => void;
  sortState?: GlassTableSortState;
  accessibilityLabel?: string;
  align?: "start" | "end";
}) {
  if (!onPress) {
    return (
      <Text testID={testID} className={cn(TABLE_HEADER_TEXT, className)}>
        {children}
      </Text>
    );
  }
  const label = accessibilityLabel ?? (typeof children === "string" ? children : "");
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={sortStateLabel(label, sortState)}
      accessibilityHint={SORT_HINT}
      accessibilityState={{ selected: sortState != null }}
      onPress={onPress}
      hitSlop={HEADER_HIT_SLOP}
      className={cn(headerCellClass(sortState), className)}
    >
      <View
        className={cn(
          "h-6 flex-row items-center",
          align === "end" && "justify-end",
        )}
      >
        <Text className={TABLE_HEADER_TEXT}>{children}</Text>
        {align === "start" ? (
          // Fixed 14px slot, always reserved: the text never shifts.
          <View className="h-6 w-[14px] justify-center pl-px">
            {sortState ? (
              <SortIndicator testID={testID} sortState={sortState} />
            ) : null}
          </View>
        ) : null}
      </View>
      {align === "end" ? (
        <SortChevronBelow testID={testID} sortState={sortState} side="end" />
      ) : null}
    </Pressable>
  );
}

export function GlassTableRow({
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
    <GlassBlur
      {...FILL}
      className={cn(
        "border-x border-glass-border px-3",
        isLast && "rounded-b-xl border-b pb-1",
      )}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        onPress={onPress}
        className={cn(
          "flex-row items-center py-3",
          !isLast && "border-b border-glass-border",
        )}
      >
        {children}
      </Pressable>
    </GlassBlur>
  );
}

/**
 * Header cell showing an icon/logo instead of a text label. Sortable when
 * `onPress` is given (same contract as `GlassTableHeaderCell`).
 */
export function GlassTableHeaderIconCell({
  testID,
  label,
  className,
  children,
  onPress,
  sortState = null,
}: {
  testID?: string;
  label: string;
  className?: string;
  children: ReactNode;
  onPress?: () => void;
  sortState?: GlassTableSortState;
}) {
  if (!onPress) {
    return (
      <View
        testID={testID}
        accessible
        accessibilityLabel={label}
        className={cn("h-6 items-center justify-start", className)}
      >
        {children}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={sortStateLabel(label, sortState)}
      accessibilityHint={SORT_HINT}
      accessibilityState={{ selected: sortState != null }}
      onPress={onPress}
      hitSlop={HEADER_HIT_SLOP}
      className={cn(headerCellClass(sortState), "items-center", className)}
    >
      <View className="h-6 flex-row items-center justify-center">{children}</View>
      <SortChevronBelow testID={testID} sortState={sortState} />
    </Pressable>
  );
}
