// M5 part 1: shared types for the Watchlist/Tagebuch (diary) data layer.
//
// These mirror the M1 Postgres schema (supabase/migrations/*.sql) as read
// back through the nested Supabase select used by
// `src/lib/watchlist.ts`/`src/hooks/useGroupWatchlist.ts`:
//
//   watchlist_entries.select(
//     "*, movie:movies(*, movie_genres(genre_id, genres(name))), ratings(*)"
//   )
//
// The `genres(name)` nested join (M5 fast-follow) resolves the flagged gap
// where genre pills only had a raw genre_id to show, no display name.
//
// Single-table model reminder (frozen across all milestones, see
// docs/feature-inventory.md): a `watchlist_entries` row is never itself
// "a Watchlist item" or "a Diary item" — that split is computed per current
// user by `splitWatchlistAndDiary` in `src/lib/watchlistLogic.ts`.

import type { ProviderCategory } from "./movieProviderFilter";
import type { TmdbMovieProviders } from "./tmdbProxy";

export interface MovieGenreLink {
  genre_id: string;
  // Present when fetched via the nested `movie_genres(genre_id, genres(name))`
  // select (M5 fast-follow genre-name join) -- optional so hand-built test
  // fixtures that only cared about `genre_id` keep compiling unchanged, and
  // so a movie whose genre catalog row is somehow missing degrades to the
  // existing uuid-prefix placeholder instead of crashing.
  genres?: { name: string } | null;
}

export interface Movie {
  id: string;
  tmdb_id: number;
  name: string;
  release_date: string | null;
  poster: string | null;
  overview: string | null;
  runtime: number | null;
  director: string | null;
  director_id: number | null;
  vote_average: number | null;
  // Present when fetched via the nested `movie_genres(genre_id)` select;
  // optional so hand-built test fixtures don't have to include it.
  movie_genres?: MovieGenreLink[];
}

export interface Rating {
  id: string;
  watchlist_entry_id: string;
  member_id: string;
  // Postgres `numeric(2,1)`, nullable. 0 and null both mean "current user
  // has not really rated it yet" for the Watchlist/Diary split — see
  // `splitWatchlistAndDiary`.
  rating: number | null;
  liked: boolean;
  seen_at: string | null;
  rated_at: string | null;
}

export interface WatchlistEntry {
  id: string;
  group_id: string;
  movie_id: string;
  added_at: string;
  added_by: string;
  paid_by_member_id: string | null;
  paid_at: string | null;
  /**
   * Per-group release date override (Postgres `date`, "YYYY-MM-DD"); null =
   * use `movie.release_date`. Optional so hand-built fixtures keep compiling.
   * Always resolve the shown/used date via `getEffectiveReleaseDate`.
   */
  release_date_override?: string | null;
  movie: Movie;
  ratings: Rating[];
}

export interface StreamingAvailabilityCacheRow {
  tmdb_id: number;
  region: string;
  data: unknown;
  last_fetched_at: string;
}

/**
 * tmdb_id -> "is this movie available on streaming (flatrate), per the cache".
 *
 * Built by `buildStreamingAvailabilityLookup` from the raw
 * `streaming_availability_cache` rows (ADR 0005, DE region): a movie counts as
 * "available" only when its cached provider data has at least one flatrate
 * provider (rent/buy only does not count as "streamable").
 */
export type StreamingAvailabilityLookup = Map<number, boolean>;

export type WatchlistSortOption =
  | "added"
  | "upcoming"
  | "unrated"
  | "has_ratings"
  | "tmdb_score"
  | "my_streaming"
  | "genre"
  | "year";

export type DiarySortOption =
  | "my_diary"
  | "all_rated"
  | "missing"
  | "rating"
  | "tmdb_score"
  | "my_streaming"
  | "genre"
  | "year"
  | "liked";

export type YearFilterValue = number | "no_date";

/**
 * Extra data a given sort/filter option needs beyond `entries` (and, for
 * diary options, `currentUserId`). Every field is optional because most
 * options only need a subset; `sortWatchlist`/`sortDiary` default missing
 * fields to sensible empty values (see their implementations).
 */
export interface SortContext {
  streamingAvailability?: StreamingAvailabilityLookup;
  /** Genre ids the user has multi-selected (AND logic, option 'genre'). */
  genreIds?: string[];
  /** Single year selection (or the "Kein Datum" pseudo-value), option 'year'. */
  year?: YearFilterValue;
  /**
   * Full current membership of the group (all user ids), needed by diary's
   * 'all_rated'/'missing' options to know whether EVERY member has rated,
   * not just whether every rating row present happens to be non-null.
   */
  groupMemberIds?: string[];
  /** tmdb_id -> DE watch providers, for option 'my_streaming'. */
  providersByTmdbId?: ReadonlyMap<number, TmdbMovieProviders>;
  /** The user's saved "Meine Streaming-Dienste" provider ids, option 'my_streaming'. */
  myProviderIds?: number[];
  /** Active Flatrate/Leihen/Kaufen pills for 'my_streaming' (default: flatrate only). */
  providerCategories?: ProviderCategory[];
  /** Injectable "now" for deterministic tests of date-relative logic. */
  now?: Date;
}
