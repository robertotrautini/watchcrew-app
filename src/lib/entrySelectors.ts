// The ONE seam between the Watchlist/Tagebuch sort + filter logic and the
// shape of the rating data (`entry.ratings`). Sorting and filtering code
// (entrySorting.ts, entryFiltering.ts, watchlistLogic.ts) reads ratings ONLY
// through these selectors, so a change of the rating data source (e.g. one
// rating per user per movie) is confined to this file.

import type { WatchlistEntry } from "./watchlistTypes";

type RatingRow = WatchlistEntry["ratings"][number];

function ratingOf(
  entry: WatchlistEntry,
  memberId: string,
): RatingRow | undefined {
  return entry.ratings.find((r) => r.member_id === memberId);
}

/** A rating "counts" only when it is a real value > 0 (0/null = not rated yet). */
function isRealRating(rating: RatingRow | undefined): boolean {
  return !!rating && rating.rating != null && rating.rating > 0;
}

/** Average of all non-null ratings, or `null` when nobody rated. */
export function getAverageRating(entry: WatchlistEntry): number | null {
  const values = entry.ratings
    .map((r) => r.rating)
    .filter((r): r is number => r != null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** The user's own rating value (> 0), else `null`. */
export function getOwnRating(
  entry: WatchlistEntry,
  userId: string,
): number | null {
  const rating = ratingOf(entry, userId);
  return isRealRating(rating) ? (rating?.rating ?? null) : null;
}

/** The user's own `seen_at` date ("YYYY-MM-DD"), else `null`. */
export function getOwnSeenAt(
  entry: WatchlistEntry,
  userId: string,
): string | null {
  return ratingOf(entry, userId)?.seen_at ?? null;
}

/** True when the user marked the movie as liked. */
export function isLikedBy(entry: WatchlistEntry, userId: string): boolean {
  return ratingOf(entry, userId)?.liked === true;
}

/** Number of members who liked the movie. */
export function getLikeCount(entry: WatchlistEntry): number {
  return entry.ratings.filter((r) => r.liked === true).length;
}

/** True when the user has a real rating (> 0) for the entry (= Tagebuch item). */
export function hasOwnRating(entry: WatchlistEntry, userId: string): boolean {
  return isRealRating(ratingOf(entry, userId));
}

/** True when at least one member (anyone) has a real rating (> 0). */
export function hasAnyRating(entry: WatchlistEntry): boolean {
  return entry.ratings.some((r) => isRealRating(r));
}

/** True when the member has a non-null rating (0 counts: completeness check). */
export function hasMemberRated(
  entry: WatchlistEntry,
  memberId: string,
): boolean {
  return entry.ratings.some(
    (r) => r.member_id === memberId && r.rating != null,
  );
}

/** One row of `user_movie_ratings` as returned by RPC `get_group_member_ratings`. */
export interface MemberRatingRow {
  user_id: string;
  movie_id: string;
  rating: number | null;
  liked: boolean;
  seen_at: string | null;
  rated_at: string | null;
}

/**
 * Merges the per-user/per-movie ratings (ADR 0014) into the group's entries:
 * `entry.ratings` = all rows whose `movie_id` equals the entry's movie. An
 * entry without any row gets `[]`. Pure, never mutates the input.
 */
export function attachMemberRatings(
  entries: WatchlistEntry[],
  rows: MemberRatingRow[],
): WatchlistEntry[] {
  const byMovie = new Map<string, RatingRow[]>();
  for (const row of rows) {
    const list = byMovie.get(row.movie_id) ?? [];
    list.push({
      member_id: row.user_id,
      rating: row.rating,
      liked: row.liked,
      seen_at: row.seen_at,
      rated_at: row.rated_at,
    });
    byMovie.set(row.movie_id, list);
  }
  return entries.map((entry) => ({
    ...entry,
    ratings: byMovie.get(entry.movie_id) ?? [],
  }));
}
