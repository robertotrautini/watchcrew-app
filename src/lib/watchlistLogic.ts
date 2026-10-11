// M5 part 1: pure business logic for Watchlist/Tagebuch (diary).
//
// Everything here is a pure function over hand-built in-memory data — no
// Supabase/network access (that lives in `src/lib/watchlist.ts` and
// `src/hooks/useGroupWatchlist.ts`). See docs/feature-inventory.md (rules
// extracted verbatim into the M5 task brief) for the governing business
// rules; comments below call out the exact source rule being implemented,
// especially where it encodes a historical bugfix from the legacy app.
//
// Single-table model (non-negotiable, frozen across all milestones):
// Watchlist and Diary are NOT separate datasets. `splitWatchlistAndDiary`
// is the one place that turns a group's full `watchlist_entries` set into
// the two per-current-user views.

import Fuse from "fuse.js";

import {
  getOwnSeenAt,
  hasAnyRating,
  hasMemberRated,
  hasOwnRating,
  isLikedBy,
} from "./entrySelectors";
import { matchesOwnProviders, type ProviderCategory } from "./movieProviderFilter";
import type { TmdbMovieProviders } from "./tmdbProxy";

import type {
  Movie,
  StreamingAvailabilityCacheRow,
  StreamingAvailabilityLookup,
  WatchlistEntry,
  YearFilterValue,
} from "./watchlistTypes";

// ============================================================================
// Effective release date (per-group override)
// ============================================================================

/**
 * The release date that applies to this group's entry: the entry's own
 * `release_date_override` if set, else the shared `movies.release_date`.
 * Every date display/sort/"Kommt noch"/year filter must go through this.
 */
export function getEffectiveReleaseDate(entry: WatchlistEntry): string | null {
  return entry.release_date_override ?? entry.movie.release_date;
}

/** `entry.movie` with `release_date` replaced by the effective date (for components that only take a `Movie`). */
export function withEffectiveReleaseDate(entry: WatchlistEntry): Movie {
  const releaseDate = getEffectiveReleaseDate(entry);
  return releaseDate === entry.movie.release_date
    ? entry.movie
    : { ...entry.movie, release_date: releaseDate };
}

// ============================================================================
// Split: the one function that turns entries into Watchlist vs Diary
// ============================================================================

/**
 * A rating "counts" as the user actually having rated the movie (Diary) only
 * when the row exists AND `rating` is a real value > 0. `rating` being
 * absent, null, or exactly 0 all mean "not rated yet" (Watchlist) — per the
 * governing rule: "a watchlist_entries row is a Watchlist item for a given
 * user if that user has NO rating row (or rating is null/0) on it; it's a
 * Diary item for that user if they DO have a rating (rating > 0)."
 */
export function splitWatchlistAndDiary(
  entries: WatchlistEntry[],
  currentUserId: string
): { watchlist: WatchlistEntry[]; diary: WatchlistEntry[] } {
  const watchlist: WatchlistEntry[] = [];
  const diary: WatchlistEntry[] = [];

  for (const entry of entries) {
    if (hasOwnRating(entry, currentUserId)) {
      diary.push(entry);
    } else {
      watchlist.push(entry);
    }
  }

  return { watchlist, diary };
}

// ============================================================================
// Filters (pure predicates; they NEVER reorder -- ordering is entrySorting.ts)
// ============================================================================

function getYearFromDateString(dateStr: string): number {
  // Dates come back from Postgres `date` columns as "YYYY-MM-DD". Slicing
  // the string avoids any local-timezone shift `new Date(str).getFullYear()`
  // could introduce right around midnight/year boundaries.
  return Number(dateStr.slice(0, 4));
}

/**
 * "Meine Streaming-Dienste": keeps only entries offered (DE) by one of the
 * user's saved services within the active Flatrate/Leihen/Kaufen categories
 * (see `matchesOwnProviders`). Entries whose providers are not (yet) loaded
 * drop out.
 */
export function filterByMyStreaming(
  entries: WatchlistEntry[],
  providersByTmdbId: ReadonlyMap<number, TmdbMovieProviders>,
  ownProviderIds: number[],
  categories: ProviderCategory[]
): WatchlistEntry[] {
  return entries.filter((entry) =>
    matchesOwnProviders(providersByTmdbId.get(entry.movie.tmdb_id), categories, ownProviderIds)
  );
}

function getGenreIds(entry: WatchlistEntry): string[] {
  return (entry.movie.movie_genres ?? []).map((link) => link.genre_id);
}

/** Genre filter: multi-select, AND logic (an empty selection keeps everything). */
export function filterByGenre(
  entries: WatchlistEntry[],
  selectedGenreIds: string[]
): WatchlistEntry[] {
  if (selectedGenreIds.length === 0) {
    return [...entries];
  }
  return entries.filter((entry) => {
    const entryGenreIds = new Set(getGenreIds(entry));
    return selectedGenreIds.every((id) => entryGenreIds.has(id));
  });
}

/**
 * Year filter: single-select.
 *
 * `dateField` distinguishes the watchlist's movie-level `release_date` from
 * the diary's CURRENT USER's own `seen_at` ("by the CURRENT USER's own
 * seen_at year, not added_at" -- so for `dateField === 'seen_at'`,
 * `currentUserId` is required). `year === 'no_date'` is the "Kein Datum"
 * pseudo-value (entries whose relevant date is null).
 *
 * Note: the 2020-01-01 legacy-placeholder-date quirk from the old MySQL app
 * does NOT apply to this fresh schema, deliberately not special-cased.
 */
