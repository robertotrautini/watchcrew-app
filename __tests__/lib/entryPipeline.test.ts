// Filter + sort + scope combinations as the Tagebuch/Watchlist screens chain them.
import { filterDiary, filterWatchlist, selectDiaryScope } from "@/lib/entryFiltering";
import { sortEntries } from "@/lib/entrySorting";
import { DEFAULT_ENTRY_FILTERS, type EntryFilters } from "@/lib/listFilters";
import { mapMyDiaryRows, type MyDiaryRow } from "@/lib/myDiary";
import { entry, genres, ids, movie } from "../helpers/entryFixtures";

const f = (patch: Partial<EntryFilters>): EntryFilters => ({ ...DEFAULT_ENTRY_FILTERS, ...patch });
const ctx = { userId: "u1", groupMemberIds: ["u1", "u2"] };

const d1 = entry("d1", movie(1, "Alpha", { ...genres("drama"), vote_average: 5 }), [
  { member_id: "u1", rating: 6, seen_at: "2026-01-10", liked: true },
  { member_id: "u2", rating: 8 },
]);
const d2 = entry("d2", movie(2, "Beta", { ...genres("drama", "comedy"), vote_average: 9 }), [
  { member_id: "u1", rating: 9, seen_at: "2025-05-05" },
]);
const d3 = entry("d3", movie(3, "Gamma", { ...genres("comedy"), vote_average: 7 }), [
  { member_id: "u1", rating: 2, seen_at: "2026-03-03", liked: true },
  { member_id: "u2", rating: 2 },
]);
const d4 = entry("d4", movie(4, "Delta", { ...genres("drama") }), [{ member_id: "u2", rating: 10 }]);
const d5 = entry("d5", movie(5, "Epsilon", { ...genres("drama") }), []);
const all = [d1, d2, d3, d4, d5];

describe("diary pipeline: scope -> filter -> sort", () => {
  it("group scope drops unrated entries, my_diary drops entries only others rated", () => {
    expect(ids(selectDiaryScope(all, "group", "u1"))).toEqual(["d1", "d2", "d3", "d4"]);
    expect(ids(selectDiaryScope(all, "my_diary", "u1"))).toEqual(["d1", "d2", "d3"]);
  });

  it("genre drama sorted by own rating desc / asc", () => {
    const base = filterDiary(selectDiaryScope(all, "group", "u1"), f({ genreIds: ["drama"] }), ctx);
    expect(ids(sortEntries(base, { field: "own", direction: "desc" }, { userId: "u1" }))).toEqual(["d2", "d1", "d4"]);
    // d4 has no own rating: last in both directions
    expect(ids(sortEntries(base, { field: "own", direction: "asc" }, { userId: "u1" }))).toEqual(["d1", "d2", "d4"]);
  });

  it("two genres are AND-combined (drama + comedy)", () => {
    expect(ids(filterDiary(all, f({ genreIds: ["drama", "comedy"] }), ctx))).toEqual(["d2"]);
  });

  it("genre + year + liked narrow together; sort order does not change the filter result set", () => {
    const filtered = filterDiary(all, f({ genreIds: ["drama"], year: 2026, liked: true }), ctx);
    expect(ids(filtered)).toEqual(["d1"]);
    for (const field of ["average", "own", "likes", "tmdb", "title", "seen_at"] as const) {
      expect(ids(sortEntries(filtered, { field, direction: "desc" }, { userId: "u1" }))).toEqual(["d1"]);
    }
  });

  it("genre comedy sorted by title desc and by tmdb asc", () => {
    const base = filterDiary(all, f({ genreIds: ["comedy"] }), ctx);
    expect(ids(sortEntries(base, { field: "title", direction: "desc" }, { userId: "u1" }))).toEqual(["d3", "d2"]);
    expect(ids(sortEntries(base, { field: "tmdb", direction: "asc" }, { userId: "u1" }))).toEqual(["d3", "d2"]);
  });

  it("seen_at sort: newest own seen date first, entry without own seen date last", () => {
    const base = selectDiaryScope(all, "group", "u1");
    expect(ids(sortEntries(base, { field: "seen_at", direction: "desc" }, { userId: "u1" }))).toEqual(["d3", "d1", "d2", "d4"]);
    expect(ids(sortEntries(base, { field: "seen_at", direction: "asc" }, { userId: "u1" }))).toEqual(["d2", "d1", "d3", "d4"]);
  });

  it("likes sort: more likes first, ties keep the received order", () => {
    const base = [d2, d1, d3];
    expect(ids(sortEntries(base, { field: "likes", direction: "desc" }, { userId: "u1" }))).toEqual(["d1", "d3", "d2"]);
  });

  it("allRated / missing are complementary over the group scope", () => {
    const base = selectDiaryScope(all, "group", "u1");
    const complete = filterDiary(base, f({ allRated: true }), ctx);
    const missing = filterDiary(base, f({ missing: true }), ctx);
    expect(ids(complete)).toEqual(["d1", "d3"]);
    expect(ids(missing)).toEqual(["d2", "d4"]);
  });

  it("a filter that matches nothing yields an empty list, sorting it is safe", () => {
    const none = filterDiary(all, f({ genreIds: ["horror"] }), ctx);
    expect(none).toEqual([]);
    expect(sortEntries(none, { field: "title", direction: "asc" }, { userId: "u1" })).toEqual([]);
  });
});

