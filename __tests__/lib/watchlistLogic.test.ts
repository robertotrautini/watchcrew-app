import {
  buildStreamingAvailabilityLookup,
  filterAllRated,
  filterByGenre,
  filterByYear,
  filterHasRatings,
  filterLiked,
  filterMissing,
  filterUnrated,
  filterUpcoming,
  getEffectiveReleaseDate,
  isUpcoming,
  withEffectiveReleaseDate,
  searchEntries,
  filterByMyStreaming,
  splitWatchlistAndDiary,
} from "@/lib/watchlistLogic";
import type { Movie, Rating, StreamingAvailabilityLookup, WatchlistEntry } from "@/lib/watchlistTypes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
// u1 is always "the current user" in these tests. u2/u3 are other members.
// GENRE_ACTION/GENRE_DRAMA are fake genre ids; g1=action, g2=drama.

const GENRE_ACTION = "genre-action";
const GENRE_DRAMA = "genre-drama";

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

describe("splitWatchlistAndDiary", () => {
  it("puts an entry with no rating rows into the watchlist", () => {
    const entry = makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 1, name: "Alpha" }) });

    const { watchlist, diary } = splitWatchlistAndDiary([entry], "u1");

    expect(watchlist).toEqual([entry]);
    expect(diary).toEqual([]);
  });

  it("puts an entry where current user's rating is exactly 0 into the watchlist (0 counts as unrated)", () => {
    const entry = makeEntry({
      id: "e2",
      movie: makeMovie({ tmdb_id: 2, name: "Beta" }),
      ratings: [makeRating({ member_id: "u1", rating: 0 })],
    });

    const { watchlist, diary } = splitWatchlistAndDiary([entry], "u1");

    expect(watchlist).toEqual([entry]);
    expect(diary).toEqual([]);
  });

  it("puts an entry where current user's rating is null into the watchlist", () => {
    const entry = makeEntry({
      id: "e3",
      movie: makeMovie({ tmdb_id: 3, name: "Gamma" }),
      ratings: [makeRating({ member_id: "u1", rating: null })],
    });

    const { watchlist } = splitWatchlistAndDiary([entry], "u1");

    expect(watchlist).toEqual([entry]);
  });

  it("puts an entry where current user has a real rating (>0) into the diary, even if others haven't rated", () => {
    const entry = makeEntry({
      id: "e4",
      movie: makeMovie({ tmdb_id: 4, name: "Delta" }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });

    const { watchlist, diary } = splitWatchlistAndDiary([entry], "u1");

    expect(diary).toEqual([entry]);
    expect(watchlist).toEqual([]);
  });

  it("puts an entry into the watchlist for a user when only OTHER members have rated it", () => {
    const entry = makeEntry({
      id: "e5",
      movie: makeMovie({ tmdb_id: 5, name: "Epsilon" }),
      ratings: [makeRating({ member_id: "u2", rating: 5 })],
    });

    const { watchlist, diary } = splitWatchlistAndDiary([entry], "u1");

    expect(watchlist).toEqual([entry]);
    expect(diary).toEqual([]);
  });
});

describe("isUpcoming (Kommt noch)", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("is true for a future release_date, regardless of streaming availability", () => {
    const entry = makeEntry({
      id: "future-available",
      movie: makeMovie({ tmdb_id: 10, name: "Future", release_date: "2026-12-01" }),
    });
    const availability: StreamingAvailabilityLookup = new Map([[10, true]]);

    expect(isUpcoming(entry, availability, now)).toBe(true);
  });

  it("is false for a past release_date that is not available on streaming", () => {
    const entry = makeEntry({
      id: "past",
      movie: makeMovie({ tmdb_id: 11, name: "Past", release_date: "2020-01-01" }),
    });

    expect(isUpcoming(entry, new Map(), now)).toBe(false);
  });

  it("is true for no release_date when NOT available on streaming", () => {
    const entry = makeEntry({
      id: "no-date-unavailable",
      movie: makeMovie({ tmdb_id: 12, name: "Mystery", release_date: null }),
    });

    expect(isUpcoming(entry, new Map(), now)).toBe(true);
  });

  it("is false for no release_date when it IS available on streaming (the preserved legacy bugfix)", () => {
    const entry = makeEntry({
      id: "no-date-available",
      movie: makeMovie({ tmdb_id: 13, name: "AlreadyStreaming", release_date: null }),
    });
    const availability: StreamingAvailabilityLookup = new Map([[13, true]]);

    expect(isUpcoming(entry, availability, now)).toBe(false);
  });
});

