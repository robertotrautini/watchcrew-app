import { memo } from "react";
import { useParallaxScroll } from "@/components/parallaxContext";
import { FlatList, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { useSortRemountKey } from "@/hooks/useSortRemountKey";
import { propsEqualIgnoringIndex } from "@/lib/memoCompare";
import {
  GlassTableHeader,
  GlassTableHeaderCell,
  GlassTableRow,
  TABLE_DATE_CELL,
  TABLE_TITLE_CELL,
} from "@/components/ui/GlassTable";
import type { SortState } from "@/lib/entrySorting";
import { formatPlainDate } from "@/lib/dateFormat";
import {
  isGridPlaceholder,
  GRID_COLUMN_WRAPPER_STYLE,
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
import { usePreferencesStore, type WatchlistViewMode } from "@/stores/usePreferencesStore";
import {
  PANEL_LIST_CONTENT_PT_CLASSNAME,
  PANEL_LIST_GRID_CONTENT_PT_CLASSNAME,
} from "@/components/ui/Glass";

function ratedCountFor(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.rating != null && r.rating > 0).length;
}

/**
 * Virtualization tuning shared by all modes (counts are rows, not items).
 * Middle ground (9/6/30 ms): 7/5/clipped blanked on fast flings, 11/8/25 was
 * too heavy. Cards/rows use the flat glass (no blur), which is
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

function WatchlistListHeader() {
  return (
    <GlassTableHeader testID="watchlist-table-header">
      <GlassTableHeaderCell
        testID="watchlist-table-header-title"
        className="flex-1"
      >
        Film
      </GlassTableHeaderCell>
      <GlassTableHeaderCell
        testID="watchlist-table-header-release"
        className="w-28 text-right"
      >
        Erscheint
      </GlassTableHeaderCell>
    </GlassTableHeader>
  );
}

const WatchlistPosterRow = memo(function WatchlistPosterRow({
  item,
  index,
  skipFade,
  isGrid,
  streamingAvailability,
  totalMembers,
  showTitlesInGrid,
  onOpenEntry,
}: {
  item: WatchlistEntry;
  index: number;
  skipFade: boolean;
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
      skipInitialFade={skipFade}
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
}, propsEqualIgnoringIndex);

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
  sort,
}: {
  entries: WatchlistEntry[];
  viewMode: WatchlistViewMode;
  streamingAvailability: StreamingAvailabilityLookup;
  totalMembers: number;
  showTitlesInGrid: boolean;
  onOpenEntry: (entry: WatchlistEntry) => void;
  /** The one active sort (set in the panel); only drives the remount key. */
  sort: SortState;
}) {
  const parallaxScroll = useParallaxScroll();
  const gridColumns = usePreferencesStore((s) => s.gridColumnsDiaryWatchlist);
  const { listKey: sortKey, skipFade } = useSortRemountKey(viewMode, sort);
  // numColumns cannot change on a mounted FlatList: remount on column change.
  const listKey = viewMode === "grid" ? `${sortKey}-c${gridColumns}` : sortKey;

  if (viewMode === "list") {
    return (
      <FlatList
        {...parallaxScroll}
        key={listKey}
        testID="watchlist-list"
        data={entries}
        keyExtractor={keyOfListEntry}
        ListHeaderComponent={<WatchlistListHeader />}
        contentContainerClassName={`px-4 pb-3 ${PANEL_LIST_CONTENT_PT_CLASSNAME}`}
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
      key={listKey}
      data={padToFullRows(entries, isGrid ? gridColumns : 1)}
      keyExtractor={keyOfGridEntry}
      numColumns={isGrid ? gridColumns : 1}
      contentContainerClassName={
        isGrid
          ? `px-4 ${PANEL_LIST_GRID_CONTENT_PT_CLASSNAME} gap-2`
          : `px-4 ${PANEL_LIST_CONTENT_PT_CLASSNAME} gap-3`
      }
      columnWrapperStyle={isGrid ? GRID_COLUMN_WRAPPER_STYLE : undefined}
      initialNumToRender={isGrid ? 12 : 8}
      {...VIRTUALIZATION}
      renderItem={({ item, index }) =>
        isGridPlaceholder(item) ? (
          GRID_PLACEHOLDER
        ) : (
          <WatchlistPosterRow
            item={item}
            index={index}
            skipFade={skipFade}
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
