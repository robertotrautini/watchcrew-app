import type { MovieGridItem } from "@/components/movie/MovieGrid";
import type { TmdbMovieLike, TmdbSearchResult } from "@/lib/tmdbProxy";

// M7 part 2 (Add-Movie-Modal): pure helper functions shared by the four
// search modes (Film/Regisseur/Besetzung/Studio). Kept out of the screen
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