describe("filterUpcoming", () => {
  it("keeps only upcoming entries and does not reorder them", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const soon = makeEntry({ id: "soon", movie: makeMovie({ tmdb_id: 1, name: "Soon", release_date: "2026-07-01" }) });
    const later = makeEntry({ id: "later", movie: makeMovie({ tmdb_id: 2, name: "Later", release_date: "2026-09-01" }) });
    const undated = makeEntry({ id: "undated", movie: makeMovie({ tmdb_id: 3, name: "Undated", release_date: null }) });
    const alreadyStreaming = makeEntry({
      id: "streaming",
      movie: makeMovie({ tmdb_id: 4, name: "Streaming", release_date: null }),
    });
    const past = makeEntry({ id: "past", movie: makeMovie({ tmdb_id: 5, name: "Past", release_date: "2020-01-01" }) });
    const availability: StreamingAvailabilityLookup = new Map([[4, true]]);

    const result = filterUpcoming([later, undated, alreadyStreaming, past, soon], availability, now);

    expect(result.map((e) => e.id)).toEqual(["later", "undated", "soon"]);
  });
});

describe("filterUnrated / filterHasRatings", () => {
  const noRatings = makeEntry({ id: "none", movie: makeMovie({ tmdb_id: 1, name: "A" }) });
  const zeroRatingOnly = makeEntry({
    id: "zero",
    movie: makeMovie({ tmdb_id: 2, name: "B" }),
    ratings: [makeRating({ member_id: "u1", rating: 0 })],
  });
  const oneRealRating = makeEntry({
    id: "one",
    movie: makeMovie({ tmdb_id: 3, name: "C" }),
    ratings: [makeRating({ member_id: "u2", rating: 5 })],
  });

  it("filterUnrated keeps entries with no member rating > 0", () => {
    const result = filterUnrated([noRatings, zeroRatingOnly, oneRealRating]);
    expect(result.map((e) => e.id).sort()).toEqual(["none", "zero"]);
  });

  it("filterHasRatings keeps entries where at least one member rated (>0), regardless of who", () => {
    const result = filterHasRatings([noRatings, zeroRatingOnly, oneRealRating]);
    expect(result.map((e) => e.id)).toEqual(["one"]);
  });
});

