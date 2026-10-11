import { LIKE_HEART_COLOR } from "@/lib/colors";
import { MOVIE_TITLE_TEXT } from "@/components/ui/movieTitle";
import { memo, useMemo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";

import { DiaryEntryCard } from "@/components/movie/DiaryEntryCard";
import { DiaryPosterTile } from "@/components/movie/DiaryPosterTile";
import { EntryList } from "@/components/entries/EntryList";
import { FadeInItem } from "@/components/ui/FadeInItem";
import { propsEqualIgnoringIndex } from "@/lib/memoCompare";
import {
  DataTableHeader,
  DataTableHeaderCell,
  DataTableRow,
  DataTableHeaderIconCell,
  TABLE_ICON_CELL,
  TABLE_SCORE_CELL,
  TABLE_SCORE_STRONG_CELL,
  TABLE_TITLE_CELL,
} from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icon";
import { TmdbBadge } from "@/components/ui/TmdbBadge";
import type { SortState } from "@/lib/entrySorting";
import { formatPlainDate } from "@/lib/dateFormat";
import { computeAverageRating, memberDisplayLabel } from "@/lib/diaryDisplay";
import { buildTmdbImageUrl } from "@/lib/tmdbImage";
import type { WatchlistEntry } from "@/lib/watchlistTypes";
import type { DiaryViewMode } from "@/stores/usePreferencesStore";

/**
 * Virtualized Tagebuch list (FlatList): only the rows near the viewport are
 * mounted. Rows are memoized components that get primitive/stable props (no
 * `screen` object), so a re-render of the screen hook (typing, filter panel,
 * query status) does not re-render every row.
 */
export interface TagebuchEntryListProps {
  entries: WatchlistEntry[];
  mode: DiaryViewMode;
  /** Current user id (own rating / seen date / like). */
  userId: string | undefined;
  starColor: string;
  showTitlesInGrid: boolean;
  groupMemberIds: string[];
  displayNameById: Map<string, string>;
  onOpenEntry: (entry: WatchlistEntry) => void;
  /** The one active sort (set in the panel); only drives the remount key. */
  sort: SortState;
}

function findOwnRating(entry: WatchlistEntry, userId: string | undefined) {
  return entry.ratings.find((r) => r.member_id === userId);
}

interface RowBaseProps {
  entry: WatchlistEntry;
  index: number;
  skipFade: boolean;
  userId: string | undefined;
  onOpenEntry: (entry: WatchlistEntry) => void;
}

const GridRow = memo(function GridRow({
  entry,
  index,
  skipFade,
  userId,
  starColor,
  showTitlesInGrid,
  onOpenEntry,
}: RowBaseProps & { starColor: string; showTitlesInGrid: boolean }) {
  return (
    <FadeInItem
      replayTab="tagebuch"
      index={index}
      skipInitialFade={skipFade}
      testID={`tagebuch-entry-${entry.id}`}
      className="flex-1"
    >
      <Pressable
        testID={`tagebuch-entry-press-${entry.id}`}
        accessibilityRole="button"
        onPress={() => onOpenEntry(entry)}
      >
        <DiaryPosterTile
          posterUrl={buildTmdbImageUrl(entry.movie.poster)}
          title={entry.movie.name}
          starColor={starColor}
          averageRating={computeAverageRating(entry)}
          liked={findOwnRating(entry, userId)?.liked === true}
          tmdbScore={entry.movie.vote_average}
        >
          {showTitlesInGrid ? (
            <Text
              testID={`tagebuch-grid-title-${entry.id}`}
              className={`text-xs ${MOVIE_TITLE_TEXT}`}
              numberOfLines={1}
            >
              {entry.movie.name}
            </Text>
          ) : null}
        </DiaryPosterTile>
      </Pressable>
    </FadeInItem>
  );
}, propsEqualIgnoringIndex);

function ListHeader({ starColor }: { starColor: string }) {
  return (
    <DataTableHeader testID="tagebuch-table-header">
      <DataTableHeaderCell
        testID="tagebuch-table-header-title"
        className="flex-1"
      >
        Film
      </DataTableHeaderCell>
      <DataTableHeaderIconCell
        testID="tagebuch-table-header-like"
        label="Favorit"
        className={TABLE_ICON_CELL}
      >
        <Icon name="heart" size="SM" color={LIKE_HEART_COLOR} />
      </DataTableHeaderIconCell>
      <DataTableHeaderIconCell
        testID="tagebuch-table-header-average"
        label="Durchschnitt"
        className={TABLE_SCORE_STRONG_CELL}
      >
        <Icon name="star" size="SM" color={starColor} />
      </DataTableHeaderIconCell>
      <DataTableHeaderIconCell
        testID="tagebuch-table-header-tmdb"
        label="TMDB"
        className={TABLE_SCORE_CELL}
      >
        <TmdbBadge
          testID="tagebuch-table-header-tmdb-logo"
          score={null}
          hideScore
          largeLogo
        />
      </DataTableHeaderIconCell>
    </DataTableHeader>
  );
}

const ListRow = memo(function ListRow({
  entry,
  isLast,
  userId,
  onOpenEntry,
}: Omit<RowBaseProps, "index" | "skipFade"> & { isLast: boolean }) {
  const liked = findOwnRating(entry, userId)?.liked === true;
  const average = computeAverageRating(entry);
  return (
    <DataTableRow
      testID={`tagebuch-entry-${entry.id}`}
      isLast={isLast}
      onPress={() => onOpenEntry(entry)}
    >
      <Text
        testID={`tagebuch-list-title-${entry.id}`}
        numberOfLines={1}
        ellipsizeMode="tail"
        className={TABLE_TITLE_CELL}
      >
        {entry.movie.name}
      </Text>
      <View className={TABLE_ICON_CELL}>
        {liked ? (
          <Icon
            testID={`tagebuch-list-like-${entry.id}`}
            name="heart"
            size="S"
            color={LIKE_HEART_COLOR}
          />
        ) : null}
      </View>
      <Text
        testID={`tagebuch-list-average-${entry.id}`}
        className={TABLE_SCORE_STRONG_CELL}
      >
        {average != null ? average.toFixed(1) : "–"}
      </Text>
      <Text
        testID={`tagebuch-list-tmdb-${entry.id}`}
        className={TABLE_SCORE_CELL}
      >
        {entry.movie.vote_average != null
          ? entry.movie.vote_average.toFixed(1)
          : "–"}
      </Text>
    </DataTableRow>
  );
});

const CardRow = memo(function CardRow({
  entry,
  index,
  skipFade,
  userId,
  starColor,
  groupMemberIds,
  displayNameById,
  onOpenEntry,
}: RowBaseProps & {
  starColor: string;
  groupMemberIds: string[];
  displayNameById: Map<string, string>;
}) {
  const own = findOwnRating(entry, userId);
  const members = useMemo(
    () =>
      groupMemberIds.map((memberId) => ({
        id: memberId,
        label: memberDisplayLabel(memberId, displayNameById.get(memberId)),
        rating:
          entry.ratings.find((r) => r.member_id === memberId)?.rating ?? null,
      })),
    [groupMemberIds, displayNameById, entry],
  );
  const seenLabel = own?.seen_at
    ? `Gesehen am ${formatPlainDate(own.seen_at, "Kein Datum")}`
    : "Kein Datum";
  return (
    <FadeInItem
      replayTab="tagebuch"
      index={index}
      skipInitialFade={skipFade}
      testID={`tagebuch-entry-${entry.id}`}
    >
      <Pressable
        testID={`tagebuch-entry-press-${entry.id}`}
        accessibilityRole="button"
        onPress={() => onOpenEntry(entry)}
      >
        <DiaryEntryCard
          posterUrl={buildTmdbImageUrl(entry.movie.poster)}
          title={entry.movie.name}
          seenLabel={seenLabel}
          seenLabelTestID={`tagebuch-entry-seen-date-${entry.id}`}
          starColor={starColor}
          averageRating={computeAverageRating(entry)}
          liked={own?.liked === true}
          tmdbScore={entry.movie.vote_average}
          members={members}
        />
      </Pressable>
    </FadeInItem>
  );
}, propsEqualIgnoringIndex);

export function TagebuchEntryList({
  entries,
  mode,
  userId,
  starColor,
  showTitlesInGrid,
  groupMemberIds,
  displayNameById,
  onOpenEntry,
  sort,
}: TagebuchEntryListProps) {
  return (
    <EntryList
      entries={entries}
      mode={mode}
      sort={sort}
      listTestID="tagebuch-entry-list"
      tableHeader={<ListHeader starColor={starColor} />}
      renderTableRow={(entry, isLast) => (
        <ListRow
          entry={entry}
          isLast={isLast}
          userId={userId}
          onOpenEntry={onOpenEntry}
        />
      )}
      renderPoster={(entry, { index, isGrid, skipFade }) =>
        isGrid ? (
          <GridRow
            entry={entry}
            index={index}
            skipFade={skipFade}
            userId={userId}
            starColor={starColor}
            showTitlesInGrid={showTitlesInGrid}
            onOpenEntry={onOpenEntry}
          />
        ) : (
          <CardRow
            entry={entry}
            index={index}
            skipFade={skipFade}
            userId={userId}
            starColor={starColor}
            groupMemberIds={groupMemberIds}
            displayNameById={displayNameById}
            onOpenEntry={onOpenEntry}
          />
        )
      }
    />
  );
}
