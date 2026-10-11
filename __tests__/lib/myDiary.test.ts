import { getAverageRating, getOwnRating, getOwnSeenAt, isLikedBy, hasOwnRating } from "@/lib/entrySelectors";
import { filterDiary } from "@/lib/entryFiltering";
import { sortEntries } from "@/lib/entrySorting";
import { DEFAULT_ENTRY_FILTERS } from "@/lib/listFilters";
import { isSeenRow, mapMyDiaryRows, myDiaryEntryId, type MyDiaryRow } from "@/lib/myDiary";
import type { Movie } from "@/lib/watchlistTypes";

function movie(n: number, overrides: Partial<Movie> = {}): Movie {
  return {
    id: `m${n}`,
    tmdb_id: n,
    name: `Film ${n}`,
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

function row(n: number, overrides: Partial<MyDiaryRow> = {}): MyDiaryRow {
  return {
    user_id: "u1",
    movie_id: `m${n}`,
    rating: 4,
    liked: false,
    seen_at: "2026-01-02",
    rated_at: "2026-01-02T10:00:00Z",
    movie: movie(n),
    ...overrides,
  };
}

describe("mapMyDiaryRows", () => {
  it("maps a row to an entry without group fields and with exactly my rating row", () => {
    const [entry] = mapMyDiaryRows([row(1, { liked: true })]);

    expect(entry).toMatchObject({
      id: myDiaryEntryId("m1"),
      group_id: "",
      movie_id: "m1",
      added_by: null,
      paid_by_member_id: null,
      paid_at: null,
      movie: { tmdb_id: 1 },
      ratings: [{ member_id: "u1", rating: 4, liked: true, seen_at: "2026-01-02", rated_at: "2026-01-02T10:00:00Z" }],
    });
  });

  it("keeps rows that are rated OR have a seen date, drops bare likes, rating 0 without date and rows without movie", () => {
    const entries = mapMyDiaryRows([
      row(1),
      row(2, { rating: null, seen_at: "2025-05-05" }),
      row(3, { rating: null, seen_at: null, liked: true }),
      row(4, { rating: 0, seen_at: null }),
      row(5, { movie: null }),
    ]);

    expect(entries.map((e) => e.movie_id)).toEqual(["m1", "m2"]);
  });

  it("isSeenRow follows ADR 0014 (seen_at or real rating)", () => {
    expect(isSeenRow({ rating: 0.5, seen_at: null })).toBe(true);
    expect(isSeenRow({ rating: null, seen_at: "2020-01-01" })).toBe(true);
    expect(isSeenRow({ rating: null, seen_at: null })).toBe(false);
  });

  it("works with the existing selectors, filters and sorting (own rating, like, seen year, genre)", () => {
    const entries = mapMyDiaryRows([
      row(1, { rating: 3, liked: true, seen_at: "2024-03-03", movie: movie(1, { movie_genres: [{ genre_id: "g-a" }] }) }),
      row(2, { rating: 5, liked: false, seen_at: "2025-03-03", movie: movie(2, { name: "Aaa" }) }),
    ]);
    const [a, b] = entries;

    expect(getOwnRating(a, "u1")).toBe(3);
    expect(getAverageRating(a)).toBe(3);
    expect(getOwnSeenAt(a, "u1")).toBe("2024-03-03");
    expect(isLikedBy(a, "u1")).toBe(true);
    expect(hasOwnRating(b, "u1")).toBe(true);

    const ctx = { userId: "u1" };
    expect(sortEntries(entries, { field: "own", direction: "desc" }, ctx).map((e) => e.movie_id)).toEqual(["m2", "m1"]);
    expect(sortEntries(entries, { field: "title", direction: "asc" }, ctx).map((e) => e.movie_id)).toEqual(["m2", "m1"]);
    expect(sortEntries(entries, { field: "likes", direction: "desc" }, ctx).map((e) => e.movie_id)).toEqual(["m1", "m2"]);

    expect(filterDiary(entries, { ...DEFAULT_ENTRY_FILTERS, genreIds: ["g-a"] }, ctx).map((e) => e.movie_id)).toEqual(["m1"]);
    expect(filterDiary(entries, { ...DEFAULT_ENTRY_FILTERS, year: 2025 }, ctx).map((e) => e.movie_id)).toEqual(["m2"]);
    expect(filterDiary(entries, { ...DEFAULT_ENTRY_FILTERS, liked: true }, ctx).map((e) => e.movie_id)).toEqual(["m1"]);
  });
});
