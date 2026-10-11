import type { Movie, WatchlistEntry } from "./watchlistTypes";

/** One `user_movie_ratings` row with embedded `movie` (see `getMyDiaryRows`). */
export interface MyDiaryRow {
  user_id: string;
  movie_id: string;
  rating: number | null;
  liked: boolean;
  seen_at: string | null;
  rated_at: string | null;
  movie: Movie | null;
}

/** ADR 0014: "seen" = a real rating (> 0) or a `seen_at` date; a bare like does not count. */
export function isSeenRow(row: Pick<MyDiaryRow, "rating" | "seen_at">): boolean {
  return (row.rating != null && row.rating > 0) || row.seen_at != null;
}

/** Synthetic entry id of a "Mein Tagebuch" item (it has no group entry). */
export function myDiaryEntryId(movieId: string): string {
  return `my-${movieId}`;
}

/**
 * Maps the user's rating rows onto the existing entry shape that the
 * selectors/filters/sorting/cards understand: `ratings` = [my row], no group
 * fields (`group_id` "", no payment, `added_by` null). Rows that are not
 * "seen" or whose movie is missing are dropped. Pure.
 */
export function mapMyDiaryRows(rows: MyDiaryRow[]): WatchlistEntry[] {
  return rows
    .filter((row) => row.movie != null && isSeenRow(row))
    .map((row) => ({
      id: myDiaryEntryId(row.movie_id),
      group_id: "",
      movie_id: row.movie_id,
      added_at: row.rated_at ?? row.seen_at ?? "",
      added_by: null,
      paid_by_member_id: null,
      paid_at: null,
      movie: row.movie as Movie,
      ratings: [
        {
          member_id: row.user_id,
          rating: row.rating,
          liked: row.liked,
          seen_at: row.seen_at,
          rated_at: row.rated_at,
        },
      ],
    }));
}
