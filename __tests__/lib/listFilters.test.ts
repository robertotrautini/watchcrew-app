import {
  DEFAULT_LIST_FILTERS,
  getNoResultsMessage,
  listFiltersKey,
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
  it("has no sort choice, no genre/year and flatrate as the only category", () => {
    expect(DEFAULT_LIST_FILTERS).toEqual({
      sortOption: null,
      genreIds: [],
      year: null,
      providerCategories: ["flatrate"],
    });
  });

  it("keys per tab and group", () => {
    expect(listFiltersKey("watchlist", "g1")).toBe("watchlist:g1");
  });
});
