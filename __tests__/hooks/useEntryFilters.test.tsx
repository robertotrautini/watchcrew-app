import { act, renderHook } from "@testing-library/react-native";
import { useEntryFilters } from "@/hooks/useEntryFilters";
import { DEFAULT_ENTRY_FILTERS } from "@/lib/listFilters";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

describe("useEntryFilters", () => {
  beforeEach(() => {
    usePreferencesStore.setState({ listFilters: {}, diaryScope: "group" });
  });

  it("falls back to the tab default sort, empty filters and the group scope", async () => {
    const { result } = await renderHook(() => useEntryFilters("diary"));
    expect(result.current.sort).toEqual({ field: "average", direction: "desc" });
    expect(result.current.filters).toEqual(DEFAULT_ENTRY_FILTERS);
    expect(result.current.scope).toBe("group");
    expect(result.current.searchQuery).toBe("");

    const wl = await renderHook(() => useEntryFilters("watchlist"));
    expect(wl.result.current.sort).toEqual({ field: "added", direction: "desc" });
  });

  it("setSort persists field and direction without touching the filters", async () => {
    const { result } = await renderHook(() => useEntryFilters("watchlist"));
    await act(async () => result.current.setFilters({ ...DEFAULT_ENTRY_FILTERS, genreIds: ["a"] }));
    await act(async () => result.current.setSort({ field: "title", direction: "asc" }));
    expect(result.current.sort).toEqual({ field: "title", direction: "asc" });
    expect(result.current.filters.genreIds).toEqual(["a"]);
  });

  it("setFilters / removeFilter change filters only, the sort stays", async () => {
    const { result } = await renderHook(() => useEntryFilters("diary"));
    await act(async () => result.current.setSort({ field: "likes", direction: "asc" }));
    await act(async () =>
      result.current.setFilters({ ...DEFAULT_ENTRY_FILTERS, genreIds: ["a", "b"], liked: true }),
    );
    await act(async () => result.current.removeFilter("genre:a"));
    expect(result.current.filters.genreIds).toEqual(["b"]);
    expect(result.current.filters.liked).toBe(true);
    expect(result.current.sort).toEqual({ field: "likes", direction: "asc" });
  });

  it("scope is its own state", async () => {
    const { result } = await renderHook(() => useEntryFilters("diary"));
    await act(async () => result.current.setScope("my_diary"));
    expect(result.current.scope).toBe("my_diary");
    expect(result.current.sort).toEqual({ field: "average", direction: "desc" });
    expect(result.current.filters).toEqual(DEFAULT_ENTRY_FILTERS);
  });

  it("scope, sort and filters are global: a group change keeps them", async () => {
    const { result } = await renderHook(() => useEntryFilters("diary"));
    await act(async () => result.current.setScope("my_diary"));
    await act(async () => result.current.setSort({ field: "title", direction: "asc" }));
    await act(async () => result.current.setFilters({ ...DEFAULT_ENTRY_FILTERS, liked: true }));
    // Group switch: the hook does not depend on the group at all.
    usePreferencesStore.getState().setActiveGroupId("g2");
    const again = await renderHook(() => useEntryFilters("diary"));
    expect(again.result.current.scope).toBe("my_diary");
    expect(again.result.current.sort).toEqual({ field: "title", direction: "asc" });
    expect(again.result.current.filters.liked).toBe(true);
    expect(Object.keys(usePreferencesStore.getState().listFilters)).toEqual(["diary"]);
  });

  it("the two tabs are independent of each other", async () => {
    const diary = await renderHook(() => useEntryFilters("diary"));
    const wl = await renderHook(() => useEntryFilters("watchlist"));
    await act(async () => diary.result.current.setSort({ field: "title", direction: "asc" }));
    expect(wl.result.current.sort).toEqual({ field: "added", direction: "desc" });
    await act(async () => wl.result.current.setFilters({ ...DEFAULT_ENTRY_FILTERS, genreIds: ["a"] }));
    expect(diary.result.current.filters).toEqual(DEFAULT_ENTRY_FILTERS);
  });

  it("keeps search text local and toggles the panel per tab", async () => {
    const { result } = await renderHook(() => useEntryFilters("diary"));
    await act(async () => result.current.setSearchQuery("alien"));
    expect(result.current.searchQuery).toBe("alien");
    await act(async () => result.current.toggleFilterPanel());
    expect(usePreferencesStore.getState().filterPanelOpen.diary).toBe(true);
    expect(usePreferencesStore.getState().filterPanelOpen.watchlist).toBe(false);
  });
});
