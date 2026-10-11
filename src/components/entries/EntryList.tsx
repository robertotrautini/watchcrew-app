import type { ReactElement } from "react";
import { FlatList, View } from "react-native";

import { useParallaxScroll } from "@/components/parallaxContext";
import {
  PANEL_LIST_CONTENT_PT_CLASSNAME,
  PANEL_LIST_GRID_CONTENT_PT_CLASSNAME,
} from "@/components/ui/Surface";
import { useSortRemountKey } from "@/hooks/useSortRemountKey";
import type { SortState } from "@/lib/entrySorting";
import {
  GRID_COLUMN_WRAPPER_STYLE,
  isGridPlaceholder,
  padToFullRows,
  type GridPlaceholder,
} from "@/lib/gridPadding";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Virtualization tuning shared by all modes of both entry lists (counts are
 * rows, not items). Middle ground (9/6/30 ms): 7/5/clipped blanked on fast
 * flings, 11/8/25 was too heavy. Cards/rows use the flat surface (no blur),
 * which is what makes a wider window affordable; clipping stays off (blanks on
 * Android). See docs/performance-scroll-analysis.md "Nachtrag 2".
 */
const VIRTUALIZATION = {
  windowSize: 9,
  maxToRenderPerBatch: 6,
  updateCellsBatchingPeriod: 30,
  removeClippedSubviews: false,
} as const;

/** Invisible cell completing the last grid row so tiles keep 1/columns width. */
const GRID_PLACEHOLDER = <View className="flex-1" />;

function keyOfListEntry(entry: WatchlistEntry): string {
  return entry.id;
}

function keyOfGridEntry(entry: WatchlistEntry | GridPlaceholder): string {
  return isGridPlaceholder(entry) ? entry.key : entry.id;
}

export interface EntryListProps {
  entries: WatchlistEntry[];
  mode: "cards" | "grid" | "list";
  /** The one active sort (set in the panel); only drives the remount key. */
  sort: SortState;
  /** testID of the table (list mode) FlatList. */
  listTestID: string;
  /** testID of the grid/cards FlatList (default: `listTestID`). */
  postersTestID?: string;
  /** Table header of list mode (Tracker-style `DataTableHeader`). */
  tableHeader: ReactElement;
  renderTableRow: (entry: WatchlistEntry, isLast: boolean) => ReactElement;
  /** Poster item of cards and grid mode; `skipFade` is true after a sort-only change. */
  renderPoster: (
    entry: WatchlistEntry,
    info: { index: number; isGrid: boolean; skipFade: boolean },
  ) => ReactElement;
}

/**
 * Virtualized entry list shared by Tagebuch and Watchlist (FlatList: only rows
 * near the viewport are mounted). Owns the three view modes, the remount key
 * (sort change / column change), the grid column count, the placeholder cells
 * and the panel-overlap padding; the tabs only supply row renderers. Rows must
 * be memoized components with primitive/stable props so a parent re-render
 * (typing, filter panel) does not re-render every row.
 */
export function EntryList({
  entries,
  mode,
  sort,
  listTestID,
  postersTestID = listTestID,
  tableHeader,
  renderTableRow,
  renderPoster,
}: EntryListProps) {
  // Empty today (see parallaxContext); kept so any future scroll handler is
  // spread onto the list unchanged (must stay a UI-thread worklet handler).
  const parallaxScroll = useParallaxScroll();
  const gridColumns = usePreferencesStore((s) => s.gridColumnsDiaryWatchlist);
  const { listKey: sortKey, skipFade } = useSortRemountKey(mode, sort);
  // numColumns cannot change on a mounted FlatList: remount on column change.
  const listKey = mode === "grid" ? `${sortKey}-c${gridColumns}` : sortKey;

  if (mode === "list") {
    return (
      <FlatList
        {...parallaxScroll}
        key={listKey}
        testID={listTestID}
        data={entries}
        keyExtractor={keyOfListEntry}
        ListHeaderComponent={tableHeader}
        contentContainerClassName={`px-4 pb-3 ${PANEL_LIST_CONTENT_PT_CLASSNAME}`}
        initialNumToRender={20}
        {...VIRTUALIZATION}
        renderItem={({ item, index }) =>
          renderTableRow(item, index === entries.length - 1)
        }
      />
    );
  }

  const isGrid = mode === "grid";
  return (
    <FlatList
      {...parallaxScroll}
      key={listKey}
      testID={postersTestID}
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
        isGridPlaceholder(item)
          ? GRID_PLACEHOLDER
          : renderPoster(item, { index, isGrid, skipFade })
      }
    />
  );
}
