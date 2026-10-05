import { act, renderHook } from "@testing-library/react-native";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

describe("useEntryFilters", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ listFilters: {} });
  });

  it("falls back to the default sort and empty filters", async () => {
    const { result } = await renderHook(() =>
      useEntryFilters("diary", "g1", "my_diary"),
    );
    expect(result.current.sortOption).toBe("my_diary");
    expect(result.current.selectedGenreIds).toEqual([]);
    expect(result.current.selectedYear).toBeUndefined();
    expect(result.current.searchQuery).toBe("");
  });

  it("selectSortOption persists the sort and closes the sheet", async () => {
    const { result } = await renderHook(() =>
      useEntryFilters<string>("watchlist", "g1", "added"),
    );
    await act(async () => result.current.setSortSheetVisible(true));
    expect(result.current.sortSheetVisible).toBe(true);
    await act(async () => result.current.selectSortOption("genre"));
    expect(result.current.sortOption).toBe("genre");
    expect(result.current.sortSheetVisible).toBe(false);
  });

  it("toggles genres and sets the year", async () => {
    const { result } = await renderHook(() =>
      useEntryFilters<string>("watchlist", "g1", "added"),
    );
    await act(async () => result.current.toggleGenre("a"));
    await act(async () => result.current.toggleGenre("b"));
    await act(async () => result.current.toggleGenre("a"));
    expect(result.current.selectedGenreIds).toEqual(["b"]);
    await act(async () => result.current.updateFilters({ year: 2020 }));
    expect(result.current.selectedYear).toBe(2020);
  });

  it("does not persist without an active group", async () => {
    const { result } = await renderHook(() =>
      useEntryFilters("watchlist", null, "added"),
    );
    await act(async () => result.current.toggleGenre("a"));
    expect(result.current.selectedGenreIds).toEqual([]);
    expect(usePreferencesStore.getState().listFilters).toEqual({});
  });

  it("keeps search text local and toggles the panel per tab", async () => {
    const { result } = await renderHook(() =>
      useEntryFilters("diary", "g1", "my_diary"),
    );
    await act(async () => result.current.setSearchQuery("alien"));
    expect(result.current.searchQuery).toBe("alien");
    await act(async () => result.current.toggleFilterPanel());
    expect(usePreferencesStore.getState().filterPanelOpen.diary).toBe(true);
    expect(usePreferencesStore.getState().filterPanelOpen.watchlist).toBe(false);
  });
});
