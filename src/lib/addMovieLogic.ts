import type { MovieGridItem } from "@/components/movie/MovieGrid";
import type { TmdbMovieLike } from "@/lib/tmdbProxy";
import type { TmdbSearchResult } from "@/lib/tmdbProxy";
import type { WatchlistEntry } from "@/lib/watchlistTypes";

// M7 part 2 (Add-Movie-Modal): pure helper functions shared by the four
// search modes (Film/Regisseur/Besetzung/Studio), the manual-date fallback,
// and the "Bereits gesehen" duplicate-rating warning. Kept out of the screen
// component so they're exhaustively unit-testable without RNTL, same
// convention as src/lib/movieLibraryStatus.ts / src/lib/movieDetailLogic.ts.

/** Film mode (M7 part 2): maps a raw `search` action result onto MovieGridItem. */
export function mapSearchResultToGridItem(result: TmdbSearchResult): MovieGridItem {
  return {
    tmdbId: result.id,
    title: result.title,
    posterPath: result.poster_path ?? null,
    releaseDate: result.release_date ?? null,
    voteAverage: typeof result.vote_average === "number" ? result.vote_average : null,
  };
}

/**
 * Regisseur/Besetzung/Studio modes (M7 part 2): maps a `TmdbMovieLike` (the
 * shape shared by `director_movies`/`person_movies`/`studio_movies`) onto
 * MovieGridItem. Same field-mapping/title-fallback convention already
 * inlined in the M6 part 2b filmography sub-view screens (director/actor/
 * studio) — extracted here so the Add-Movie-Modal doesn't duplicate it a
 * fourth time.
 */
export function mapMovieLikeToGridItem(part: TmdbMovieLike): MovieGridItem {
  return {
    tmdbId: part.id,
    title: part.title ?? part.name ?? "Unbekannt",
    posterPath: part.poster_path ?? null,
    releaseDate: part.release_date ?? null,
    voteAverage: typeof part.vote_average === "number" ? part.vote_average : null,
  };
}

/**
 * Manual-date fallback gate: TMDB sometimes has no `release_date` at all
 * (e.g. unreleased/undated entries) — per the task spec, an additional
 * manual date input must be shown before allowing the add in that case.
 */
export function needsManualReleaseDate(releaseDate: string | null | undefined): boolean {
  return releaseDate == null || releaseDate === "";
}

export interface DuplicateRatingInfo {
  averageRating: number;
}

/**
 * "Bereits gesehen" duplicate-warning check (M7 part 2): looks for an
 * existing entry in the TARGET group's already-loaded `watchlist_entries`
 * matching the given tmdbId (by TMDB id, not local movie_id — the movie may
 * not even be cataloged locally yet at this point) that already has at
 * least one real rating (`rating != null && rating > 0`, same "not really
 * rated yet" threshold as `ratedCountFor`/`splitWatchlistAndDiary`
 * elsewhere in this codebase). Returns the average of just the real
 * ratings, or `null` when there's no such duplicate.
 */
export function findDuplicateRatedEntry(
  entries: WatchlistEntry[],
  tmdbId: number,
): DuplicateRatingInfo | null {
  const realRatings = entries
    .filter((entry) => entry.movie?.tmdb_id === tmdbId)
    .flatMap((entry) => entry.ratings)
    .map((rating) => rating.rating)
    .filter((rating): rating is number => rating != null && rating > 0);

  if (realRatings.length === 0) {
    return null;
  }

  const averageRating = realRatings.reduce((sum, rating) => sum + rating, 0) / realRatings.length;
  return { averageRating };
}

/** Formats an average rating to one decimal place, for the duplicate-warning dialog's "Ø {rating} Sternen" copy. */
export function formatAverageRating(averageRating: number): string {
  return averageRating.toFixed(1);
}
