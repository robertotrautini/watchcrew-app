// See __tests__/lib/mmkvStorage.test.ts for why react-native-mmkv is mocked with
// a plain Map-backed fake rather than the real native module.
//
// The store module (and the mmkvStorage module it imports) is required
// lazily inside each test via loadStore(), after (re)seeding
// mockStorageMap and calling jest.resetModules() — this mirrors the
// lazy-require pattern already used in __tests__/hooks/useAuthGate.test.tsx, and
// is required here specifically so the hydration test can control what the
// "persisted" MMKV data looks like *before* the Zustand `persist` middleware
// runs its synchronous hydration read at store-creation time.
//
// These tests drive the store directly via `getState()`/`setState()`
// (no React rendering involved), which fully covers the persistence
// behavior we need to prove (setter -> state update -> MMKV adapter write,
// and MMKV data -> hydrated initial state) without touching the
// render()/renderHook() await gotcha documented elsewhere in this repo.
const mockStorageMap = new Map<string, string>();

jest.mock("react-native-mmkv", () => {
  return {
    createMMKV: jest.fn().mockImplementation(() => ({
      getString: (key: string) => mockStorageMap.get(key),
      set: (key: string, value: string) => {
        mockStorageMap.set(key, value);
      },
      remove: (key: string) => {
        mockStorageMap.delete(key);
      },
    })),
  };
});

function loadStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

