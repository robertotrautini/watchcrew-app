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

import { matchesOwnProviders, type ProviderCategory } from "./movieProviderFilter";
import type { TmdbMovieProviders } from "./tmdbProxy";

import type {
  DiarySortOption,
  Movie,
  Rating,
  SortContext,
  StreamingAvailabilityCacheRow,
  StreamingAvailabilityLookup,
  WatchlistEntry,
  WatchlistSortOption,
  YearFilterValue,
} from "./watchlistTypes";

/** Pills active by default for option 'my_streaming': flatrate only (min. 1 must stay active). */
export const DEFAULT_PROVIDER_CATEGORIES: ProviderCategory[] = ["flatrate"];

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
function ownRatingCounts(rating: Rating | undefined): boolean {
  return !!rating && rating.rating != null && rating.rating > 0;
}

function findOwnRating(entry: WatchlistEntry, userId: string): Rating | undefined {
  return entry.ratings.find((r) => r.member_id === userId);
}

export function splitWatchlistAndDiary(
  entries: WatchlistEntry[],
  currentUserId: string
): { watchlist: WatchlistEntry[]; diary: WatchlistEntry[] } {
  const watchlist: WatchlistEntry[] = [];
  const diary: WatchlistEntry[] = [];

  for (const entry of entries) {
    const ownRating = findOwnRating(entry, currentUserId);
    if (ownRatingCounts(ownRating)) {
      diary.push(entry);
    } else {
      watchlist.push(entry);
    }
  }

  return { watchlist, diary };
}

// ============================================================================
// Shared small helpers
// ============================================================================

function getYearFromDateString(dateStr: string): number {
  // Dates come back from Postgres `date` columns as "YYYY-MM-DD". Slicing
  // the string avoids any local-timezone shift `new Date(str).getFullYear()`
  // could introduce right around midnight/year boundaries.
  return Number(dateStr.slice(0, 4));
}

