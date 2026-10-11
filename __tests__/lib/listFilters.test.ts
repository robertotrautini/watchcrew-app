import {
  DEFAULT_DIARY_SCOPE,
  DEFAULT_ENTRY_FILTERS,
  DEFAULT_LIST_FILTERS,
  activeFilterKeys,
  getNoResultsMessage,
  listFiltersKey,
  migrateListFilters,
  migrateListFiltersRecord,
  removeFilterKey,
  resolveSort,
  toggleProviderCategory,
} from "../../src/lib/listFilters";

describe("toggleProviderCategory (min. 1 active)", () => {
  it("adds an inactive category and removes an active one", () => {
    expect(toggleProviderCategory(["flatrate"], "rent")).toEqual(["flatrate", "rent"]);
    expect(toggleProviderCategory(["flatrate", "rent"], "flatrate")).toEqual(["rent"]);
  });

  it("refuses to deactivate the last active category", () => {
    expect(toggleProviderCategory(["flatrate"], "flatrate")).toEqual(["flatrate"]);
  });

  it("keeps the fixed Flatrate/Leihen/Kaufen order", () => {
    expect(toggleProviderCategory(["buy"], "flatrate")).toEqual(["flatrate", "buy"]);
  });
});

describe("getNoResultsMessage", () => {
  it("names the query for an active search (2+ chars)", () => {
    expect(getNoResultsMessage("matrix")).toBe("Keine Treffer für „matrix“.");
  });

  it("falls back to the filter wording without an active search", () => {
    expect(getNoResultsMessage("")).toBe("Keine Einträge für diese Auswahl.");
    expect(getNoResultsMessage(" a ")).toBe("Keine Einträge für diese Auswahl.");
  });
});

describe("listFilters defaults/key", () => {
  it("has default sort, no filters, flatrate as the only category and no scope", () => {
    expect(DEFAULT_LIST_FILTERS).toEqual({
      sort: null,
      filters: {
        genreIds: [],
        year: null,
        myStreaming: false,
        providerCategories: ["flatrate"],
        liked: false,
        upcoming: false,
        unrated: false,
        hasRatings: false,
        allRated: false,
        missing: false,
      },
    });
    expect(DEFAULT_LIST_FILTERS).not.toHaveProperty("scope");
    expect(DEFAULT_DIARY_SCOPE).toBe("group");
  });

  it("keys per tab only (global across groups)", () => {
    expect(listFiltersKey("watchlist")).toBe("watchlist");
    expect(listFiltersKey("diary")).toBe("diary");
  });

  it("resolveSort falls back to the tab default", () => {
    expect(resolveSort(undefined, "diary")).toEqual({ field: "average", direction: "desc" });
    expect(resolveSort(undefined, "watchlist")).toEqual({ field: "added", direction: "desc" });
    expect(
      resolveSort({ ...DEFAULT_LIST_FILTERS, sort: { field: "title", direction: "asc" } }, "diary"),
    ).toEqual({ field: "title", direction: "asc" });
  });
});

describe("activeFilterKeys / removeFilterKey", () => {
  const filters = {
    ...DEFAULT_ENTRY_FILTERS,
    genreIds: ["a", "b"],
    year: 2020 as const,
    myStreaming: true,
    providerCategories: ["rent" as const],
    liked: true,
    missing: true,
    upcoming: true,
  };

  it("lists the diary chips", () => {
    expect(activeFilterKeys(filters, "diary")).toEqual([
      "genre:a",
      "genre:b",
      "year",
      "streaming",
      "liked",
      "missing",
    ]);
  });

  it("lists the watchlist chips", () => {
    expect(activeFilterKeys(filters, "watchlist")).toEqual([
      "genre:a",
      "genre:b",
      "year",
      "streaming",
      "liked",
      "upcoming",
    ]);
  });

  it("removes a single genre, and resets categories with the streaming chip", () => {
    expect(removeFilterKey(filters, "genre:a").genreIds).toEqual(["b"]);
    const noStreaming = removeFilterKey(filters, "streaming");
    expect(noStreaming.myStreaming).toBe(false);
    expect(noStreaming.providerCategories).toEqual(["flatrate"]);
    expect(removeFilterKey(filters, "year").year).toBeNull();
    expect(removeFilterKey(filters, "missing").missing).toBe(false);
  });
});

