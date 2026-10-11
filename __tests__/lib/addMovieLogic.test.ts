import { mapMovieLikeToGridItem, mapSearchResultToGridItem } from "../../src/lib/addMovieLogic";

// M7 part 2 (Add-Movie-Modal): pure helper functions for the Film/Regisseur/
// Besetzung/Studio search-result mapping — kept as plain,
// exhaustively unit-tested functions (same convention as
// src/lib/movieLibraryStatus.ts / src/lib/movieDetailLogic.ts) rather than
// inlined in the screen component.

describe("mapSearchResultToGridItem (Film mode search results)", () => {
  it("maps TMDB search-result fields onto MovieGridItem fields", () => {
    const item = mapSearchResultToGridItem({
      id: 603,
      title: "The Matrix",
      original_title: "The Matrix",
      original_language: "en",
      release_date: "1999-03-31",
      poster_path: "/matrix.jpg",
      vote_average: 8.2,
    });

    expect(item).toEqual({
      tmdbId: 603,
      title: "The Matrix",
      posterPath: "/matrix.jpg",
      releaseDate: "1999-03-31",
      voteAverage: 8.2,
    });
  });

  it("defaults posterPath/releaseDate/voteAverage to null when absent", () => {
    const item = mapSearchResultToGridItem({
      id: 1,
      title: "No Metadata",
      original_title: "No Metadata",
      original_language: "en",
    });

    expect(item.posterPath).toBeNull();
    expect(item.releaseDate).toBeNull();
    expect(item.voteAverage).toBeNull();
  });
});

describe("mapMovieLikeToGridItem (Regisseur/Besetzung/Studio filmography results)", () => {
  it("maps title/poster_path/release_date/vote_average, falling back to name then 'Unbekannt' for the title", () => {
    expect(
      mapMovieLikeToGridItem({ id: 1, title: "Titled", poster_path: "/p.jpg", release_date: "2020-01-01", vote_average: 6.5 }),
    ).toEqual({ tmdbId: 1, title: "Titled", posterPath: "/p.jpg", releaseDate: "2020-01-01", voteAverage: 6.5 });

    expect(mapMovieLikeToGridItem({ id: 2, name: "Named Only" })).toEqual({
      tmdbId: 2,
      title: "Named Only",
      posterPath: null,
      releaseDate: null,
      voteAverage: null,
    });

    expect(mapMovieLikeToGridItem({ id: 3 })).toEqual({
      tmdbId: 3,
      title: "Unbekannt",
      posterPath: null,
      releaseDate: null,
      voteAverage: null,
    });
  });

  it("treats a non-number vote_average as absent (defensive, TmdbMovieLike is loosely typed)", () => {
    const item = mapMovieLikeToGridItem({ id: 4, title: "X", vote_average: "n/a" as unknown as number });
    expect(item.voteAverage).toBeNull();
  });
});
