// Sorting of the Watchlist / Tagebuch lists. ONE sort state ({field,
// direction}) shared by the filter panel's sort row and the table headers;
// completely decoupled from filtering (entryFiltering.ts). Pure functions.
// Rating data is read only through the selectors in entrySelectors.ts.

import { getEffectiveReleaseDate } from "./watchlistLogic";
import {
  getAverageRating,
  getLikeCount,
  getOwnRating,
  getOwnSeenAt,
} from "./entrySelectors";
import type { WatchlistEntry } from "./watchlistTypes";

export type SortDirection = "asc" | "desc";

export type DiarySortField =
  "average" | "own" | "likes" | "tmdb" | "title" | "seen_at";
export type WatchlistSortField = "added" | "tmdb" | "title" | "release";
export type SortField = DiarySortField | WatchlistSortField;

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface SortFieldItem<F extends SortField = SortField> {
  key: F;
  label: string;
}

export const DIARY_SORT_FIELDS: SortFieldItem<DiarySortField>[] = [
  { key: "average", label: "Bewertung Ø" },
  { key: "own", label: "Eigene Bewertung" },
  { key: "likes", label: "Likes" },
  { key: "tmdb", label: "TMDB" },
  { key: "title", label: "Titel" },
  { key: "seen_at", label: "Gesehen am" },
];

export const WATCHLIST_SORT_FIELDS: SortFieldItem<WatchlistSortField>[] = [
  { key: "added", label: "Hinzugefügt" },
  { key: "tmdb", label: "TMDB" },
  { key: "title", label: "Titel" },
  { key: "release", label: "Erscheinungsdatum" },
];

export const DEFAULT_DIARY_SORT: SortState = {
  field: "average",
  direction: "desc",
};
export const DEFAULT_WATCHLIST_SORT: SortState = {
  field: "added",
  direction: "desc",
};

export function isSameSort(a: SortState, b: SortState): boolean {
  return a.field === b.field && a.direction === b.direction;
}

/**
 * Table-header tap: another field starts at asc; asc -> desc; desc -> back to
 * the default sort. Tapping the default field while the default is active
 * flips it to asc (so the tap always changes something).
 */
export function nextHeaderSort(
  current: SortState,
  field: SortField,
  defaultSort: SortState,
): SortState {
  if (current.field !== field) {
    return { field, direction: "asc" };
  }
  if (isSameSort(current, defaultSort)) {
    return { field, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return current.direction === "asc"
    ? { field, direction: "desc" }
    : defaultSort;
}

export interface SortContext {
  /** Current user (own rating / own seen date). */
  userId: string;
}

const titleCollator = new Intl.Collator("de", { sensitivity: "base" });

const numeric = (a: number, b: number) => a - b;
const text = (a: string, b: string) => titleCollator.compare(a, b);
// ISO "YYYY-MM-DD" / timestamp strings compare chronologically.
const isoDate = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

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

/** Orders `entries` by the sort state; never removes entries. Returns a new array. */
export function sortEntries(
  entries: WatchlistEntry[],
  sort: SortState,
  context: SortContext,
): WatchlistEntry[] {
  const { direction } = sort;
  switch (sort.field) {
    case "average":
      return sortByKey(entries, direction, getAverageRating, numeric);
    case "own":
      return sortByKey(
        entries,
        direction,
        (e) => getOwnRating(e, context.userId),
        numeric,
      );
    case "likes":
      return sortByKey(entries, direction, getLikeCount, numeric);
    case "tmdb":
      return sortByKey(
        entries,
        direction,
        (e) => e.movie.vote_average,
        numeric,
      );
    case "title":
      return sortByKey(entries, direction, (e) => e.movie.name, text);
    case "seen_at":
      return sortByKey(
        entries,
        direction,
        (e) => getOwnSeenAt(e, context.userId),
        isoDate,
      );
    case "added":
      return sortByKey(
        entries,
        direction,
        (e) => new Date(e.added_at).getTime(),
        numeric,
      );
    case "release":
      return sortByKey(entries, direction, getEffectiveReleaseDate, isoDate);
  }
}
