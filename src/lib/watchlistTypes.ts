// M5 part 1: shared types for the Watchlist/Tagebuch (diary) data layer.
//
// These mirror the M1 Postgres schema (supabase/migrations/*.sql) as read
// back through the nested Supabase select used by
// `src/lib/watchlist.ts`/`src/hooks/useGroupWatchlist.ts`:
//
//   watchlist_entries.select(
//     "*, movie:movies(*, movie_genres(genre_id, genres(name)))"
//   )
//
// ADR 0014: `ratings` is NOT embedded any more -- ratings live per user and
// movie in `user_movie_ratings` and are merged into `entry.ratings` on the
// client (`attachMemberRatings` in `src/lib/entrySelectors.ts`).
//
// The `genres(name)` nested join (M5 fast-follow) resolves the flagged gap
// where genre pills only had a raw genre_id to show, no display name.
//
// Single-table model reminder (frozen across all milestones, see
// docs/feature-inventory.md): a `watchlist_entries` row is never itself
// "a Watchlist item" or "a Diary item" — that split is computed per current
// user by `splitWatchlistAndDiary` in `src/lib/watchlistLogic.ts`.


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
  /** `user_movie_ratings.user_id` (ADR 0014: one row per user and movie). */
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
  /** NULL once the adding account was deleted (ADR 0014, ON DELETE SET NULL) -- show "Ehemaliges Mitglied". */
  added_by: string | null;
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

export type YearFilterValue = number | "no_date";

