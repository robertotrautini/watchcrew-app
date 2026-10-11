import {
  collapseListFiltersPerTab,
  migrateListFilters,
  migrateListFiltersRecord,
  DEFAULT_ENTRY_FILTERS,
  DEFAULT_LIST_FILTERS,
} from "@/lib/listFilters";

describe("migrateListFilters edge cases", () => {
  it.each([null, undefined, "x", 3, true])("non-object %p -> defaults", (raw) => {
    expect(migrateListFilters(raw, "diary")).toBe(DEFAULT_LIST_FILTERS);
  });

  it("unknown sortOption -> default sort and no filter", () => {
    const r = migrateListFilters({ sortOption: "does_not_exist", genreIds: ["x"] }, "watchlist");
    expect(r.sort).toBeNull();
    expect(r.filters).toEqual(DEFAULT_ENTRY_FILTERS);
  });

  it("genre option drops non-string ids and survives a non-array", () => {
    expect(migrateListFilters({ sortOption: "genre", genreIds: ["a", 1, null, "b"] }, "diary").filters.genreIds).toEqual(["a", "b"]);
    expect(migrateListFilters({ sortOption: "genre", genreIds: "a" }, "diary").filters.genreIds).toEqual([]);
  });

  it("year option accepts numbers and 'no_date', rejects anything else", () => {
    expect(migrateListFilters({ sortOption: "year", year: 2020 }, "diary").filters.year).toBe(2020);
    expect(migrateListFilters({ sortOption: "year", year: "no_date" }, "diary").filters.year).toBe("no_date");
    expect(migrateListFilters({ sortOption: "year", year: "2020" }, "diary").filters.year).toBeNull();
  });

  it("provider categories: invalid entries filtered, empty/invalid -> default, canonical order", () => {
    const cats = (v: unknown) =>
      migrateListFilters({ sortOption: "my_streaming", providerCategories: v }, "watchlist").filters.providerCategories;
    expect(cats(["buy", "bogus", "flatrate"])).toEqual(["flatrate", "buy"]);
    expect(cats(["bogus"])).toEqual(["flatrate"]);
    expect(cats([])).toEqual(["flatrate"]);
    expect(cats("rent")).toEqual(["flatrate"]);
  });

  it.each([
    ["upcoming", "upcoming"],
    ["unrated", "unrated"],
    ["has_ratings", "hasRatings"],
    ["all_rated", "allRated"],
    ["missing", "missing"],
    ["liked", "liked"],
  ] as const)("sortOption %s switches on exactly the %s filter", (option, field) => {
    const { filters, sort } = migrateListFilters({ sortOption: option }, "diary");
    expect(sort).toBeNull();
    const on = Object.entries(filters).filter(([, v]) => v === true).map(([k]) => k);
    expect(on).toEqual([field]);
  });

  it("new shape: non-object sort becomes null and partial filters merge over defaults", () => {
    const r = migrateListFilters({ sort: "bad", filters: { liked: true } }, "diary");
    expect(r.sort).toBeNull();
    expect(r.filters).toEqual({ ...DEFAULT_ENTRY_FILTERS, liked: true });
  });

  it("new shape with a non-object filters value falls back to defaults", () => {
    expect(migrateListFilters({ sort: null, filters: 5 }, "diary").filters).toEqual(DEFAULT_ENTRY_FILTERS);
  });

  it("a row carrying both sortOption and sort is treated as old shape", () => {
    const r = migrateListFilters({ sortOption: "tmdb_score", sort: { field: "title", direction: "asc" } }, "watchlist");
    expect(r.sort).toEqual({ field: "tmdb", direction: "desc" });
  });
});

describe("migrateListFiltersRecord edge cases", () => {
  it.each([null, undefined, "x", 5])("non-object %p -> {}", (raw) => {
    expect(migrateListFiltersRecord(raw)).toEqual({});
  });

  it("keys without 'diary:' prefix are watchlist tabs", () => {
    const r = migrateListFiltersRecord({ "diary:g": { sortOption: "missing" }, "watchlist:g": { sortOption: "missing" }, other: { sortOption: "missing" } });
    expect(r["diary:g"].filters.missing).toBe(true);
    expect(r["watchlist:g"].filters.missing).toBe(true);
    expect(Object.keys(r)).toHaveLength(3);
  });
});

describe("collapseListFiltersPerTab edge cases", () => {
  const lf = (title: string) => ({ sort: { field: "title", direction: "asc" }, filters: { tag: title } }) as never;

  it.each([null, undefined, "x", 5])("non-object %p -> {}", (raw) => {
    expect(collapseListFiltersPerTab(raw, "g1")).toEqual({});
  });

  it("an already collapsed record is kept as is", () => {
    const raw = { diary: lf("d"), watchlist: lf("w") };
    expect(collapseListFiltersPerTab(raw, "g1")).toEqual(raw);
  });

  it("prefers the active group's entry, else the first stored one", () => {
    const raw = { "diary:g1": lf("1"), "diary:g2": lf("2") };
    expect(collapseListFiltersPerTab(raw, "g2").diary).toBe(raw["diary:g2"]);
    expect(collapseListFiltersPerTab(raw, "gX").diary).toBe(raw["diary:g1"]);
    expect(collapseListFiltersPerTab(raw, null).diary).toBe(raw["diary:g1"]);
    expect(collapseListFiltersPerTab(raw, 42).diary).toBe(raw["diary:g1"]);
  });

  it("collapses tabs independently and omits tabs without data", () => {
    const raw = { "watchlist:g2": lf("w2"), "watchlist:g1": lf("w1") };
    const r = collapseListFiltersPerTab(raw, "g1");
    expect(r.watchlist).toBe(raw["watchlist:g1"]);
    expect(r).not.toHaveProperty("diary");
  });

  it("ignores unrelated keys", () => {
    expect(collapseListFiltersPerTab({ foo: lf("x") }, "g1")).toEqual({});
  });
});
