import { memo } from "react";
import { EntryList } from "@/components/entries/EntryList";
import { Text } from "@/components/ui/Text";

import { WatchlistPosterCard } from "@/components/movie/WatchlistPosterCard";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { propsEqualIgnoringIndex } from "@/lib/memoCompare";
import {
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  TABLE_DATE_CELL,
  TABLE_TITLE_CELL,
} from "@/components/ui/DataTable";
import type { SortState } from "@/lib/entrySorting";
import { formatPlainDate } from "@/lib/dateFormat";
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
    <DataTableRow
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
    </DataTableRow>
  );
});

function WatchlistListHeader() {
  return (
    <DataTableHeader testID="watchlist-table-header">
      <DataTableHeaderCell
        testID="watchlist-table-header-title"
        className="flex-1"
      >
        Film
      </DataTableHeaderCell>
      <DataTableHeaderCell
        testID="watchlist-table-header-release"
        className="w-28 text-right"
      >
        Erscheint
      </DataTableHeaderCell>
    </DataTableHeader>
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
  return (
    <EntryList
      entries={entries}
      mode={viewMode}
      sort={sort}
      listTestID="watchlist-list"
      postersTestID="watchlist-grid-or-cards"
      tableHeader={<WatchlistListHeader />}
      renderTableRow={(item, isLast) => (
        <WatchlistListRow
          item={item}
          isLast={isLast}
          onOpenEntry={onOpenEntry}
        />
      )}
      renderPoster={(item, { index, isGrid, skipFade }) => (
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
      )}
    />
  );
}
