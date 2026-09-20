import { splitWatchlistAndDiary } from "./watchlistLogic";
import type { WatchlistEntry } from "./watchlistTypes";

// M6 part 2b: derives a per-tmdb-id "is this movie already in my library,
// and how" badge/set from a group's already-loaded `watchlist_entries` set
// — for the movie sub-view screens (collection/filmography/similar-movies
// grids) to show a "watched"/"on my watchlist" badge per grid item.
//
// Reuses `splitWatchlistAndDiary` (src/lib/watchlistLogic.ts) for the
// watched/not-watched business rule rather than reimplementing it.

export type LibraryBadge = "watched" | "watchlist" | null;

export function getLibraryBadgeForTmdbId(
  entries: WatchlistEntry[],
  tmdbId: number,
  currentUserId: string
): LibraryBadge {
  const { watchlist, diary } = splitWatchlistAndDiary(entries, currentUserId);

  if (diary.some((entry) => entry.movie?.tmdb_id === tmdbId)) {
    return "watched";
  }
  if (watchlist.some((entry) => entry.movie?.tmdb_id === tmdbId)) {
    return "watchlist";
  }
  return null;
}

export function getWatchedTmdbIdSet(
  entries: WatchlistEntry[],
  currentUserId: string
): Set<number> {
  const { diary } = splitWatchlistAndDiary(entries, currentUserId);
  const result = new Set<number>();

  for (const entry of diary) {
    const tmdbId = entry.movie?.tmdb_id;
    if (tmdbId != null) {
      result.add(tmdbId);
    }
  }

  return result;
}
