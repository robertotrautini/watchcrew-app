import { filterDiary, filterWatchlist, selectDiaryScope } from "@/lib/entryFiltering";
import { sortEntries } from "@/lib/entrySorting";
import { DEFAULT_ENTRY_FILTERS, type EntryFilters } from "@/lib/listFilters";
import { entry, genres, ids, movie } from "../helpers/entryFixtures";

const f = (patch: Partial<EntryFilters>): EntryFilters => ({
  ...DEFAULT_ENTRY_FILTERS,
  ...patch,
});

const providers = (flat: number[], rent: number[] = []) => ({
  flatrate: flat.map((provider_id) => ({ provider_id, provider_name: "p" })),
  rent: rent.map((provider_id) => ({ provider_id, provider_name: "p" })),
  buy: [],
});

const horrorA = entry(
  "hA",
  movie(1, "Nacht", { ...genres("horror"), vote_average: 7 }),
  [
    { member_id: "u1", rating: 8, liked: true, seen_at: "2026-02-01" },
    { member_id: "u2", rating: 6 },
  ],
);
const horrorB = entry(
  "hB",
  movie(2, "Keller", { ...genres("horror", "thriller"), vote_average: 5 }),
  [{ member_id: "u1", rating: 4, seen_at: "2025-06-01" }],
);
const drama = entry(
  "d",
  movie(3, "Stille", { ...genres("drama"), vote_average: 8 }),
  [
    { member_id: "u1", rating: 10, liked: true, seen_at: "2026-03-01" },
    { member_id: "u2", rating: 9 },
  ],
);
const all = [horrorA, horrorB, drama];
const ctx = { userId: "u1", groupMemberIds: ["u1", "u2"] };

describe("filterDiary", () => {
  it("no filters keeps everything, in the received order", () => {
    expect(ids(filterDiary(all, DEFAULT_ENTRY_FILTERS, ctx))).toEqual(["hA", "hB", "d"]);
  });

  it("genre (AND)", () => {
    expect(ids(filterDiary(all, f({ genreIds: ["horror"] }), ctx))).toEqual(["hA", "hB"]);
    expect(
      ids(filterDiary(all, f({ genreIds: ["horror", "thriller"] }), ctx)),
    ).toEqual(["hB"]);
  });

  it("year uses the own seen_at year", () => {
    expect(ids(filterDiary(all, f({ year: 2026 }), ctx))).toEqual(["hA", "d"]);
    expect(ids(filterDiary(all, f({ year: 2025 }), ctx))).toEqual(["hB"]);
  });

  it("liked = liked by me", () => {
    expect(ids(filterDiary(all, f({ liked: true }), ctx))).toEqual(["hA", "d"]);
  });

  it("allRated / missing", () => {
    expect(ids(filterDiary(all, f({ allRated: true }), ctx))).toEqual(["hA", "d"]);
    expect(ids(filterDiary(all, f({ missing: true }), ctx))).toEqual(["hB"]);
    expect(ids(filterDiary(all, f({ allRated: true, missing: true }), ctx))).toEqual([]);
  });

  it("streaming: only own services within the chosen categories; unloaded providers drop out", () => {
    const map = new Map([
      [1, providers([8])],
      [2, providers([], [8])],
      [3, providers([9])],
    ]);
    const c = { ...ctx, providersByTmdbId: map, myProviderIds: [8] };
    expect(ids(filterDiary(all, f({ myStreaming: true }), c))).toEqual(["hA"]);
    expect(
      ids(filterDiary(all, f({ myStreaming: true, providerCategories: ["flatrate", "rent"] }), c)),
    ).toEqual(["hA", "hB"]);
    expect(ids(filterDiary(all, f({ myStreaming: true }), ctx))).toEqual([]);
    // flag off: categories are ignored
    expect(ids(filterDiary(all, f({ providerCategories: ["rent"] }), c))).toHaveLength(3);
  });

  it("combines with AND: Genre Horror + liked", () => {
    expect(
      ids(filterDiary(all, f({ genreIds: ["horror"], liked: true }), ctx)),
    ).toEqual(["hA"]);
  });

  it("Genre Horror + sorted by rating desc (filter and sort are independent)", () => {
    const filtered = filterDiary(all, f({ genreIds: ["horror"] }), ctx);
    expect(
      ids(sortEntries(filtered, { field: "average", direction: "desc" }, { userId: "u1" })),
    ).toEqual(["hA", "hB"]);
    expect(
      ids(sortEntries(filtered, { field: "average", direction: "asc" }, { userId: "u1" })),
    ).toEqual(["hB", "hA"]);
  });
});

describe("filterWatchlist", () => {
  const now = new Date("2026-06-01T00:00:00Z");
  const future = entry("fut", movie(10, "F", { release_date: "2027-01-01", ...genres("horror") }));
  const past = entry("past", movie(11, "P", { release_date: "2020-05-05" }), [
    { member_id: "u2", rating: 7 },
  ]);
  const undatedAvailable = entry("av", movie(12, "A"));
  const undatedNot = entry("no", movie(13, "N"));
  const list = [future, past, undatedAvailable, undatedNot];
  const wctx = {
    userId: "u1",
    now,
    streamingAvailability: new Map([[12, true]]),
  };

  it("upcoming keeps the received order (no reordering)", () => {
    expect(ids(filterWatchlist(list, f({ upcoming: true }), wctx))).toEqual(["fut", "no"]);
  });

  it("unrated / hasRatings", () => {
    expect(ids(filterWatchlist(list, f({ unrated: true }), wctx))).toEqual(["fut", "av", "no"]);
    expect(ids(filterWatchlist(list, f({ hasRatings: true }), wctx))).toEqual(["past"]);
  });

  it("year uses the release year, genre combines", () => {
    expect(ids(filterWatchlist(list, f({ year: 2020 }), wctx))).toEqual(["past"]);
    expect(
      ids(filterWatchlist(list, f({ genreIds: ["horror"], upcoming: true }), wctx)),
    ).toEqual(["fut"]);
  });

  it("diary-only flags are ignored", () => {
    expect(ids(filterWatchlist(list, f({ allRated: true, missing: true }), wctx))).toHaveLength(4);
  });
});

describe("selectDiaryScope", () => {
  const foreign = entry("x", movie(20, "X"), [{ member_id: "u2", rating: 5 }]);
  const nobody = entry("z", movie(21, "Z"), []);
  it("my_diary = rated by me; group = rated by anyone", () => {
    const list = [horrorA, foreign, nobody];
    expect(ids(selectDiaryScope(list, "my_diary", "u1"))).toEqual(["hA"]);
    expect(ids(selectDiaryScope(list, "group", "u1"))).toEqual(["hA", "x"]);
  });
});
