import { memo } from "react";
import { useParallaxScroll } from "@/components/parallaxContext";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { FadeInItem } from "@/components/ui/FadeInItem";
import {
  GlassTableHeader,
  GlassTableHeaderCell,
  GlassTableRow,
  TABLE_DATE_CELL,
  TABLE_TITLE_CELL,
} from "@/components/ui/GlassTable";
import type { ColumnSortState, WatchlistColumn } from "@/lib/columnSort";
import { formatPlainDate } from "@/lib/dateFormat";
import {
  isGridPlaceholder,
  padToFullRows,
  type GridPlaceholder,
} from "@/lib/gridPadding";
import {
  getEffectiveReleaseDate,
  withEffectiveReleaseDate,
} from "@/lib/watchlistLogic";
import type {
  StreamingAvailabilityLookup,
  WatchlistEntry,
} from "@/lib/watchlistTypes";
import type { WatchlistViewMode } from "@/stores/usePreferencesStore";

function ratedCountFor(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.rating != null && r.rating > 0).length;
}

/**
 * Virtualization tuning shared by all modes (counts are rows, not items).
 * Middle ground (9/6/30 ms): 7/5/clipped blanked on fast flings, 11/8/25 was
 * too heavy. Cards/rows use the cheap glass (no BlurView per item), which is
 * what makes a wider window affordable; clipping stays off (blanks on Android).
 * See docs/performance-scroll-analysis.md "Nachtrag 2".
 */
const VIRTUALIZATION = {
  windowSize: 9,
  maxToRenderPerBatch: 6,
  updateCellsBatchingPeriod: 30,
  removeClippedSubviews: false,
} as const;

/**
 * Row components are memoized and take stable props (entry object, shared
 * lookup, stable `onOpenEntry`), so a parent re-render (typing, filter panel)
 * does not re-render every mounted row and `withEffectiveReleaseDate` is not
 * rebuilt per list render.
 */
const WatchlistListRow = memo(function WatchlistListRow({
  item,
  isLast,
  onOpenEntry,
}: {
  item: WatchlistEntry;
  isLast: boolean;
  onOpenEntry: (entry: WatchlistEntry) => void;
}) {
  return (
    <GlassTableRow
      testID={`watchlist-list-row-${item.id}`}
      isLast={isLast}
      onPress={() => onOpenEntry(item)}
    >
      <Text numberOfLines={1} ellipsizeMode="tail" className={TABLE_TITLE_CELL}>
        {item.movie.name}
      </Text>
      <Text numberOfLines={1} className={TABLE_DATE_CELL}>
        {formatPlainDate(getEffectiveReleaseDate(item), "Kein Datum")}
      </Text>
    </GlassTableRow>
  );
});

function WatchlistListHeader({
  columnSort,
  onSortColumn,
}: {
  columnSort: ColumnSortState<WatchlistColumn> | null;
  onSortColumn: (column: WatchlistColumn) => void;
}) {
  const stateOf = (column: WatchlistColumn) =>
    columnSort?.column === column ? columnSort.direction : null;
  return (
    <GlassTableHeader testID="watchlist-table-header">
      <GlassTableHeaderCell
        testID="watchlist-table-header-title"
        className="flex-1"
        accessibilityLabel="Film"
        sortState={stateOf("title")}
        onPress={() => onSortColumn("title")}
      >
        Film
      </GlassTableHeaderCell>
      <GlassTableHeaderCell
        testID="watchlist-table-header-release"
        className="w-28"
        align="end"
        accessibilityLabel="Erscheint"
        sortState={stateOf("release")}
        onPress={() => onSortColumn("release")}
      >
        Erscheint
      </GlassTableHeaderCell>
    </GlassTableHeader>
  );
}

const WatchlistPosterRow = memo(function WatchlistPosterRow({
  item,
  index,
  isGrid,
  streamingAvailability,
  totalMembers,
  showTitlesInGrid,
  onOpenEntry,
}: {
  item: WatchlistEntry;
  index: number;
  isGrid: boolean;
  streamingAvailability: StreamingAvailabilityLookup;
  totalMembers: number;
  showTitlesInGrid: boolean;
  onOpenEntry: (entry: WatchlistEntry) => void;
}) {
  return (
    <FadeInItem
      replayTab="watchlist"
      index={index}
      className={isGrid ? "flex-1" : undefined}
    >
      <WatchlistPosterCard
        variant={isGrid ? "grid" : "card"}
        movie={withEffectiveReleaseDate(item)}
        streamingAvailability={streamingAvailability}
        ratedCount={ratedCountFor(item)}
        totalMembers={totalMembers}
        showTitle={showTitlesInGrid}
        onPress={() => onOpenEntry(item)}
        testID={`watchlist-entry-${item.id}`}
      />
    </FadeInItem>
  );
});

const GRID_PLACEHOLDER = <View className="flex-1" />;

function keyOfListEntry(entry: WatchlistEntry): string {
  return entry.id;
}

function keyOfGridEntry(entry: WatchlistEntry | GridPlaceholder): string {
  return isGridPlaceholder(entry) ? entry.key : entry.id;
}

export function WatchlistEntryList({
  entries,
  viewMode,
  streamingAvailability,
  totalMembers,
  showTitlesInGrid,
  onOpenEntry,
  columnSort,
  onSortColumn,
}: {
  entries: WatchlistEntry[];
  viewMode: WatchlistViewMode;
  streamingAvailability: StreamingAvailabilityLookup;
  totalMembers: number;
  showTitlesInGrid: boolean;
  onOpenEntry: (entry: WatchlistEntry) => void;
  /** Active header-cell sort (list mode only); `null` = none. */
  columnSort: ColumnSortState<WatchlistColumn> | null;
  onSortColumn: (column: WatchlistColumn) => void;
}) {
  const parallaxScroll = useParallaxScroll();

  if (viewMode === "list") {
    return (
      <FlatList
        {...parallaxScroll}
        testID="watchlist-list"
        data={entries}
        keyExtractor={keyOfListEntry}
        ListHeaderComponent={
          <WatchlistListHeader
            columnSort={columnSort}
            onSortColumn={onSortColumn}
          />
        }
        contentContainerClassName="px-4 pb-3 pt-3"
        initialNumToRender={20}
        {...VIRTUALIZATION}
        renderItem={({ item, index }) => (
          <WatchlistListRow
            item={item}
            isLast={index === entries.length - 1}
            onOpenEntry={onOpenEntry}
          />
        )}
      />
    );
  }

  const isGrid = viewMode === "grid";
  return (
    <FlatList
      {...parallaxScroll}
      testID="watchlist-grid-or-cards"
      key={viewMode}
      data={padToFullRows(entries, isGrid ? 4 : 1)}
      keyExtractor={keyOfGridEntry}
      numColumns={isGrid ? 4 : 1}
      contentContainerClassName={isGrid ? "px-4 pt-3 gap-2" : "px-4 pt-3 gap-3"}
      columnWrapperClassName={isGrid ? "gap-2" : undefined}
      initialNumToRender={isGrid ? 12 : 8}
      {...VIRTUALIZATION}
      renderItem={({ item, index }) =>
        isGridPlaceholder(item) ? (
          GRID_PLACEHOLDER
        ) : (
          <WatchlistPosterRow
            item={item}
            index={index}
            isGrid={isGrid}
            streamingAvailability={streamingAvailability}
            totalMembers={totalMembers}
            showTitlesInGrid={showTitlesInGrid}
            onOpenEntry={onOpenEntry}
          />
        )
      }
    />
  );
}
