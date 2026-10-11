import type { Movie, Rating, WatchlistEntry } from "@/lib/watchlistTypes";

/** Shared hand-built fixtures for the sort/filter tests. u1 = current user. */
export function movie(
  tmdb_id: number,
  name: string,
  extra: Partial<Movie> = {},
): Movie {
  return {
    id: `m${tmdb_id}`,
    tmdb_id,
    name,
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    movie_genres: [],
    ...extra,
  } as Movie;
}

export function entry(
  id: string,
  m: Movie,
  ratings: Partial<Rating>[] = [],
  extra: Partial<WatchlistEntry> = {},
): WatchlistEntry {
  return {
    id,
    movie: m,
    added_at: "2026-01-01T00:00:00Z",
    release_date_override: null,
    ratings: ratings.map((r) => ({
      member_id: "u1",
      rating: null,
      liked: false,
      seen_at: null,
      ...r,
    })),
    ...extra,
  } as unknown as WatchlistEntry;
}

export const ids = (list: WatchlistEntry[]) => list.map((e) => e.id);

export function genres(...genreIds: string[]): Pick<Movie, "movie_genres"> {
  return { movie_genres: genreIds.map((genre_id) => ({ genre_id })) };
}
