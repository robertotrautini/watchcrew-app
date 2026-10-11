// Robustness of the persisted-state migration chain (v0 -> v3) beyond the happy paths
// in usePreferencesStore.test.ts. Same Map-backed MMKV fake.
const mockStorageMap = new Map<string, string>();

jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn().mockImplementation(() => ({
    getString: (key: string) => mockStorageMap.get(key),
    set: (key: string, value: string) => {
      mockStorageMap.set(key, value);
    },
    remove: (key: string) => {
      mockStorageMap.delete(key);
    },
  })),
}));

const KEY = "watchcrew-preferences";

function loadStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

function seed(state: unknown, version: number) {
  mockStorageMap.set(KEY, JSON.stringify({ state, version }));
}

describe("usePreferencesStore migration chain", () => {
  beforeEach(() => {
    mockStorageMap.clear();
    jest.resetModules();
  });

  it("v0 -> v3 runs all steps: sortOption migrated, scope dropped, collapsed per tab", () => {
    seed(
      {
        activeGroupId: "g2",
        listFilters: {
          "diary:g1": { sortOption: "missing", scope: "my_diary" },
          "diary:g2": { sortOption: "tmdb_score" },
          "watchlist:g1": { sortOption: "upcoming" },
        },
      },
      0,
    );
    const s = loadStore().getState();
    expect(s.diaryScope).toBe("group");
    expect(s.listFilters.diary.sort).toEqual({ field: "tmdb", direction: "desc" });
    expect(s.listFilters.diary.filters.missing).toBe(false);
    expect(s.listFilters.watchlist.filters.upcoming).toBe(true);
    expect(Object.keys(s.listFilters).sort()).toEqual(["diary", "watchlist"]);
  });

  it("v0 state without listFilters yields an empty record (default via ?? in the screens)", () => {
    seed({ activeGroupId: "g1" }, 0);
    const s = loadStore().getState();
    expect(s.listFilters).toEqual({});
    expect(s.activeGroupId).toBe("g1");
    expect(s.diaryScope).toBe("group");
  });

  it("v1 keeps unrelated preferences untouched", () => {
    seed({ showTitlesInGrid: false, trackerEnabled: false, selectedStreamingProviderIds: [8, 9], listFilters: {} }, 1);
    const s = loadStore().getState();
    expect(s.showTitlesInGrid).toBe(false);
    expect(s.trackerEnabled).toBe(false);
    expect(s.selectedStreamingProviderIds).toEqual([8, 9]);
  });

  it("v2 with a stale activeGroupId falls back to the first stored group entry", () => {
    seed(
      {
        activeGroupId: "gone",
        listFilters: {
          "watchlist:a": { sort: { field: "title", direction: "asc" }, filters: {} },
          "watchlist:b": { sort: { field: "tmdb", direction: "asc" }, filters: {} },
        },
      },
      2,
    );
    expect(loadStore().getState().listFilters.watchlist.sort).toEqual({ field: "title", direction: "asc" });
  });

  it("v2 without any listFilters does not crash", () => {
    seed({ diaryScope: "my_diary" }, 2);
    const s = loadStore();
    expect(s.getState().listFilters).toEqual({});
    expect(s.getState().diaryScope).toBe("my_diary");
  });

  it("v3 state is not migrated again (listFilters kept verbatim)", () => {
    const lf = { diary: { sort: { field: "own", direction: "asc" }, filters: { liked: true } } };
    seed({ listFilters: lf }, 3);
    expect(loadStore().getState().listFilters).toEqual(lf);
  });

  it("falls back to defaults when the persisted blob is corrupt JSON", () => {
    mockStorageMap.set(KEY, "{not json");
    const s = loadStore().getState();
    expect(s.diaryScope).toBe("group");
    expect(s.listFilters).toEqual({});
    expect(s.gridColumnsDiaryWatchlist).toBe(4);
    expect(s.trackerEnabled).toBe(true);
  });

  it("after migration the next write persists with the current version 3", () => {
    seed({ listFilters: { "diary:g1": { sortOption: "liked" } } }, 0);
    const store = loadStore();
    store.getState().setDiaryScope("my_diary");
    const persisted = JSON.parse(mockStorageMap.get(KEY) as string);
    expect(persisted.version).toBe(3);
    expect(persisted.state.listFilters.diary.filters.liked).toBe(true);
  });

  it("setListFilters merges over the stored entry and keeps defaults for the rest", () => {
    const store = loadStore();
    store.getState().setListFilters("watchlist", { sort: { field: "title", direction: "asc" } });
    store.getState().setListFilters("watchlist", { filters: { ...store.getState().listFilters.watchlist.filters, liked: true } });
    const entry = store.getState().listFilters.watchlist;
    expect(entry.sort).toEqual({ field: "title", direction: "asc" });
    expect(entry.filters.liked).toBe(true);
    expect(entry.filters.providerCategories).toEqual(["flatrate"]);
  });
});
