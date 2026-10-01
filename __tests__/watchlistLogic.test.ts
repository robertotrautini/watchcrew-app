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
  isUpcoming,
  searchEntries,
  sortByAddedAtDesc,
  sortByAverageRatingDesc,
  sortByTmdbScoreDesc,
  filterByMyStreaming,
  sortDiary,
  sortMyDiary,
  sortWatchlist,
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

describe("sortByAddedAtDesc", () => {
  it("orders entries by added_at descending", () => {
    const older = makeEntry({ id: "old", movie: makeMovie({ tmdb_id: 1, name: "A" }), added_at: "2026-01-01T00:00:00Z" });
    const newer = makeEntry({ id: "new", movie: makeMovie({ tmdb_id: 2, name: "B" }), added_at: "2026-03-01T00:00:00Z" });

    const result = sortByAddedAtDesc([older, newer]);

    expect(result.map((e) => e.id)).toEqual(["new", "old"]);
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
  it("filters to only upcoming entries and orders soonest dated release first, undated last", () => {
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

    expect(result.map((e) => e.id)).toEqual(["soon", "later", "undated"]);
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

describe("sortByTmdbScoreDesc", () => {
  it("sorts by vote_average descending, with nulls last", () => {
    const low = makeEntry({ id: "low", movie: makeMovie({ tmdb_id: 1, name: "A", vote_average: 5.5 }) });
    const high = makeEntry({ id: "high", movie: makeMovie({ tmdb_id: 2, name: "B", vote_average: 8.2 }) });
    const noScore = makeEntry({ id: "none", movie: makeMovie({ tmdb_id: 3, name: "C", vote_average: null }) });

    const result = sortByTmdbScoreDesc([low, noScore, high]);

    expect(result.map((e) => e.id)).toEqual(["high", "low", "none"]);
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

describe("sortMyDiary (diary default)", () => {
  it("keeps only entries the current user rated, sorted by own seen_at descending, nulls last", () => {
    const notRatedByMe = makeEntry({
      id: "not-mine",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u2", rating: 5, seen_at: "2026-01-01" })],
    });
    const seenEarlier = makeEntry({
      id: "earlier",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-01-01" })],
    });
    const seenLater = makeEntry({
      id: "later",
      movie: makeMovie({ tmdb_id: 3, name: "C" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: "2026-05-01" })],
    });
    const noSeenAt = makeEntry({
      id: "no-seen-at",
      movie: makeMovie({ tmdb_id: 4, name: "D" }),
      ratings: [makeRating({ member_id: "u1", rating: 2, seen_at: null })],
    });

    const result = sortMyDiary([notRatedByMe, seenEarlier, seenLater, noSeenAt], "u1");

    expect(result.map((e) => e.id)).toEqual(["later", "earlier", "no-seen-at"]);
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

  it("filterAllRated keeps only entries where every member has a non-null rating row, sorted by average desc", () => {
    const result = filterAllRated(allEntries, members);

    expect(result.map((e) => e.id)).toEqual(["all-rated", "zero-rating-all-rated"]);
    // all-rated avg = (4+3+5)/3 = 4.0; zero-rating avg = (0+3+5)/3 = 2.67 -> all-rated first.
    expect(result[0].id).toBe("all-rated");
  });

  it("filterMissing keeps entries where at least one member lacks a non-null rating (null row or no row at all)", () => {
    const result = filterMissing(allEntries, members);

    expect(result.map((e) => e.id).sort()).toEqual(["missing-member", "null-rating"]);
  });
});

describe("sortByAverageRatingDesc", () => {
  it("orders by average of non-null ratings descending, entries with no ratings last", () => {
    const highAvg = makeEntry({
      id: "high",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 5 }), makeRating({ member_id: "u2", rating: 4 })],
    });
    const lowAvg = makeEntry({
      id: "low",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 2 })],
    });
    const noRatings = makeEntry({ id: "none", movie: makeMovie({ tmdb_id: 3, name: "C" }) });

    const result = sortByAverageRatingDesc([lowAvg, noRatings, highAvg]);

    expect(result.map((e) => e.id)).toEqual(["high", "low", "none"]);
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

describe("sortWatchlist dispatcher", () => {
  it("dispatches 'added' to sortByAddedAtDesc", () => {
    const older = makeEntry({ id: "old", movie: makeMovie({ tmdb_id: 1, name: "A" }), added_at: "2026-01-01T00:00:00Z" });
    const newer = makeEntry({ id: "new", movie: makeMovie({ tmdb_id: 2, name: "B" }), added_at: "2026-02-01T00:00:00Z" });

    expect(sortWatchlist([older, newer], "added").map((e) => e.id)).toEqual(["new", "old"]);
  });

  it("dispatches 'upcoming' using context.streamingAvailability and context.now", () => {
    const now = new Date("2026-06-15T00:00:00Z");
    const future = makeEntry({ id: "future", movie: makeMovie({ tmdb_id: 1, name: "A", release_date: "2026-12-01" }) });
    const past = makeEntry({ id: "past", movie: makeMovie({ tmdb_id: 2, name: "B", release_date: "2020-01-01" }) });

    const result = sortWatchlist([future, past], "upcoming", { streamingAvailability: new Map(), now });

    expect(result.map((e) => e.id)).toEqual(["future"]);
  });

  it("dispatches 'genre' using context.genreIds", () => {
    const withGenre = makeEntry({
      id: "with",
      movie: makeMovie({ tmdb_id: 1, name: "A", movie_genres: [{ genre_id: GENRE_ACTION }] }),
    });
    const without = makeEntry({ id: "without", movie: makeMovie({ tmdb_id: 2, name: "B" }) });

    expect(
      sortWatchlist([withGenre, without], "genre", { genreIds: [GENRE_ACTION] }).map((e) => e.id)
    ).toEqual(["with"]);
  });
});

describe("sortDiary dispatcher", () => {
  it("dispatches 'my_diary' (default) to the current user's own rated entries", () => {
    const mine = makeEntry({
      id: "mine",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-01-01" })],
    });
    const notMine = makeEntry({
      id: "not-mine",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u2", rating: 5, seen_at: "2026-01-01" })],
    });

    expect(sortDiary([mine, notMine], "my_diary", "u1").map((e) => e.id)).toEqual(["mine"]);
  });

  it("dispatches 'all_rated' using context.groupMemberIds", () => {
    const entry = makeEntry({
      id: "all-rated",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4 }), makeRating({ member_id: "u2", rating: 3 })],
    });
    const incomplete = makeEntry({
      id: "incomplete",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 4 })],
    });

    const result = sortDiary([entry, incomplete], "all_rated", "u1", { groupMemberIds: ["u1", "u2"] });

    expect(result.map((e) => e.id)).toEqual(["all-rated"]);
  });

  it("dispatches 'year' using the CURRENT USER's own seen_at (context.year)", () => {
    const seen2026 = makeEntry({
      id: "2026",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, seen_at: "2026-03-01" })],
    });
    const seen2020 = makeEntry({
      id: "2020",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 3, seen_at: "2020-03-01" })],
    });

    expect(sortDiary([seen2026, seen2020], "year", "u1", { year: 2026 }).map((e) => e.id)).toEqual([
      "2026",
    ]);
  });

  it("dispatches 'liked' to the current user's own liked entries", () => {
    const liked = makeEntry({
      id: "liked",
      movie: makeMovie({ tmdb_id: 1, name: "A" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, liked: true })],
    });
    const notLiked = makeEntry({
      id: "not-liked",
      movie: makeMovie({ tmdb_id: 2, name: "B" }),
      ratings: [makeRating({ member_id: "u1", rating: 4, liked: false })],
    });

    expect(sortDiary([liked, notLiked], "liked", "u1").map((e) => e.id)).toEqual(["liked"]);
  });

  it("sortWatchlist dispatches 'my_streaming' to filterByMyStreaming too", () => {
    const a = makeEntry({ id: "a", movie: makeMovie({ tmdb_id: 1, name: "A" }) });
    const b = makeEntry({ id: "b", movie: makeMovie({ tmdb_id: 2, name: "B" }) });
    const providersByTmdbId = new Map([
      [1, { flatrate: [{ provider_id: 8, provider_name: "N" }], rent: [], buy: [] }],
    ]);

    expect(
      sortWatchlist([b, a], "my_streaming", { providersByTmdbId, myProviderIds: [8] }).map((e) => e.id)
    ).toEqual(["a"]);
  });

  it("dispatches 'my_streaming' to filterByMyStreaming (default category: flatrate)", () => {
    const a = makeEntry({ id: "a", movie: makeMovie({ tmdb_id: 1, name: "A" }) });
    const b = makeEntry({ id: "b", movie: makeMovie({ tmdb_id: 2, name: "B" }) });
    const providersByTmdbId = new Map([
      [1, { flatrate: [{ provider_id: 8, provider_name: "N" }], rent: [], buy: [] }],
      [2, { flatrate: [], rent: [{ provider_id: 8, provider_name: "N" }], buy: [] }],
    ]);
    const context = { providersByTmdbId, myProviderIds: [8] };

    expect(sortDiary([b, a], "my_streaming", "u1", context).map((e) => e.id)).toEqual(["a"]);
    expect(
      sortDiary([b, a], "my_streaming", "u1", { ...context, providerCategories: ["rent"] }).map((e) => e.id)
    ).toEqual(["b"]);
  });
});