describe("filterByMyStreaming", () => {
  const a = makeEntry({ id: "a", movie: makeMovie({ tmdb_id: 1, name: "A" }) });
  const b = makeEntry({ id: "b", movie: makeMovie({ tmdb_id: 2, name: "B" }) });
  const c = makeEntry({ id: "c", movie: makeMovie({ tmdb_id: 3, name: "C" }) });
  const providers = new Map([
    [1, { flatrate: [{ provider_id: 8, provider_name: "Netflix" }], rent: [], buy: [] }],
    [2, { flatrate: [], rent: [{ provider_id: 8, provider_name: "Netflix" }], buy: [] }],
    [3, { flatrate: [{ provider_id: 9, provider_name: "Prime" }], rent: [], buy: [] }],
  ]);

  it("keeps entries available at an own provider within the active categories, in received order", () => {
    expect(filterByMyStreaming([c, b, a], providers, [8], ["flatrate"]).map((e) => e.id)).toEqual(["a"]);
    expect(filterByMyStreaming([c, b, a], providers, [8], ["flatrate", "rent"]).map((e) => e.id)).toEqual(["b", "a"]);
  });

  it("drops entries without loaded providers data and returns a fresh array", () => {
    const d = makeEntry({ id: "d", movie: makeMovie({ tmdb_id: 4, name: "D" }) });
    const result = filterByMyStreaming([d, a], providers, [8], ["flatrate"]);
    expect(result.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("filterByGenre (AND logic)", () => {
  const actionOnly = makeEntry({
    id: "action-only",
    movie: makeMovie({ tmdb_id: 1, name: "A", movie_genres: [{ genre_id: GENRE_ACTION }] }),
  });
  const dramaOnly = makeEntry({
    id: "drama-only",
    movie: makeMovie({ tmdb_id: 2, name: "B", movie_genres: [{ genre_id: GENRE_DRAMA }] }),
  });
  const both = makeEntry({
    id: "both",
    movie: makeMovie({
      tmdb_id: 3,
      name: "C",
      movie_genres: [{ genre_id: GENRE_ACTION }, { genre_id: GENRE_DRAMA }],
    }),
  });

  it("with no genres selected, returns all entries unchanged", () => {
    expect(filterByGenre([actionOnly, dramaOnly, both], [])).toEqual([actionOnly, dramaOnly, both]);
  });

  it("with one genre selected, matches entries containing that genre (single-select-like)", () => {
    const result = filterByGenre([actionOnly, dramaOnly, both], [GENRE_ACTION]);
    expect(result.map((e) => e.id).sort()).toEqual(["action-only", "both"]);
  });

  it("with two genres selected, requires ALL of them (AND, not OR)", () => {
    const result = filterByGenre([actionOnly, dramaOnly, both], [GENRE_ACTION, GENRE_DRAMA]);
    expect(result.map((e) => e.id)).toEqual(["both"]);
  });
});

describe("filterByYear", () => {
  it("filters watchlist entries by release_date year", () => {
    const y2025 = makeEntry({ id: "y2025", movie: makeMovie({ tmdb_id: 1, name: "A", release_date: "2025-05-01" }) });
    const y2026 = makeEntry({ id: "y2026", movie: makeMovie({ tmdb_id: 2, name: "B", release_date: "2026-05-01" }) });
    const noDate = makeEntry({ id: "none", movie: makeMovie({ tmdb_id: 3, name: "C", release_date: null }) });

    expect(filterByYear([y2025, y2026, noDate], 2026, "release_date").map((e) => e.id)).toEqual(["y2026"]);
    expect(filterByYear([y2025, y2026, noDate], "no_date", "release_date").map((e) => e.id)).toEqual(["none"]);
  });

  it("filters diary entries by the CURRENT USER's own seen_at year, not another member's, and not added_at", () => {
    const entryA = makeEntry({
      id: "a",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      added_at: "2020-01-01T00:00:00Z",
      ratings: [
        makeRating({ member_id: "u1", rating: 4, seen_at: "2026-02-01" }),
        makeRating({ member_id: "u2", rating: 5, seen_at: "2019-01-01" }),
      ],
    });
    const entryB = makeEntry({
      id: "b",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: "2019-06-01" })],
    });
    const entryNoSeenAt = makeEntry({
      id: "c",
      movie: makeMovie({ tmdb_id: 3, name: "C" }),
      ratings: [makeRating({ member_id: "u1", rating: 2, seen_at: null })],
    });

    expect(
      filterByYear([entryA, entryB, entryNoSeenAt], 2026, "seen_at", "u1").map((e) => e.id)
    ).toEqual(["a"]);
    expect(
      filterByYear([entryA, entryB, entryNoSeenAt], "no_date", "seen_at", "u1").map((e) => e.id)
    ).toEqual(["c"]);
  });
});

describe("filterAllRated / filterMissing", () => {
  const members = ["u1", "u2", "u3"];

  const allRatedEntry = makeEntry({
    id: "all-rated",
    movie: makeMovie({ tmdb_id: 1, name: "A" }),
    ratings: [
      makeRating({ member_id: "u1", rating: 4 }),
      makeRating({ member_id: "u2", rating: 3 }),
      makeRating({ member_id: "u3", rating: 5 }),
    ],
  });
  // u3's rating row exists but is null -> per spec's literal "non-null rating"
  // wording this is NOT "all rated", even though the row is present.
  const nullRatingCountsAsMissing = makeEntry({
    id: "null-rating",
    movie: makeMovie({ tmdb_id: 2, name: "B" }),
    ratings: [
      makeRating({ member_id: "u1", rating: 4 }),
      makeRating({ member_id: "u2", rating: 3 }),
      makeRating({ member_id: "u3", rating: null }),
    ],
  });
  // u3 has literally no row at all.
  const missingMemberEntry = makeEntry({
    id: "missing-member",
    movie: makeMovie({ tmdb_id: 3, name: "C" }),
    ratings: [makeRating({ member_id: "u1", rating: 4 }), makeRating({ member_id: "u2", rating: 3 })],
  });
  // A rating of exactly 0 DOES count as "non-null" -> counts as rated here,
  // unlike the Watchlist/Diary split's "rating > 0" definition.
  const zeroRatingCountsAsRatedHere = makeEntry({
    id: "zero-rating-all-rated",
    movie: makeMovie({ tmdb_id: 4, name: "D" }),
    ratings: [
      makeRating({ member_id: "u1", rating: 0 }),
      makeRating({ member_id: "u2", rating: 3 }),
      makeRating({ member_id: "u3", rating: 5 }),
    ],
  });

  const allEntries = [
    allRatedEntry,
    nullRatingCountsAsMissing,
    missingMemberEntry,
    zeroRatingCountsAsRatedHere,
  ];

  it("filterAllRated keeps only entries where every member has a non-null rating row (order unchanged)", () => {
    const result = filterAllRated(allEntries, members);

    expect(result.map((e) => e.id)).toEqual(["all-rated", "zero-rating-all-rated"]);
  });

  it("filterMissing keeps entries where at least one member lacks a non-null rating (null row or no row at all)", () => {
    const result = filterMissing(allEntries, members);

    expect(result.map((e) => e.id).sort()).toEqual(["missing-member", "null-rating"]);
  });
});

describe("filterLiked", () => {
  it("keeps only entries where the CURRENT USER's own rating has liked=true", () => {
    const likedByMe = makeEntry({
      id: "liked-by-me",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, liked: true })],
    });
    const likedByOther = makeEntry({
      id: "liked-by-other",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u2", rating: 5, liked: true })],
    });
    const notLiked = makeEntry({
      id: "not-liked",
      movie: makeMovie({ tmdb_id: 3, name: "C" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, liked: false })],
    });

    const result = filterLiked([likedByMe, likedByOther, notLiked], "u1");

    expect(result.map((e) => e.id)).toEqual(["liked-by-me"]);
  });
});

