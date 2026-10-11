// Column-header sorting of the Tagebuch / Watchlist list views. Applied on
// top of the filter-panel result (the panel's sort/filter keeps deciding
// WHICH entries show and their base order; an active column sort only
// re-orders them). Pure functions, no I/O.

import { computeAverageRating } from "./diaryDisplay";
import { getEffectiveReleaseDate } from "./watchlistLogic";
import type { WatchlistEntry } from "./watchlistTypes";

export type SortDirection = "asc" | "desc";

export interface ColumnSortState<C extends string> {
  column: C;
  direction: SortDirection;
}

export type DiaryColumn = "title" | "liked" | "average" | "tmdb";
export type WatchlistColumn = "title" | "release";

/** Tap cycle: first tap asc, second desc, third none; another column restarts at asc. */
export function nextColumnSort<C extends string>(
  current: ColumnSortState<C> | null,
  column: C,
): ColumnSortState<C> | null {
  if (!current || current.column !== column) {
    return { column, direction: "asc" };
  }
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

const titleCollator = new Intl.Collator("de", { sensitivity: "base" });

/** Sort by `key`; null keys always last, direction only flips non-null pairs. Stable (index tie-break). */
function sortByKey<T extends string | number>(
  entries: WatchlistEntry[],
  direction: SortDirection,
  key: (entry: WatchlistEntry) => T | null,
  compare: (a: T, b: T) => number,
): WatchlistEntry[] {
  const sign = direction === "asc" ? 1 : -1;
  return entries
    .map((entry, index) => ({ entry, index, value: key(entry) }))
    .sort((a, b) => {
      if (a.value == null && b.value == null) return a.index - b.index;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return sign * compare(a.value, b.value) || a.index - b.index;
    })
    .map((x) => x.entry);
}

const numeric = (a: number, b: number) => a - b;
const text = (a: string, b: string) => titleCollator.compare(a, b);

function byTitle(entries: WatchlistEntry[], direction: SortDirection) {
  return sortByKey(entries, direction, (e) => e.movie.name, text);
}

export function sortDiaryByColumn(
  entries: WatchlistEntry[],
  state: ColumnSortState<DiaryColumn> | null,
  userId: string,
): WatchlistEntry[] {
  if (!state) return entries;
  const { column, direction } = state;
  switch (column) {
    case "title":
      return byTitle(entries, direction);
    case "liked":
      return sortByKey(
        entries,
        direction,
        (e) =>
          e.ratings.find((r) => r.member_id === userId)?.liked === true ? 1 : 0,
        numeric,
      );
    case "average":
      return sortByKey(entries, direction, computeAverageRating, numeric);
    case "tmdb":
      return sortByKey(entries, direction, (e) => e.movie.vote_average, numeric);
  }
}

export function sortWatchlistByColumn(
  entries: WatchlistEntry[],
  state: ColumnSortState<WatchlistColumn> | null,
): WatchlistEntry[] {
  if (!state) return entries;
  const { column, direction } = state;
  switch (column) {
    case "title":
      return byTitle(entries, direction);
    case "release":
      // ISO "YYYY-MM-DD" strings compare chronologically.
      return sortByKey(entries, direction, getEffectiveReleaseDate, (a, b) =>
        a < b ? -1 : a > b ? 1 : 0,
      );
  }
}
