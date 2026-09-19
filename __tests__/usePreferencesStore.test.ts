// See __tests__/mmkvStorage.test.ts for why react-native-mmkv is mocked with
// a plain Map-backed fake rather than the real native module.
//
// The store module (and the mmkvStorage module it imports) is required
// lazily inside each test via loadStore(), after (re)seeding
// mockStorageMap and calling jest.resetModules() — this mirrors the
// lazy-require pattern already used in __tests__/useAuthGate.test.tsx, and
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
});
