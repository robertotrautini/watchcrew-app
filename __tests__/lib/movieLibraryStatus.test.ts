import { getLibraryBadgeForTmdbId, getWatchedTmdbIdSet } from "../../src/lib/movieLibraryStatus";
import type { Movie, Rating, WatchlistEntry } from "../../src/lib/watchlistTypes";

// M6 part 2b: derives a per-tmdb-id "is this in my library, and how"
// badge/set from the group's already-loaded watchlist_entries — reusing
// splitWatchlistAndDiary (src/lib/watchlistLogic.ts) for the watched/
// not-watched business rule rather than reimplementing it.

const CURRENT_USER = "u1";
const OTHER_USER = "u2";

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
    added_by: CURRENT_USER,
    paid_by_member_id: null,
    paid_at: null,
    ratings: [],
    ...overrides,
  };
}

describe("getLibraryBadgeForTmdbId", () => {
  it("returns 'watched' when the current user has rated the entry (rating > 0)", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 100, name: "Movie A" }),
      ratings: [makeRating({ member_id: CURRENT_USER, rating: 4 })],
    });

    expect(getLibraryBadgeForTmdbId([entry], 100, CURRENT_USER)).toBe("watched");
  });

  it("returns 'watchlist' when the entry exists but the current user hasn't rated it", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 200, name: "Movie B" }),
      ratings: [],
    });

    expect(getLibraryBadgeForTmdbId([entry], 200, CURRENT_USER)).toBe("watchlist");
  });

  it("returns 'watchlist' when another member rated it but the current user did not", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 300, name: "Movie C" }),
      ratings: [makeRating({ member_id: OTHER_USER, rating: 5 })],
    });

    expect(getLibraryBadgeForTmdbId([entry], 300, CURRENT_USER)).toBe("watchlist");
  });

  it("returns null when the tmdbId isn't present in any entry", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 400, name: "Movie D" }),
      ratings: [],
    });

    expect(getLibraryBadgeForTmdbId([entry], 999, CURRENT_USER)).toBeNull();
  });

  it("returns null for an empty entries array", () => {
    expect(getLibraryBadgeForTmdbId([], 1, CURRENT_USER)).toBeNull();
  });

  it("treats rating of exactly 0 as not-watched (watchlist, not watched)", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 500, name: "Movie E" }),
      ratings: [makeRating({ member_id: CURRENT_USER, rating: 0 })],
    });

    expect(getLibraryBadgeForTmdbId([entry], 500, CURRENT_USER)).toBe("watchlist");
  });
});

describe("getWatchedTmdbIdSet", () => {
  it("collects tmdb_ids of all entries the current user has rated (diary)", () => {
    const e1 = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "Movie 1" }),
      ratings: [makeRating({ member_id: CURRENT_USER, rating: 3 })],
    });
    const e2 = makeEntry({
      id: "e2",
      movie: makeMovie({ tmdb_id: 2, name: "Movie 2" }),
      ratings: [],
    });
    const e3 = makeEntry({
      id: "e3",
      movie: makeMovie({ tmdb_id: 3, name: "Movie 3" }),
      ratings: [makeRating({ member_id: CURRENT_USER, rating: 5 })],
    });

    const result = getWatchedTmdbIdSet([e1, e2, e3], CURRENT_USER);

    expect(result).toEqual(new Set([1, 3]));
  });

  it("returns an empty set when nothing is watched", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "Movie 1" }),
      ratings: [],
    });

    expect(getWatchedTmdbIdSet([entry], CURRENT_USER)).toEqual(new Set());
  });

  it("returns an empty set for an empty entries array", () => {
    expect(getWatchedTmdbIdSet([], CURRENT_USER)).toEqual(new Set());
  });
});