describe("watchlist pipeline: filter -> sort", () => {
  const w1 = entry("w1", movie(11, "Zeta", { ...genres("drama"), release_date: "2026-06-01" }), [], {
    added_at: "2026-01-01T00:00:00Z",
  });
  const w2 = entry("w2", movie(12, "Eta", { ...genres("drama"), release_date: "2024-02-02" }), [{ member_id: "u2", rating: 7 }], {
    added_at: "2026-02-01T00:00:00Z",
  });
  const w3 = entry("w3", movie(13, "Theta", { ...genres("comedy"), release_date: null }), [], {
    added_at: "2026-03-01T00:00:00Z",
  });
  const wl = [w1, w2, w3];
  const wctx = { userId: "u1" };

  it("genre drama + sorted by release asc / desc, undated last", () => {
    const base = filterWatchlist(wl, f({ genreIds: ["drama"] }), wctx);
    expect(ids(sortEntries(base, { field: "release", direction: "asc" }, wctx))).toEqual(["w2", "w1"]);
    expect(ids(sortEntries(base, { field: "release", direction: "desc" }, wctx))).toEqual(["w1", "w2"]);
    expect(ids(sortEntries(wl, { field: "release", direction: "asc" }, wctx))).toEqual(["w2", "w1", "w3"]);
  });

  it("added sort uses the timestamp", () => {
    expect(ids(sortEntries(wl, { field: "added", direction: "desc" }, wctx))).toEqual(["w3", "w2", "w1"]);
  });

  it("unrated + genre, hasRatings + genre", () => {
    expect(ids(filterWatchlist(wl, f({ genreIds: ["drama"], unrated: true }), wctx))).toEqual(["w1"]);
    expect(ids(filterWatchlist(wl, f({ genreIds: ["drama"], hasRatings: true }), wctx))).toEqual(["w2"]);
  });

  it("release year filter combined with sort by title", () => {
    const base = filterWatchlist(wl, f({ year: 2026 }), wctx);
    expect(ids(base)).toEqual(["w1"]);
    expect(ids(sortEntries(base, { field: "title", direction: "asc" }, wctx))).toEqual(["w1"]);
  });
});

describe("Mein Tagebuch (mapMyDiaryRows) through filter + sort", () => {
  const mv = (id: string, name: string, genre: string, extra = {}) => movie(Number(id.slice(1)), name, { id, ...genres(genre), ...extra });
  const rows: MyDiaryRow[] = [
    { user_id: "u1", movie_id: "m1", rating: 7, liked: false, seen_at: "2026-01-01", rated_at: "2026-01-02T00:00:00Z", movie: mv("m1", "Anton", "drama") },
    { user_id: "u1", movie_id: "m2", rating: 9, liked: true, seen_at: null, rated_at: "2026-02-02T00:00:00Z", movie: mv("m2", "Bruno", "drama") },
    { user_id: "u1", movie_id: "m3", rating: 4, liked: true, seen_at: "2025-03-03", rated_at: null, movie: mv("m3", "Cäsar", "comedy") },
    { user_id: "u1", movie_id: "m4", rating: null, liked: true, seen_at: null, rated_at: null, movie: mv("m4", "Dora", "drama") },
  ];
  const entries = mapMyDiaryRows(rows);
  const mctx = { userId: "u1", groupMemberIds: ["u1"] };

  it("drops the bare like and keeps the rest", () => {
    expect(ids(entries)).toEqual(["my-m1", "my-m2", "my-m3"]);
  });

  it("drama + own rating desc", () => {
    const base = filterDiary(entries, f({ genreIds: ["drama"] }), mctx);
    expect(ids(sortEntries(base, { field: "own", direction: "desc" }, mctx))).toEqual(["my-m2", "my-m1"]);
  });

  it("liked + title asc is locale-aware (Ä sorts with A)", () => {
    const base = filterDiary(entries, f({ liked: true }), mctx);
    expect(ids(sortEntries(base, { field: "title", direction: "asc" }, mctx))).toEqual(["my-m2", "my-m3"]);
  });

  it("year filter uses the own seen year; entries without seen date drop out", () => {
    expect(ids(filterDiary(entries, f({ year: 2026 }), mctx))).toEqual(["my-m1"]);
    expect(ids(filterDiary(entries, f({ year: "no_date" }), mctx))).toEqual(["my-m2"]);
  });

  it("every item is in 'my_diary' scope because it carries my rating row", () => {
    expect(ids(selectDiaryScope(entries, "my_diary", "u1"))).toEqual(["my-m1", "my-m2", "my-m3"]);
  });
});