describe("searchEntries (Fuse.js fuzzy title search)", () => {
  const matrix = makeEntry({ id: "matrix", movie: makeMovie({ tmdb_id: 1, name: "The Matrix" }) });
  const inception = makeEntry({ id: "inception", movie: makeMovie({ tmdb_id: 2, name: "Inception" }) });

  it("is a no-op passthrough for queries shorter than 2 characters", () => {
    expect(searchEntries([matrix, inception], "")).toEqual([matrix, inception]);
    expect(searchEntries([matrix, inception], "m")).toEqual([matrix, inception]);
  });

  it("fuzzy-matches by movie title once 2+ characters are given", () => {
    const result = searchEntries([matrix, inception], "matrx");
    expect(result.map((e) => e.id)).toEqual(["matrix"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchEntries([matrix, inception], "zzzzz")).toEqual([]);
  });
});

describe("buildStreamingAvailabilityLookup", () => {
  it("marks a tmdb_id as available only when its cached data has at least one flatrate provider", () => {
    const lookup = buildStreamingAvailabilityLookup([
      {
        tmdb_id: 42,
        region: "DE",
        data: { flatrate: [{ provider_id: 8 }], rent: [], buy: [] },
        last_fetched_at: "2026-01-01T00:00:00Z",
      },
      {
        tmdb_id: 43,
        region: "DE",
        data: { flatrate: [], rent: [{ provider_id: 8 }], buy: [] },
        last_fetched_at: "2026-01-01T00:00:00Z",
      },
      { tmdb_id: 44, region: "DE", data: {}, last_fetched_at: "2026-01-01T00:00:00Z" },
      { tmdb_id: 45, region: "DE", data: null, last_fetched_at: "2026-01-01T00:00:00Z" },
    ]);

    expect(lookup.get(42)).toBe(true);
    expect(lookup.get(43)).toBeFalsy();
    expect(lookup.get(44)).toBeFalsy();
    expect(lookup.get(45)).toBeFalsy();
    expect(lookup.get(99)).toBeUndefined();
  });
});

describe("release_date_override (per-group effective release date)", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("getEffectiveReleaseDate prefers the override, falls back to the movie date, else null", () => {
    const movie = makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-01-01" });
    expect(getEffectiveReleaseDate(makeEntry({ id: "e1", movie }))).toBe("2026-01-01");
    expect(
      getEffectiveReleaseDate(makeEntry({ id: "e2", movie, release_date_override: "2026-09-09" })),
    ).toBe("2026-09-09");
    expect(
      getEffectiveReleaseDate(
        makeEntry({ id: "e3", movie: makeMovie({ tmdb_id: 2, name: "B" }), release_date_override: null }),
      ),
    ).toBeNull();
  });

  it("withEffectiveReleaseDate returns the movie with the effective date, without mutating the entry", () => {
    const movie = makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-01-01" });
    const entry = makeEntry({ id: "e1", movie, release_date_override: "2026-09-09" });
    expect(withEffectiveReleaseDate(entry).release_date).toBe("2026-09-09");
    expect(entry.movie.release_date).toBe("2026-01-01");
    expect(withEffectiveReleaseDate(makeEntry({ id: "e2", movie })).release_date).toBe("2026-01-01");
  });

  it("isUpcoming uses the override (past TMDB date moved into the future)", () => {
    const movie = makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-01-01" });
    const entry = makeEntry({ id: "e1", movie, release_date_override: "2026-12-01" });
    expect(isUpcoming(entry, new Map(), now)).toBe(true);
  });

  it("isUpcoming: override in the past removes a future TMDB date", () => {
    const movie = makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-12-01" });
    const entry = makeEntry({ id: "e1", movie, release_date_override: "2026-01-01" });
    expect(isUpcoming(entry, new Map(), now)).toBe(false);
  });

  it("filterUpcoming uses the effective date (override), keeps the order", () => {
    const a = makeEntry({
      id: "a",
      movie: makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-07-01" }),
      release_date_override: "2026-12-01",
    });
    const b = makeEntry({ id: "b", movie: makeMovie({ tmdb_id: 2, name: "B", release_date: "2026-09-01" }) });
    expect(filterUpcoming([a, b], new Map(), now).map((e) => e.id)).toEqual(["a", "b"]);
  });

  it("filterByYear('release_date') uses the override", () => {
    const entry = makeEntry({
      id: "a",
      movie: makeMovie({ tmdb_id: 1, name: "A", release_date: "2020-01-01" }),
      release_date_override: "2027-03-03",
    });
    expect(filterByYear([entry], 2027, "release_date")).toHaveLength(1);
    expect(filterByYear([entry], 2020, "release_date")).toHaveLength(0);
  });
});