describe("usePreferencesStore", () => {
  beforeEach(() => {
    mockStorageMap.clear();
    jest.resetModules();
  });

  it("defaults lastActiveTab to null when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().lastActiveTab).toBeNull();
  });

  it("setLastActiveTab updates the store's state", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setLastActiveTab("watchlist");

    expect(usePreferencesStore.getState().lastActiveTab).toBe("watchlist");
  });

  it("persists the updated tab through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setLastActiveTab("tagebuch");

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.lastActiveTab).toBe("tagebuch");
  });

  it("hydrates its initial state from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({ state: { lastActiveTab: "tracker" }, version: 0 }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().lastActiveTab).toBe("tracker");
  });

  it("defaults watchlistViewMode to 'cards' when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().watchlistViewMode).toBe("cards");
  });

  it.each(["cards", "grid", "list"] as const)(
    "setWatchlistViewMode updates the store's state to '%s'",
    (mode) => {
      const usePreferencesStore = loadStore();

      usePreferencesStore.getState().setWatchlistViewMode(mode);

      expect(usePreferencesStore.getState().watchlistViewMode).toBe(mode);
    },
  );

  it("persists the updated view mode through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setWatchlistViewMode("grid");

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.watchlistViewMode).toBe("grid");
  });

  it("hydrates watchlistViewMode from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({
        state: { lastActiveTab: null, watchlistViewMode: "list" },
        version: 0,
      }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().watchlistViewMode).toBe("list");
  });

  it("defaults diaryViewMode to 'cards' when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().diaryViewMode).toBe("cards");
  });

  it.each(["cards", "grid", "list"] as const)(
    "setDiaryViewMode updates the store's state to '%s'",
    (mode) => {
      const usePreferencesStore = loadStore();

      usePreferencesStore.getState().setDiaryViewMode(mode);

      expect(usePreferencesStore.getState().diaryViewMode).toBe(mode);
    },
  );

  it("persists the updated diary view mode through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setDiaryViewMode("grid");

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.diaryViewMode).toBe("grid");
  });

  it("hydrates diaryViewMode from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({
        state: { lastActiveTab: null, diaryViewMode: "list" },
        version: 0,
      }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().diaryViewMode).toBe("list");
  });

  it("keeps watchlistViewMode and diaryViewMode independent of each other", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setWatchlistViewMode("grid");
    usePreferencesStore.getState().setDiaryViewMode("list");

    expect(usePreferencesStore.getState().watchlistViewMode).toBe("grid");
    expect(usePreferencesStore.getState().diaryViewMode).toBe("list");
  });

  it("defaults activeGroupId to null when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().activeGroupId).toBeNull();
  });

  it("setActiveGroupId updates the store's state", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setActiveGroupId("group-42");

    expect(usePreferencesStore.getState().activeGroupId).toBe("group-42");
  });

  it("persists the updated active group id through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setActiveGroupId("group-42");

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.activeGroupId).toBe("group-42");
  });

  it("hydrates activeGroupId from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({ state: { activeGroupId: "group-99" }, version: 0 }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().activeGroupId).toBe("group-99");
  });

  it("defaults selectedStreamingProviderIds to an empty array when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().selectedStreamingProviderIds).toEqual([]);
  });

  it("setSelectedStreamingProviderIds updates the store's state", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setSelectedStreamingProviderIds([8, 337]);

    expect(usePreferencesStore.getState().selectedStreamingProviderIds).toEqual([8, 337]);
  });

  it("persists selectedStreamingProviderIds through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setSelectedStreamingProviderIds([8]);

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.selectedStreamingProviderIds).toEqual([8]);
  });

  it("hydrates selectedStreamingProviderIds from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({ state: { selectedStreamingProviderIds: [2, 9] }, version: 0 }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().selectedStreamingProviderIds).toEqual([2, 9]);
  });

  it("defaults showTitlesInGrid to true when nothing has been persisted yet", () => {
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(true);
  });

  it("setShowTitlesInGrid updates the store's state", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setShowTitlesInGrid(false);

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(false);
  });

  it("persists showTitlesInGrid through the MMKV-backed storage adapter, not just in memory", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setShowTitlesInGrid(false);

    const raw = mockStorageMap.get("watchcrew-preferences");
    expect(raw).toBeDefined();
    const persisted = JSON.parse(raw as string);
    expect(persisted.state.showTitlesInGrid).toBe(false);
  });

  it("hydrates showTitlesInGrid from data already present in MMKV storage on module load", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({ state: { showTitlesInGrid: false }, version: 0 }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(false);
  });

  it("ignores the removed lastSeenChangelogVersion key persisted by older installs", () => {
    mockStorageMap.set(
      "watchcrew-preferences",
      JSON.stringify({ state: { lastSeenChangelogVersion: "0.9.0", showTitlesInGrid: false }, version: 0 }),
    );

    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().showTitlesInGrid).toBe(false);
    expect(usePreferencesStore.getState()).not.toHaveProperty("setLastSeenChangelogVersion");
  });

  it("returns a default list-filter state for a tab+group without stored choices", () => {
    const { DEFAULT_LIST_FILTERS } = require("@/stores/usePreferencesStore");
    const usePreferencesStore = loadStore();

    expect(usePreferencesStore.getState().listFilters["watchlist:g1"]).toBeUndefined();
    expect(DEFAULT_LIST_FILTERS).toEqual({
      sortOption: null,
      genreIds: [],
      year: null,
      providerCategories: ["flatrate"],
    });
  });

  it("setListFilters merges a patch per tab+group without touching other groups/tabs", () => {
    const usePreferencesStore = loadStore();

    usePreferencesStore.getState().setListFilters("watchlist", "g1", { sortOption: "genre", genreIds: ["a"] });
    usePreferencesStore.getState().setListFilters("watchlist", "g1", { year: 2020 });
    usePreferencesStore.getState().setListFilters("diary", "g1", { sortOption: "liked" });

    const { listFilters } = usePreferencesStore.getState();
    expect(listFilters["watchlist:g1"]).toEqual({
      sortOption: "genre",
      genreIds: ["a"],
      year: 2020,
      providerCategories: ["flatrate"],
    });
    expect(listFilters["diary:g1"].sortOption).toBe("liked");
    expect(listFilters["watchlist:g2"]).toBeUndefined();
  });

  it("persists and hydrates the per-group list filters via MMKV", () => {
    const usePreferencesStore = loadStore();
    usePreferencesStore.getState().setListFilters("diary", "g1", { sortOption: "rating" });

    const persisted = JSON.parse(mockStorageMap.get("watchcrew-preferences") as string);
    expect(persisted.state.listFilters["diary:g1"].sortOption).toBe("rating");

    jest.resetModules();
    expect(loadStore().getState().listFilters["diary:g1"].sortOption).toBe("rating");
  });

  it("filterPanelOpen defaults to closed for both tabs", () => {
    const usePreferencesStore = loadStore();
    expect(usePreferencesStore.getState().filterPanelOpen).toEqual({ watchlist: false, diary: false });
  });

  it("setFilterPanelOpen updates one tab only and persists/hydrates via MMKV", () => {
    const usePreferencesStore = loadStore();
    usePreferencesStore.getState().setFilterPanelOpen("diary", true);
    expect(usePreferencesStore.getState().filterPanelOpen).toEqual({ watchlist: false, diary: true });

    const persisted = JSON.parse(mockStorageMap.get("watchcrew-preferences") as string);
    expect(persisted.state.filterPanelOpen.diary).toBe(true);

    jest.resetModules();
    expect(loadStore().getState().filterPanelOpen).toEqual({ watchlist: false, diary: true });
  });
});
