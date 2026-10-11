// Filtering of the Watchlist / Tagebuch lists. Filters only NARROW the list
// (all active filters combine with AND) and never reorder it -- ordering is
// entrySorting.ts. Pure functions; rating data is read through
// watchlistLogic / entrySelectors only.

import { hasAnyRating } from "./entrySelectors";
import type { DiaryScope, EntryFilters } from "./listFilters";
import type { TmdbMovieProviders } from "./tmdbProxy";
import {
  filterAllRated,
  filterByGenre,
  filterByMyStreaming,
  filterByYear,
  filterHasRatings,
  filterLiked,
  filterMissing,
  filterUnrated,
  filterUpcoming,
  splitWatchlistAndDiary,
} from "./watchlistLogic";
import type {
  StreamingAvailabilityLookup,
  WatchlistEntry,
} from "./watchlistTypes";

interface SharedFilterContext {
  /** Current user ("Mag ich", own seen date). */
  userId: string;
  /** tmdb_id -> DE providers (needed while the streaming filter is on). */
  providersByTmdbId?: ReadonlyMap<number, TmdbMovieProviders>;
  /** The user's saved "Meine Streaming-Dienste" provider ids. */
  myProviderIds?: number[];
}

export interface DiaryFilterContext extends SharedFilterContext {
  /** Full group membership (all user ids) for "Alle bewertet" / "Fehlt noch". */
  groupMemberIds?: string[];
}

export interface WatchlistFilterContext extends SharedFilterContext {
  streamingAvailability?: StreamingAvailabilityLookup;
  now?: Date;
}

function applyShared(
  entries: WatchlistEntry[],
  filters: EntryFilters,
  context: SharedFilterContext,
): WatchlistEntry[] {
  let result = filterByGenre(entries, filters.genreIds);
  if (filters.myStreaming) {
    result = filterByMyStreaming(
      result,
      context.providersByTmdbId ?? new Map(),
      context.myProviderIds ?? [],
      filters.providerCategories,
    );
  }
  return result;
}

/** Tagebuch filters (genre, year of own seen date, streaming, liked, all rated / missing). */
export function filterDiary(
  entries: WatchlistEntry[],
  filters: EntryFilters,
  context: DiaryFilterContext,
): WatchlistEntry[] {
  let result = applyShared(entries, filters, context);
  if (filters.year != null) {
    result = filterByYear(result, filters.year, "seen_at", context.userId);
  }
  if (filters.liked) {
    result = filterLiked(result, context.userId);
  }
  const memberIds = context.groupMemberIds ?? [];
  if (filters.allRated) {
    result = filterAllRated(result, memberIds);
  }
  if (filters.missing) {
    result = filterMissing(result, memberIds);
  }
  return result;
}

/** Watchlist filters (genre, release year, streaming, Kommt noch / Keine Bewertung / Mit Bewertungen). */
export function filterWatchlist(
  entries: WatchlistEntry[],
  filters: EntryFilters,
  context: WatchlistFilterContext,
): WatchlistEntry[] {
  let result = applyShared(entries, filters, context);
  if (filters.year != null) {
    result = filterByYear(result, filters.year, "release_date");
  }
  if (filters.upcoming) {
    result = filterUpcoming(
      result,
      context.streamingAvailability ?? new Map(),
      context.now,
    );
  }
  if (filters.liked) {
    result = filterLiked(result, context.userId);
  }
  if (filters.unrated) {
    result = filterUnrated(result);
  }
  if (filters.hasRatings) {
    result = filterHasRatings(result);
  }
  return result;
}

/**
 * Base set of the Tagebuch before filtering: "Mein Tagebuch" = entries I rated;
 * "Gruppe" = entries at least one member rated.
 */
export function selectDiaryScope(
  entries: WatchlistEntry[],
  scope: DiaryScope,
  userId: string,
): WatchlistEntry[] {
  return scope === "group"
    ? entries.filter((entry) => hasAnyRating(entry))
    : splitWatchlistAndDiary(entries, userId).diary;
}