export function filterByYear(
  entries: WatchlistEntry[],
  year: YearFilterValue,
  dateField: "release_date" | "seen_at",
  currentUserId?: string
): WatchlistEntry[] {
  const getDate = (entry: WatchlistEntry): string | null => {
    if (dateField === "release_date") {
      return getEffectiveReleaseDate(entry);
    }
    return currentUserId ? getOwnSeenAt(entry, currentUserId) : null;
  };

  return entries.filter((entry) => {
    const date = getDate(entry);
    if (year === "no_date") {
      return date == null;
    }
    return date != null && getYearFromDateString(date) === year;
  });
}

function isFutureDate(dateStr: string, now: Date): boolean {
  // Compare by calendar day, not exact instant, since release_date has no
  // time component.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const release = new Date(`${dateStr}T00:00:00Z`);
  return release.getTime() > today.getTime();
}

/**
 * "Kommt noch" predicate, implemented EXACTLY per the governing rule's
 * literal predicate:
 *
 *   future release_date OR (no release_date AND NOT available on streaming)
 *
 * This is an OR of two independent branches -- a future release_date alone
 * is enough (regardless of streaming availability), and the "NOT available"
 * check only applies in the no-release-date branch. This exact shape is a
 * preserved historical bugfix from the legacy app: previously, movies with
 * no release_date that had ALREADY become available to stream were
 * incorrectly still shown as "upcoming".
 */
export function isUpcoming(
  entry: WatchlistEntry,
  streamingAvailability: StreamingAvailabilityLookup,
  now: Date = new Date()
): boolean {
  const releaseDate = getEffectiveReleaseDate(entry);
  const isAvailable = streamingAvailability.get(entry.movie.tmdb_id) ?? false;

  if (releaseDate != null && isFutureDate(releaseDate, now)) {
    return true;
  }
  if (releaseDate == null && !isAvailable) {
    return true;
  }
  return false;
}

/** Watchlist "Kommt noch": keeps entries matching `isUpcoming`. */
export function filterUpcoming(
  entries: WatchlistEntry[],
  streamingAvailability: StreamingAvailabilityLookup,
  now: Date = new Date()
): WatchlistEntry[] {
  return entries.filter((e) => isUpcoming(e, streamingAvailability, now));
}

/**
 * Watchlist "Keine Bewertung": entries where NO member has rated yet (same
 * "rated means rating > 0" definition as the Watchlist/Diary split).
 */
export function filterUnrated(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries.filter((entry) => !hasAnyRating(entry));
}

/** Watchlist "Mit Bewertungen": at least one member (not necessarily the current user) has rated. */
export function filterHasRatings(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries.filter((entry) => hasAnyRating(entry));
}

/**
 * Diary "Alle bewertet": only entries where EVERY current group member has a
 * NON-NULL rating (a rating of exactly 0 DOES count as "has rated" for this
 * completeness check, since the rule says "non-null", not "> 0").
 */
export function filterAllRated(
  entries: WatchlistEntry[],
  groupMemberIds: string[]
): WatchlistEntry[] {
  return entries.filter((entry) =>
    groupMemberIds.every((id) => hasMemberRated(entry, id))
  );
}

/** Diary "Fehlt noch": at least one group member has NOT yet rated (mirrors `filterAllRated`). */
export function filterMissing(
  entries: WatchlistEntry[],
  groupMemberIds: string[]
): WatchlistEntry[] {
  return entries.filter(
    (entry) => !groupMemberIds.every((id) => hasMemberRated(entry, id))
  );
}

/** Diary "Mag ich": only entries the CURRENT USER has liked. */
export function filterLiked(entries: WatchlistEntry[], currentUserId: string): WatchlistEntry[] {
  return entries.filter((entry) => isLikedBy(entry, currentUserId));
}

// ============================================================================
// Fuzzy title search (shared by Watchlist and Diary tabs)
// ============================================================================

/**
 * Client-side fuzzy title search over an already-loaded (post-split,
 * post-sort) entry array. Per spec, only active once the query has 2+
 * characters ("ab 2 Zeichen aktiv") — shorter queries are a no-op
 * passthrough returning entries unchanged/unfiltered.
 */
export function searchEntries(entries: WatchlistEntry[], query: string): WatchlistEntry[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [...entries];
  }
  const fuse = new Fuse(entries, { keys: ["movie.name"], threshold: 0.4 });
  return fuse.search(trimmed).map((result) => result.item);
}

// ============================================================================
// Streaming-availability lookup builder (used by useGroupWatchlist)
// ============================================================================

function hasFlatrate(data: unknown): boolean {
  const flatrate = (data as { flatrate?: unknown } | null | undefined)?.flatrate;
  return Array.isArray(flatrate) && flatrate.length > 0;
}

/** tmdb_id -> true for rows whose cached DE providers include at least one flatrate offer. */
export function buildStreamingAvailabilityLookup(
  rows: StreamingAvailabilityCacheRow[]
): StreamingAvailabilityLookup {
  const lookup: StreamingAvailabilityLookup = new Map();
  for (const row of rows) {
    if (hasFlatrate(row.data)) {
      lookup.set(row.tmdb_id, true);
    }
  }
  return lookup;
}
