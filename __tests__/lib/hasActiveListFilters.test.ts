import { DEFAULT_LIST_FILTERS, hasActiveListFilters } from "@/lib/listFilters";

describe("hasActiveListFilters", () => {
  it("is false for defaults", () => {
    expect(hasActiveListFilters(DEFAULT_LIST_FILTERS, "added")).toBe(false);
  });

  it("is false when the stored sort equals the tab default", () => {
    expect(hasActiveListFilters({ ...DEFAULT_LIST_FILTERS, sortOption: "added" }, "added")).toBe(false);
  });

  it("is true for a non-default sort", () => {
    expect(hasActiveListFilters({ ...DEFAULT_LIST_FILTERS, sortOption: "genre" }, "added")).toBe(true);
  });

  it("is true for non-default provider categories", () => {
    expect(
      hasActiveListFilters({ ...DEFAULT_LIST_FILTERS, providerCategories: ["rent"] }, "added"),
    ).toBe(true);
  });
});
