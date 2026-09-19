import {
  computeAverageRating,
  deriveGroupMemberIds,
  formatSeenAtDate,
  genreDisplayLabel,
  memberDisplayLabel,
} from "@/lib/diaryDisplay";
import type { Movie, Rating, WatchlistEntry } from "@/lib/watchlistTypes";

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
    movie_genres: [],
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

describe("computeAverageRating", () => {
  it("returns null when no ratings have a non-null value", () => {
    const entry = makeEntry({
      id: "e1",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: null })],
    });

    expect(computeAverageRating(entry)).toBeNull();
  });

  it("averages only the non-null rating values", () => {
    const entry = makeEntry({
      id: "e2",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [
        makeRating({ member_id: "u1", rating: 4 }),
        makeRating({ member_id: "u2", rating: null }),
        makeRating({ member_id: "u3", rating: 2 }),
      ],
    });

    expect(computeAverageRating(entry)).toBe(3);
  });

  it("returns the single value when only one member has rated", () => {
    const entry = makeEntry({
      id: "e3",
      movie: makeMovie({ tmdb_id: 3, name: "C" }),
      ratings: [makeRating({ member_id: "u1", rating: 4.5 })],
    });

    expect(computeAverageRating(entry)).toBe(4.5);
  });
});

describe("formatSeenAtDate", () => {
  it("formats a Postgres date string as DD.MM.YYYY", () => {
    expect(formatSeenAtDate("2026-03-07")).toBe("07.03.2026");
  });

  it("returns 'Kein Datum' for null", () => {
    expect(formatSeenAtDate(null)).toBe("Kein Datum");
  });
});

describe("deriveGroupMemberIds", () => {
  it("returns the sorted union of every member_id appearing across all entries' ratings", () => {
    const entries = [
      makeEntry({
        id: "e1",
        movie: makeMovie({ tmdb_id: 1, name: "A" }),
        ratings: [makeRating({ member_id: "u2", rating: 3 })],
      }),
      makeEntry({
        id: "e2",
        movie: makeMovie({ tmdb_id: 2, name: "B" }),
        ratings: [makeRating({ member_id: "u1", rating: 4 }), makeRating({ member_id: "u3", rating: null })],
      }),
    ];

    expect(deriveGroupMemberIds(entries)).toEqual(["u1", "u2", "u3"]);
  });

  it("returns an empty array when no entries have any ratings", () => {
    const entries = [makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 1, name: "A" }) })];

    expect(deriveGroupMemberIds(entries)).toEqual([]);
  });
});

describe("memberDisplayLabel / genreDisplayLabel (placeholder labels)", () => {
  it("returns a stable, non-empty placeholder label for a member id", () => {
    const label = memberDisplayLabel("11111111-2222-3333-4444-555555555555");
    expect(label.length).toBeGreaterThan(0);
    expect(memberDisplayLabel("11111111-2222-3333-4444-555555555555")).toBe(label);
  });

  it("returns a stable, non-empty placeholder label for a genre id", () => {
    const label = genreDisplayLabel("genre-action");
    expect(label.length).toBeGreaterThan(0);
    expect(genreDisplayLabel("genre-action")).toBe(label);
  });
});