describe("migrateListFilters (old sortOption -> sort + filters)", () => {
  const old = (extra: Record<string, unknown>) => ({
    sortOption: null,
    genreIds: ["g1"],
    year: 2020,
    providerCategories: ["rent"],
    ...extra,
  });

  it("null / rating / added -> defaults, stale genre/year/categories dropped", () => {
    for (const sortOption of [null, "rating", "added"]) {
      expect(migrateListFilters(old({ sortOption }), "diary")).toEqual({
        ...DEFAULT_LIST_FILTERS,
        filters: { ...DEFAULT_ENTRY_FILTERS, providerCategories: ["rent"] },
      });
    }
  });

  it("tmdb_score -> sort TMDB desc", () => {
    expect(migrateListFilters(old({ sortOption: "tmdb_score" }), "watchlist").sort).toEqual({
      field: "tmdb",
      direction: "desc",
    });
  });

  it("my_diary -> sort Gesehen am desc", () => {
    expect(migrateListFilters(old({ sortOption: "my_diary" }), "diary").sort).toEqual({
      field: "seen_at",
      direction: "desc",
    });
  });

  it("genre / year keep their stored selection as filter", () => {
    expect(migrateListFilters(old({ sortOption: "genre" }), "diary").filters.genreIds).toEqual(["g1"]);
    expect(migrateListFilters(old({ sortOption: "genre" }), "diary").filters.year).toBeNull();
    expect(migrateListFilters(old({ sortOption: "year" }), "diary").filters.year).toBe(2020);
    expect(migrateListFilters(old({ sortOption: "year", year: "no_date" }), "diary").filters.year).toBe("no_date");
  });

  it("my_streaming -> streaming filter on, categories kept", () => {
    const m = migrateListFilters(old({ sortOption: "my_streaming" }), "watchlist");
    expect(m.filters.myStreaming).toBe(true);
    expect(m.filters.providerCategories).toEqual(["rent"]);
    expect(m.sort).toBeNull();
  });

  it.each([
    ["liked", "liked"],
    ["upcoming", "upcoming"],
    ["unrated", "unrated"],
    ["has_ratings", "hasRatings"],
    ["all_rated", "allRated"],
    ["missing", "missing"],
  ])("%s -> filter %s", (sortOption, key) => {
    const m = migrateListFilters(old({ sortOption }), "diary");
    expect((m.filters as unknown as Record<string, unknown>)[key]).toBe(true);
    expect(m.sort).toBeNull();
  });

  it("passes the new shape through (merged over defaults) and survives garbage", () => {
    const next = { sort: { field: "title", direction: "asc" }, filters: { liked: true }, scope: "group" };
    expect(migrateListFilters(next, "diary")).toEqual({
      sort: { field: "title", direction: "asc" },
      filters: { ...DEFAULT_ENTRY_FILTERS, liked: true },
    });
    expect(migrateListFilters(null, "diary")).toEqual(DEFAULT_LIST_FILTERS);
    expect(migrateListFiltersRecord("x")).toEqual({});
  });

  it("migrates a whole record, tab from the key prefix", () => {
    const result = migrateListFiltersRecord({
      "diary:g1": { sortOption: "liked", genreIds: [], year: null, providerCategories: ["flatrate"] },
      "watchlist:g1": { sortOption: "upcoming", genreIds: [], year: null, providerCategories: ["flatrate"] },
    });
    expect(result["diary:g1"].filters.liked).toBe(true);
    expect(result["watchlist:g1"].filters.upcoming).toBe(true);
  });
});
