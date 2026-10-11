import {
  DEFAULT_ENTRY_FILTERS,
  DEFAULT_LIST_FILTERS,
  hasActiveListFilters,
} from "@/lib/listFilters";

describe("hasActiveListFilters", () => {
  it("is false for defaults and for missing storage", () => {
    expect(hasActiveListFilters(DEFAULT_LIST_FILTERS, "diary")).toBe(false);
    expect(hasActiveListFilters(undefined, "watchlist")).toBe(false);
  });

  it("is false for any sort (default or not)", () => {
    const sorts = [
      ["watchlist", { field: "added", direction: "desc" }],
      ["watchlist", { field: "added", direction: "asc" }],
      ["diary", { field: "average", direction: "desc" }],
      ["diary", { field: "title", direction: "asc" }],
    ] as const;
    for (const [tab, sort] of sorts) {
      expect(
        hasActiveListFilters({ ...DEFAULT_LIST_FILTERS, sort: { ...sort } }, tab),
      ).toBe(false);
    }
  });

  it("is true for any active filter", () => {
    const withFilter = (patch: Partial<typeof DEFAULT_ENTRY_FILTERS>) => ({
      ...DEFAULT_LIST_FILTERS,
      filters: { ...DEFAULT_ENTRY_FILTERS, ...patch },
    });
    expect(hasActiveListFilters(withFilter({ genreIds: ["g"] }), "diary")).toBe(true);
    expect(hasActiveListFilters(withFilter({ myStreaming: true }), "watchlist")).toBe(true);
    expect(hasActiveListFilters(withFilter({ upcoming: true }), "watchlist")).toBe(true);
    expect(hasActiveListFilters(withFilter({ missing: true }), "diary")).toBe(true);
  });

  it("ignores provider categories while the streaming filter is off", () => {
    expect(
      hasActiveListFilters(
        {
          ...DEFAULT_LIST_FILTERS,
          filters: { ...DEFAULT_ENTRY_FILTERS, providerCategories: ["rent"] },
        },
        "diary",
      ),
    ).toBe(false);
  });

  it("ignores filters that do not belong to the tab", () => {
    expect(
      hasActiveListFilters(
        { ...DEFAULT_LIST_FILTERS, filters: { ...DEFAULT_ENTRY_FILTERS, upcoming: true } },
        "diary",
      ),
    ).toBe(false);
  });
});
