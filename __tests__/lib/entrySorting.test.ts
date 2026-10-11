import {
  DEFAULT_DIARY_SORT,
  DEFAULT_WATCHLIST_SORT,
  DIARY_SORT_FIELDS,
  WATCHLIST_SORT_FIELDS,
  isSameSort,
  nextHeaderSort,
  sortEntries,
} from "@/lib/entrySorting";
import { entry, genres, ids, movie } from "../helpers/entryFixtures";

const a = entry(
  "a",
  movie(1, "Äpfel", { vote_average: 6, release_date: "2026-03-01" }),
  [
    { member_id: "u1", rating: 8, liked: true, seen_at: "2026-02-01" },
    { member_id: "u2", rating: 6, liked: true },
  ],
  { added_at: "2026-01-03T00:00:00Z" },
);
const b = entry(
  "b",
  movie(2, "Birne", { vote_average: 8, release_date: "2025-01-01" }),
  [{ member_id: "u1", rating: 10, liked: false, seen_at: "2026-05-01" }],
  { added_at: "2026-01-02T00:00:00Z" },
);
const n = entry("n", movie(3, "Zitrone"), [{ member_id: "u1", rating: 1 }], {
  added_at: "2026-01-01T00:00:00Z",
});
const ctx = { userId: "u1" };

describe("field lists and defaults", () => {
  it("diary offers Bewertung Ø, Eigene Bewertung, Likes, TMDB, Titel, Gesehen am", () => {
    expect(DIARY_SORT_FIELDS.map((f) => f.label)).toEqual([
      "Bewertung Ø",
      "Eigene Bewertung",
      "Likes",
      "TMDB",
      "Titel",
      "Gesehen am",
    ]);
  });

  it("watchlist offers Hinzugefügt, TMDB, Titel, Erscheinungsdatum", () => {
    expect(WATCHLIST_SORT_FIELDS.map((f) => f.label)).toEqual([
      "Hinzugefügt",
      "TMDB",
      "Titel",
      "Erscheinungsdatum",
    ]);
  });

  it("defaults: diary average desc, watchlist added desc", () => {
    expect(DEFAULT_DIARY_SORT).toEqual({ field: "average", direction: "desc" });
    expect(DEFAULT_WATCHLIST_SORT).toEqual({ field: "added", direction: "desc" });
  });
});

describe("sortEntries", () => {
  it("average: desc / asc, no-rating entries last in both directions", () => {
    const none = entry("none", movie(4, "X"), []);
    expect(
      ids(sortEntries([none, a, b], { field: "average", direction: "desc" }, ctx)),
    ).toEqual(["b", "a", "none"]);
    expect(
      ids(sortEntries([none, a, b], { field: "average", direction: "asc" }, ctx)),
    ).toEqual(["a", "b", "none"]);
  });

  it("own: sorts by the current user's own rating", () => {
    expect(
      ids(sortEntries([n, a, b], { field: "own", direction: "desc" }, ctx)),
    ).toEqual(["b", "a", "n"]);
  });

  it("likes: sorts by number of likes", () => {
    expect(
      ids(sortEntries([b, a], { field: "likes", direction: "desc" }, ctx)),
    ).toEqual(["a", "b"]);
    expect(
      ids(sortEntries([a, b], { field: "likes", direction: "asc" }, ctx)),
    ).toEqual(["b", "a"]);
  });

  it("tmdb: null score last", () => {
    expect(
      ids(sortEntries([n, a, b], { field: "tmdb", direction: "desc" }, ctx)),
    ).toEqual(["b", "a", "n"]);
    expect(
      ids(sortEntries([n, a, b], { field: "tmdb", direction: "asc" }, ctx)),
    ).toEqual(["a", "b", "n"]);
  });

  it("title: locale-aware (Ä with A), asc/desc", () => {
    expect(
      ids(sortEntries([n, b, a], { field: "title", direction: "asc" }, ctx)),
    ).toEqual(["a", "b", "n"]);
    expect(
      ids(sortEntries([a, b, n], { field: "title", direction: "desc" }, ctx)),
    ).toEqual(["n", "b", "a"]);
  });

  it("seen_at: own seen date, missing last", () => {
    expect(
      ids(sortEntries([n, a, b], { field: "seen_at", direction: "desc" }, ctx)),
    ).toEqual(["b", "a", "n"]);
    expect(
      ids(sortEntries([n, b, a], { field: "seen_at", direction: "asc" }, ctx)),
    ).toEqual(["a", "b", "n"]);
  });

  it("added: by added_at", () => {
    expect(
      ids(sortEntries([b, n, a], { field: "added", direction: "desc" }, ctx)),
    ).toEqual(["a", "b", "n"]);
  });

  it("release: effective release date (override wins), undated last", () => {
    const over = entry("o", movie(5, "O", { release_date: "2020-01-01" }), [], {
      release_date_override: "2030-01-01",
    });
    expect(
      ids(sortEntries([n, a, b, over], { field: "release", direction: "desc" }, ctx)),
    ).toEqual(["o", "a", "b", "n"]);
  });

  it("is stable and does not mutate the input", () => {
    const x = entry("x", movie(6, "X", { vote_average: 7 }));
    const y = entry("y", movie(7, "Y", { vote_average: 7 }));
    const input = [x, y];
    expect(ids(sortEntries(input, { field: "tmdb", direction: "desc" }, ctx))).toEqual(["x", "y"]);
    expect(ids(sortEntries(input, { field: "tmdb", direction: "asc" }, ctx))).toEqual(["x", "y"]);
    expect(ids(input)).toEqual(["x", "y"]);
  });

  it("sorting never drops or filters entries (decoupled from filters)", () => {
    const horror = entry("h", movie(8, "H", genres("horror")), [{ rating: 9 }]);
    expect(sortEntries([horror, a, b, n], DEFAULT_DIARY_SORT, ctx)).toHaveLength(4);
  });
});

describe("nextHeaderSort (asc -> desc -> back to default)", () => {
  it("another field starts at asc", () => {
    expect(
      nextHeaderSort({ field: "average", direction: "desc" }, "title", DEFAULT_DIARY_SORT),
    ).toEqual({ field: "title", direction: "asc" });
  });

  it("asc -> desc -> default", () => {
    const first = nextHeaderSort(DEFAULT_DIARY_SORT, "title", DEFAULT_DIARY_SORT);
    const second = nextHeaderSort(first, "title", DEFAULT_DIARY_SORT);
    expect(second).toEqual({ field: "title", direction: "desc" });
    expect(nextHeaderSort(second, "title", DEFAULT_DIARY_SORT)).toEqual(DEFAULT_DIARY_SORT);
  });

  it("tapping the default field in default state flips to asc, then back to default", () => {
    const asc = nextHeaderSort(DEFAULT_DIARY_SORT, "average", DEFAULT_DIARY_SORT);
    expect(asc).toEqual({ field: "average", direction: "asc" });
    expect(nextHeaderSort(asc, "average", DEFAULT_DIARY_SORT)).toEqual(DEFAULT_DIARY_SORT);
  });
});

describe("isSameSort", () => {
  it("compares field and direction", () => {
    expect(isSameSort(DEFAULT_DIARY_SORT, { field: "average", direction: "desc" })).toBe(true);
    expect(isSameSort(DEFAULT_DIARY_SORT, { field: "average", direction: "asc" })).toBe(false);
  });
});