function averageRating(entry: WatchlistEntry): number | null {
  const values = entry.ratings
    .map((r) => r.rating)
    .filter((r): r is number => r != null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Stable sort helper: `Array.prototype.sort` in place on a copy. */
function sortedCopy<T>(items: T[], compare: (a: T, b: T) => number): T[] {
  return [...items].sort(compare);
}

// ============================================================================
// Shared options (used by both sortWatchlist and sortDiary)
// ============================================================================

/** Option 'tmdb_score' (watchlist #5 / diary #5): by movies.vote_average desc, nulls last. */
export function sortByTmdbScoreDesc(entries: WatchlistEntry[]): WatchlistEntry[] {
  return sortedCopy(entries, (a, b) => {
    const av = a.movie.vote_average;
    const bv = b.movie.vote_average;
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

/**
 * Option 'my_streaming' (watchlist #6 / diary #6): "Meine Streaming-Dienste".
 *
 * Keeps only entries offered (DE) by one of the user's saved services within
 * the active Flatrate/Leihen/Kaufen categories (see `matchesOwnProviders`).
 * Entries keep the received order; entries whose providers are not (yet)
 * loaded drop out.
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

function myStreamingFromContext(entries: WatchlistEntry[], context: SortContext): WatchlistEntry[] {
  return filterByMyStreaming(
    entries,
    context.providersByTmdbId ?? new Map(),
    context.myProviderIds ?? [],
    context.providerCategories ?? DEFAULT_PROVIDER_CATEGORIES
  );
}

function getGenreIds(entry: WatchlistEntry): string[] {
  return (entry.movie.movie_genres ?? []).map((link) => link.genre_id);
}

/** Option 'genre' (watchlist #7 / diary #7): multi-select, AND logic. */
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
 * Option 'year' (watchlist #8 / diary #8): single-select year filter.
 *
 * `dateField` distinguishes the watchlist's movie-level `release_date` from
 * the diary's CURRENT USER's own `seen_at` (diary option 8 is explicitly
 * "by the CURRENT USER's own seen_at year, not added_at" — so for
 * `dateField === 'seen_at'`, `currentUserId` is required to pick the right
 * rating row). `year === 'no_date'` is the diary's "Kein Datum" pseudo-value
 * bucket (entries whose relevant date is null), generalized here to work for
 * either date field.
 *
 * Note: the 2020-01-01 legacy-placeholder-date quirk from the old MySQL app
 * does NOT apply to this fresh schema (no legacy data exists for it yet) —
 * deliberately not special-cased here per the M5 task brief.
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
    const ownRating = currentUserId ? findOwnRating(entry, currentUserId) : undefined;
    return ownRating?.seen_at ?? null;
  };

  return entries.filter((entry) => {
    const date = getDate(entry);
    if (year === "no_date") {
      return date == null;
    }
    return date != null && getYearFromDateString(date) === year;
  });
}

// ============================================================================
// Watchlist-only options
// ============================================================================

/** Option 'added' (watchlist #1, DEFAULT): by added_at descending. */
export function sortByAddedAtDesc(entries: WatchlistEntry[]): WatchlistEntry[] {
  return sortedCopy(entries, (a, b) => {
    return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
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
 * "Kommt noch" predicate (watchlist option 'upcoming', #2), implemented
 * EXACTLY per the governing rule's literal predicate:
 *
 *   future release_date OR (no release_date AND NOT available on streaming)
 *
 * This is an OR of two independent branches — a future release_date alone
 * is enough (regardless of streaming availability), and the "NOT available"
 * check only applies in the no-release-date branch. This exact shape is a
 * preserved historical bugfix from the legacy app: previously, movies with
 * no release_date that had ALREADY become available to stream were
 * incorrectly still shown as "upcoming" — the second branch's explicit
 * `NOT available` guard is what excludes them.
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

/**
 * Option 'upcoming' (watchlist #2): filters via `isUpcoming`, then orders
 * soonest-known-release first (entries with no release_date, which can only
 * appear here via the "not yet available" branch, sort after all dated
 * entries — this ordering isn't specified beyond the filter predicate
 * itself, so this is a reasonable/reversible default, not a spec'd rule).
 */
export function filterUpcoming(
  entries: WatchlistEntry[],
  streamingAvailability: StreamingAvailabilityLookup,
  now: Date = new Date()
): WatchlistEntry[] {
  const upcoming = entries.filter((e) => isUpcoming(e, streamingAvailability, now));
  return sortedCopy(upcoming, (a, b) => {
    const ad = getEffectiveReleaseDate(a);
    const bd = getEffectiveReleaseDate(b);
    if (ad == null && bd == null) return 0;
    if (ad == null) return 1;
    if (bd == null) return -1;
    return new Date(ad).getTime() - new Date(bd).getTime();
  });
}

function hasRealRating(rating: Rating): boolean {
  return rating.rating != null && rating.rating > 0;
}

/**
 * Option 'unrated' (watchlist #3): entries where NO member has rated yet.
 * Uses the same "rated means rating > 0" definition as the Watchlist/Diary
 * split (the spec's wording here is "no member has rated yet", not the
 * more literal "non-null rating" wording used for diary's 'all_rated'/
 * 'missing' below — kept consistent with the split's definition of
 * "rated" since this option isn't about a per-member completeness count).
 */
export function filterUnrated(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries.filter((entry) => !entry.ratings.some(hasRealRating));
}

/**
 * Option 'has_ratings' (watchlist #4): entries where at least one member
 * (not necessarily the current user) has rated.
 */
export function filterHasRatings(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries.filter((entry) => entry.ratings.some(hasRealRating));
}

export function sortWatchlist(
  entries: WatchlistEntry[],
  option: WatchlistSortOption,
  context: SortContext = {}
): WatchlistEntry[] {
  switch (option) {
    case "added":
      return sortByAddedAtDesc(entries);
    case "upcoming":
      return filterUpcoming(entries, context.streamingAvailability ?? new Map(), context.now);
    case "unrated":
      return filterUnrated(entries);
    case "has_ratings":
      return filterHasRatings(entries);
    case "tmdb_score":
      return sortByTmdbScoreDesc(entries);
    case "my_streaming":
      return myStreamingFromContext(entries, context);
    case "genre":
      return filterByGenre(entries, context.genreIds ?? []);
    case "year":
      return context.year === undefined ? [...entries] : filterByYear(entries, context.year, "release_date");
    default: {
      const exhaustive: never = option;
      return exhaustive;
    }
  }
}

// ============================================================================
// Diary-only options
// ============================================================================

/** Option 'my_diary' (diary #1, DEFAULT): current user's rated entries, by own seen_at desc. */
export function sortMyDiary(entries: WatchlistEntry[], currentUserId: string): WatchlistEntry[] {
  const { diary } = splitWatchlistAndDiary(entries, currentUserId);
  return sortedCopy(diary, (a, b) => {
    const aSeen = findOwnRating(a, currentUserId)?.seen_at ?? null;
    const bSeen = findOwnRating(b, currentUserId)?.seen_at ?? null;
    if (aSeen == null && bSeen == null) return 0;
    if (aSeen == null) return 1;
    if (bSeen == null) return -1;
    return new Date(bSeen).getTime() - new Date(aSeen).getTime();
  });
}

function hasNonNullRatingFor(entry: WatchlistEntry, memberId: string): boolean {
  return entry.ratings.some((r) => r.member_id === memberId && r.rating != null);
}

/**
 * Option 'all_rated' (diary #2): only entries where EVERY current group
 * member has a rating row with a NON-NULL rating (per spec's literal
 * wording here — unlike 'unrated'/'has_ratings' above, a rating of exactly
 * 0 DOES count as "has rated" for this completeness check, since the rule
 * says "non-null", not "> 0"). Sorted by average rating descending.
 */
export function filterAllRated(
  entries: WatchlistEntry[],
  groupMemberIds: string[]
): WatchlistEntry[] {
  const allRated = entries.filter((entry) =>
    groupMemberIds.every((id) => hasNonNullRatingFor(entry, id))
  );
  return sortedCopy(allRated, (a, b) => {
    const av = averageRating(a);
    const bv = averageRating(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

/**
 * Option 'missing' (diary #3): entries where at least one group member has
 * NOT yet rated (mirrors 'all_rated's non-null definition of "rated").
 */
export function filterMissing(
  entries: WatchlistEntry[],
  groupMemberIds: string[]
): WatchlistEntry[] {
  return entries.filter(
    (entry) => !groupMemberIds.every((id) => hasNonNullRatingFor(entry, id))
  );
}

/** Option 'rating' (diary #4): by average rating descending. */
export function sortByAverageRatingDesc(entries: WatchlistEntry[]): WatchlistEntry[] {
  return sortedCopy(entries, (a, b) => {
    const av = averageRating(a);
    const bv = averageRating(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return bv - av;
  });
}

/** Option 'liked' (diary #9): only entries the CURRENT USER has liked. */
export function filterLiked(entries: WatchlistEntry[], currentUserId: string): WatchlistEntry[] {
  return entries.filter((entry) => findOwnRating(entry, currentUserId)?.liked === true);
}

export function sortDiary(
  entries: WatchlistEntry[],
  option: DiarySortOption,
  currentUserId: string,
  context: SortContext = {}
): WatchlistEntry[] {
  switch (option) {
    case "my_diary":
      return sortMyDiary(entries, currentUserId);
    case "all_rated":
      return filterAllRated(entries, context.groupMemberIds ?? []);
    case "missing":
      return filterMissing(entries, context.groupMemberIds ?? []);
    case "rating":
      return sortByAverageRatingDesc(entries);
    case "tmdb_score":
      return sortByTmdbScoreDesc(entries);
    case "my_streaming":
      return myStreamingFromContext(entries, context);
    case "genre":
      return filterByGenre(entries, context.genreIds ?? []);
    case "year":
      return context.year === undefined
        ? [...entries]
        : filterByYear(entries, context.year, "seen_at", currentUserId);
    case "liked":
      return filterLiked(entries, currentUserId);
    default: {
      const exhaustive: never = option;
      return exhaustive;
    }
  }
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
