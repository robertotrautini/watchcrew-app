import {
  findDuplicateRatedEntry,
  formatAverageRating,
  mapMovieLikeToGridItem,
  mapSearchResultToGridItem,
  needsManualReleaseDate,
} from "../../src/lib/addMovieLogic";
import type { Movie, Rating, WatchlistEntry } from "../../src/lib/watchlistTypes";

// M7 part 2 (Add-Movie-Modal): pure helper functions for the Film/Regisseur/
// Besetzung/Studio search-result mapping, the manual-date fallback gate, and
// the "Bereits gesehen" duplicate-rating detection — kept as plain,
// exhaustively unit-tested functions (same convention as
// src/lib/movieLibraryStatus.ts / src/lib/movieDetailLogic.ts) rather than
// inlined in the screen component.

function makeMovie(overrides: Partial<Movie> & Pick<Movie, "tmdb_id" | "name">): Movie {
  return {
    id: `movie-${overrides.tmdb_id}`,
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    ...overrides,
  };
}

function makeRating(overrides: Partial<Rating> & Pick<Rating, "member_id">): Rating {
  return {
    id: `rating-${overrides.member_id}-${Math.random()}`,
    watchlist_entry_id: "entry",
    rating: null,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WatchlistEntry> & Pick<WatchlistEntry, "id" | "movie">): WatchlistEntry {
  return {
    group_id: "group-1",
    movie_id: overrides.movie.id,
    added_at: "2026-01-01T00:00:00Z",
    added_by: "u1",
    paid_by_member_id: null,
    paid_at: null,
    ratings: [],
    ...overrides,
  };
}

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

describe("needsManualReleaseDate", () => {
  it("returns true for null, undefined, and empty-string release dates", () => {
    expect(needsManualReleaseDate(null)).toBe(true);
    expect(needsManualReleaseDate(undefined)).toBe(true);
    expect(needsManualReleaseDate("")).toBe(true);
  });

  it("returns false when a real release date is present", () => {
    expect(needsManualReleaseDate("1999-03-31")).toBe(false);
  });
});

describe("findDuplicateRatedEntry (\"Bereits gesehen\" duplicate-warning check)", () => {
  it("returns null when no entry in the group matches the tmdbId", () => {
    const entries = [makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 1, name: "A" }) })];
    expect(findDuplicateRatedEntry(entries, 999)).toBeNull();
  });

  it("returns null when the matching entry has no ratings at all", () => {
    const entries = [makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 603, name: "Matrix" }) })];
    expect(findDuplicateRatedEntry(entries, 603)).toBeNull();
  });

  it("returns null when the matching entry's ratings are all null/0 (not really rated yet)", () => {
    const entries = [
      makeEntry({
        id: "e1",
        movie: makeMovie({ tmdb_id: 603, name: "Matrix" }),
        ratings: [makeRating({ member_id: "u1", rating: null }), makeRating({ member_id: "u2", rating: 0 })],
      }),
    ];
    expect(findDuplicateRatedEntry(entries, 603)).toBeNull();
  });

  it("returns the average of the real (non-null, >0) ratings when at least one exists", () => {
    const entries = [
      makeEntry({
        id: "e1",
        movie: makeMovie({ tmdb_id: 603, name: "Matrix" }),
        ratings: [
          makeRating({ member_id: "u1", rating: 4 }),
          makeRating({ member_id: "u2", rating: 5 }),
          makeRating({ member_id: "u3", rating: null }),
        ],
      }),
    ];
    expect(findDuplicateRatedEntry(entries, 603)).toEqual({ averageRating: 4.5 });
  });

  it("ignores entries for a different tmdbId even when they have ratings", () => {
    const entries = [
      makeEntry({
        id: "e1",
        movie: makeMovie({ tmdb_id: 1, name: "Other" }),
        ratings: [makeRating({ member_id: "u1", rating: 5 })],
      }),
    ];
    expect(findDuplicateRatedEntry(entries, 603)).toBeNull();
  });
});

describe("formatAverageRating", () => {
  it("formats to one decimal place", () => {
    expect(formatAverageRating(4.5)).toBe("4.5");
    expect(formatAverageRating(4)).toBe("4.0");
    expect(formatAverageRating(3.666)).toBe("3.7");
  });
});
