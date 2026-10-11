import {
  nextColumnSort,
  sortDiaryByColumn,
  sortWatchlistByColumn,
} from "@/lib/columnSort";
import type { Movie, Rating, WatchlistEntry } from "@/lib/watchlistTypes";

function movie(tmdb_id: number, name: string, extra: Partial<Movie> = {}): Movie {
  return {
    id: `m${tmdb_id}`,
    tmdb_id,
    name,
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    movie_genres: [],
    ...extra,
  } as Movie;
}

function entry(
  id: string,
  m: Movie,
  ratings: Partial<Rating>[] = [],
  extra: Partial<WatchlistEntry> = {},
): WatchlistEntry {
  return {
    id,
    movie: m,
    added_at: "2026-01-01T00:00:00Z",
    release_date_override: null,
    ratings: ratings.map((r) => ({
      member_id: "u1",
      rating: null,
      liked: false,
      seen_at: null,
      ...r,
    })),
    ...extra,
  } as unknown as WatchlistEntry;
}

const ids = (list: WatchlistEntry[]) => list.map((e) => e.id);

describe("nextColumnSort", () => {
  it("cycles asc -> desc -> null", () => {
    const a = nextColumnSort(null, "title");
    expect(a).toEqual({ column: "title", direction: "asc" });
    const b = nextColumnSort(a, "title");
    expect(b).toEqual({ column: "title", direction: "desc" });
    expect(nextColumnSort(b, "title")).toBeNull();
  });

  it("another column starts at asc", () => {
    expect(
      nextColumnSort({ column: "title", direction: "desc" }, "tmdb"),
    ).toEqual({ column: "tmdb", direction: "asc" });
  });
});

describe("sortDiaryByColumn", () => {
  const entries = [
    entry("b", movie(2, "Bravo", { vote_average: 7 }), [{ rating: 4, liked: true }]),
    entry("n", movie(3, "Ärger", { vote_average: null }), [{ rating: 2 }]),
    entry("a", movie(1, "alpha", { vote_average: 9 }), [
      { rating: 5, liked: false },
      { member_id: "u2", rating: 4 },
    ]),
  ];

  it("returns the input order without a column sort", () => {
    expect(ids(sortDiaryByColumn(entries, null, "u1"))).toEqual(["b", "n", "a"]);
  });

  it("title A-Z and Z-A, case/umlaut insensitive", () => {
    expect(
      ids(sortDiaryByColumn(entries, { column: "title", direction: "asc" }, "u1")),
    ).toEqual(["a", "n", "b"]);
    expect(
      ids(sortDiaryByColumn(entries, { column: "title", direction: "desc" }, "u1")),
    ).toEqual(["b", "n", "a"]);
  });

  it("average rating, missing values last in both directions", () => {
    const withNull = [...entries, entry("z", movie(4, "Zulu"), [])];
    expect(
      ids(sortDiaryByColumn(withNull, { column: "average", direction: "desc" }, "u1")),
    ).toEqual(["a", "b", "n", "z"]);
    expect(
      ids(sortDiaryByColumn(withNull, { column: "average", direction: "asc" }, "u1")),
    ).toEqual(["n", "b", "a", "z"]);
  });

  it("tmdb score, null last both directions", () => {
    expect(
      ids(sortDiaryByColumn(entries, { column: "tmdb", direction: "desc" }, "u1")),
    ).toEqual(["a", "b", "n"]);
    expect(
      ids(sortDiaryByColumn(entries, { column: "tmdb", direction: "asc" }, "u1")),
    ).toEqual(["b", "a", "n"]);
  });

  it("liked (own) first when desc", () => {
    expect(
      ids(sortDiaryByColumn(entries, { column: "liked", direction: "desc" }, "u1")),
    ).toEqual(["b", "n", "a"]);
    expect(
      ids(sortDiaryByColumn(entries, { column: "liked", direction: "asc" }, "u1")),
    ).toEqual(["n", "a", "b"]);
  });

  it("is stable and does not mutate", () => {
    const copy = [...entries];
    const tie = [
      entry("x", movie(5, "Same", { vote_average: 5 })),
      entry("y", movie(6, "Same", { vote_average: 5 })),
    ];
    expect(
      ids(sortDiaryByColumn(tie, { column: "tmdb", direction: "desc" }, "u1")),
    ).toEqual(["x", "y"]);
    sortDiaryByColumn(entries, { column: "title", direction: "asc" }, "u1");
    expect(entries).toEqual(copy);
  });
});

describe("sortWatchlistByColumn", () => {
  const list = [
    entry("late", movie(1, "B", { release_date: "2026-05-01" })),
    entry("none", movie(2, "A")),
    entry("early", movie(3, "C", { release_date: "2020-01-01" })),
    entry("over", movie(4, "D", { release_date: "2030-01-01" }), [], {
      release_date_override: "2019-01-01",
    }),
  ];

  it("release date uses the effective date, missing last both ways", () => {
    expect(
      ids(sortWatchlistByColumn(list, { column: "release", direction: "asc" })),
    ).toEqual(["over", "early", "late", "none"]);
    expect(
      ids(sortWatchlistByColumn(list, { column: "release", direction: "desc" })),
    ).toEqual(["late", "early", "over", "none"]);
  });

  it("title sort", () => {
    expect(
      ids(sortWatchlistByColumn(list, { column: "title", direction: "asc" })),
    ).toEqual(["none", "late", "early", "over"]);
  });

  it("null state passes through", () => {
    expect(ids(sortWatchlistByColumn(list, null))).toEqual(ids(list));
  });
});
