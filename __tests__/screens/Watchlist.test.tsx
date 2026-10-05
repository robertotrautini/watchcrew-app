import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

// M7 part 2 (Add-Movie-Modal): the new "+" button navigates via expo-router,
// so this screen now needs a router mock too (it previously had none).
// M10: also needs `useFocusEffect` now (src/hooks/useRegisterFocusedGroupScreen.ts) --
// mocked as "run the effect once on mount, cleanup once on unmount", same
// convention as __tests__/hooks/useRegisterFocusedGroupScreen.test.tsx.
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: null,
    activeGroupId: undefined,
    groupCount: 1,
    switchToNext: jest.fn(),
  }),
}));

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

// --- Hook mocks -------------------------------------------------------
const mockUseActiveGroup = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockUseMyStreamingProviders = jest.fn();
const mockSetWatchlistViewMode = jest.fn();
// M10 (Realtime foreground sync, ADR 0006): this screen's own realtime/focus
// wiring has its own dedicated tests (useGroupRealtimeSync.test.tsx,
// useRegisterFocusedGroupScreen.test.tsx) -- mocked here as no-ops so this
// file keeps testing only ITS OWN concerns (loading/rendering/sort/filter),
// and so this test doesn't need to construct a real Supabase client.
const mockUseGroupRealtimeSync = jest.fn();
const mockUseRegisterFocusedGroupScreen = jest.fn();

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));
jest.mock("@/hooks/useGroupRealtimeSync", () => ({
  useGroupRealtimeSync: mockUseGroupRealtimeSync,
}));
jest.mock("@/hooks/useRegisterFocusedGroupScreen", () => ({
  useRegisterFocusedGroupScreen: mockUseRegisterFocusedGroupScreen,
}));
jest.mock("@/hooks/useMyStreamingProviders", () => ({
  useMyStreamingProviders: (...args: unknown[]) => mockUseMyStreamingProviders(...args),
}));
// A real (non-persisted) zustand store, so the per-group persistence wiring
// (listFilters / setListFilters) is exercised for real.
jest.mock("@/stores/usePreferencesStore", () => {
  const { create } = jest.requireActual("zustand");
  const { DEFAULT_LIST_FILTERS, listFiltersKey } = jest.requireActual("@/lib/listFilters");
  const usePreferencesStore = create((set: any) => ({
    watchlistViewMode: "cards",
    setWatchlistViewMode: () => {},
    showTitlesInGrid: true,
    selectedStreamingProviderIds: [],
    filterPanelOpen: { watchlist: false, diary: false },
    setFilterPanelOpen: (tab: string, open: boolean) =>
      set((state: any) => ({ filterPanelOpen: { ...state.filterPanelOpen, [tab]: open } })),
    listFilters: {},
    setListFilters: (tab: string, groupId: string, patch: object) =>
      set((state: any) => {
        const key = listFiltersKey(tab, groupId);
        return {
          listFilters: { ...state.listFilters, [key]: { ...DEFAULT_LIST_FILTERS, ...state.listFilters[key], ...patch } },
        };
      }),
  }));
  return { usePreferencesStore };
});

// Real logic underneath (don't reimplement/alter watchlistLogic semantics),
// but spy on sortWatchlist/searchEntries so wiring can be asserted directly.
const actualWatchlistLogic = jest.requireActual("@/lib/watchlistLogic");
const mockSortWatchlist = jest.fn(actualWatchlistLogic.sortWatchlist);
const mockSearchEntries = jest.fn(actualWatchlistLogic.searchEntries);
jest.mock("@/lib/watchlistLogic", () => {
  const actual = jest.requireActual("@/lib/watchlistLogic");
  return {
    ...actual,
    sortWatchlist: (...args: unknown[]) => mockSortWatchlist(...args),
    searchEntries: (...args: unknown[]) => mockSearchEntries(...args),
  };
});

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the `jest.mock` factories above, matching the convention in
// __tests__/screens/Login.test.tsx.
function loadWatchlistScreen() {
  return require("@/app/(app)/(tabs)/watchlist").default;
}

function makeMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: "movie-x",
    tmdb_id: 1,
    name: "Movie X",
    release_date: null,
    poster: null,
    overview: null,
    runtime: null,
    director: null,
    director_id: null,
    vote_average: null,
    movie_genres: [],
    ...overrides,
  };
}

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-x",
    group_id: "g1",
    movie_id: "movie-x",
    added_at: "2026-01-01T00:00:00Z",
    added_by: "u1",
    paid_by_member_id: null,
    paid_at: null,
    movie: makeMovie(),
    ratings: [],
    ...overrides,
  };
}

const ENTRY_ALPHA = makeEntry({
  id: "e1",
  added_at: "2026-01-03T00:00:00Z",
  movie: makeMovie({
    tmdb_id: 1,
    name: "Alpha Movie",
    release_date: null,
    vote_average: 5,
    movie_genres: [{ genre_id: "genre-1" }],
  }),
  ratings: [],
});

const ENTRY_BETA = makeEntry({
  id: "e2",
  added_at: "2026-01-01T00:00:00Z",
  movie: makeMovie({
    tmdb_id: 2,
    name: "Beta Movie",
    release_date: "2020-01-01",
    vote_average: 9,
    movie_genres: [{ genre_id: "genre-2" }],
  }),
  ratings: [{ id: "r1", watchlist_entry_id: "e2", member_id: "u2", rating: 4, liked: false, seen_at: null, rated_at: "2026-01-02T00:00:00Z" }],
});

const ENTRY_GAMMA = makeEntry({
  id: "e3",
  added_at: "2026-01-02T00:00:00Z",
  movie: makeMovie({
    tmdb_id: 3,
    name: "Gamma Movie",
    release_date: "2022-05-05",
    vote_average: 3,
    movie_genres: [{ genre_id: "genre-1" }],
  }),
  ratings: [],
});

function setUpHappyPath(entries = [ENTRY_ALPHA, ENTRY_BETA, ENTRY_GAMMA]) {
  mockCurrentUserId.mockReturnValue("u1");
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: "g1",
    setActiveGroup: jest.fn(),
    groupsQuery: {
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      isLoading: false,
      isError: false,
      error: null,
    },
  });
  mockUseGroupMembers.mockReturnValue({
    data: [{ user_id: "u1" }, { user_id: "u2" }, { user_id: "u3" }],
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries, streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
    error: null,
  });
}

function setUpPreferencesStore(
  watchlistViewMode: "cards" | "grid" | "list" = "cards",
  showTitlesInGrid = true,
) {
  require("@/stores/usePreferencesStore").usePreferencesStore.setState({
    watchlistViewMode,
    setWatchlistViewMode: mockSetWatchlistViewMode,
    showTitlesInGrid,
    selectedStreamingProviderIds: [],
    listFilters: {},
    filterPanelOpen: { watchlist: true, diary: false },
  });
}

describe("WatchlistScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSortWatchlist.mockImplementation(actualWatchlistLogic.sortWatchlist);
    mockSearchEntries.mockImplementation(actualWatchlistLogic.searchEntries);
    mockUseMyStreamingProviders.mockReturnValue({ data: undefined, isLoading: false });
    setUpPreferencesStore("cards");
  });

  it("renders a loading state while the watchlist query is loading", async () => {
    mockCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-loading")).toBeTruthy();
  });

  it("renders an error state when the watchlist query fails", async () => {
    mockCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "network error" },
    });

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-error")).toBeTruthy();
  });

  it("renders an empty state when the (post-filter) watchlist has no entries", async () => {
    setUpHappyPath([]);

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-empty")).toBeTruthy();
  });

  it("renders entries as WatchlistPosterCards in card mode by default", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-entry-e1")).toBeTruthy();
    expect(getByTestId("watchlist-entry-e2")).toBeTruthy();
    expect(getByTestId("watchlist-entry-e3")).toBeTruthy();
  });

  it("hides grid-mode titles when showTitlesInGrid is false (M10 Darstellung toggle)", async () => {
    setUpHappyPath();
    setUpPreferencesStore("grid", false);

    const WatchlistScreen = loadWatchlistScreen();
    const { queryByTestId } = await render(<WatchlistScreen />);

    expect(queryByTestId("watchlist-entry-e1-title")).toBeNull();
  });

  it("shows grid-mode titles when showTitlesInGrid is true (M10 Darstellung toggle)", async () => {
    setUpHappyPath();
    setUpPreferencesStore("grid", true);

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-entry-e1-title")).toBeTruthy();
  });

  it("filter panel is closed by default (only search, add and toggle visible), toggle opens it and persists", async () => {
    setUpHappyPath();
    require("@/stores/usePreferencesStore").usePreferencesStore.setState({
      filterPanelOpen: { watchlist: false, diary: false },
    });

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-search-input")).toBeTruthy();
    expect(getByTestId("watchlist-add-movie-button")).toBeTruthy();
    expect(queryByTestId("watchlist-filter-panel")).toBeNull();
    expect(queryByTestId("watchlist-sort-button")).toBeNull();
    expect(queryByTestId("watchlist-view-mode-toggle")).toBeNull();

    await fireEvent.press(getByTestId("watchlist-filter-toggle"));

    expect(getByTestId("watchlist-filter-panel")).toBeTruthy();
    expect(getByTestId("watchlist-sort-button")).toBeTruthy();
    expect(getByTestId("watchlist-view-mode-toggle")).toBeTruthy();
    expect(require("@/stores/usePreferencesStore").usePreferencesStore.getState().filterPanelOpen.watchlist).toBe(true);
  });

  it("shows the active dot for a non-default sort", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);
    expect(queryByTestId("watchlist-filter-active-dot")).toBeNull();

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-tmdb_score"));

    expect(getByTestId("watchlist-filter-active-dot")).toBeTruthy();
  });

  it("does not show the active dot for a non-default view mode alone", async () => {
    setUpHappyPath();
    setUpPreferencesStore("grid");
    const WatchlistScreen = loadWatchlistScreen();
    const { queryByTestId } = await render(<WatchlistScreen />);
    expect(queryByTestId("watchlist-filter-active-dot")).toBeNull();
  });

  it("switches to grid mode via the view-mode toggle and persists the choice", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-view-mode-grid-button"));

    expect(mockSetWatchlistViewMode).toHaveBeenCalledWith("grid");
  });

  it("navigates to the Add-Movie-Modal when the '+' button is tapped", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-add-movie-button"));

    expect(mockRouter.push).toHaveBeenCalledWith("/add-movie");
  });

  it("navigates to the Settings hub when the gear button is tapped (lock-out guard)", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-settings-button"));

    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
  });

  describe("tapping an entry opens the movie detail overlay", () => {
    const EXPECTED = {
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "1", groupId: "g1", source: "watchlist", watchlistEntryId: "e1" },
    };

    it.each(["cards", "grid", "list"] as const)("in %s mode", async (mode) => {
      setUpPreferencesStore(mode);
      setUpHappyPath();

      const WatchlistScreen = loadWatchlistScreen();
      const { getByTestId } = await render(<WatchlistScreen />);

      const target = mode === "list" ? "watchlist-list-row-e1" : "watchlist-entry-e1";
      await fireEvent.press(getByTestId(target));

      expect(mockRouter.push).toHaveBeenCalledWith(EXPECTED);
    });
  });

  it("renders in list mode (title + date rows only) when watchlistViewMode is 'list'", async () => {
    setUpPreferencesStore("list");
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    expect(getByTestId("watchlist-list-row-e1")).toBeTruthy();
    // List mode shows no poster cards.
    expect(queryByTestId("watchlist-entry-e1")).toBeNull();
  });

  it("reorders entries when selecting the 'TMDB Score' sort option", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, getAllByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-tmdb_score"));

    await waitFor(() =>
      expect(mockSortWatchlist).toHaveBeenCalledWith(
        expect.anything(),
        "tmdb_score",
        expect.anything(),
      ),
    );

    const cards = getAllByTestId(/^watchlist-entry-e\d$/);
    // vote_average desc: Beta(9), Alpha(5), Gamma(3).
    expect(cards.map((c) => c.props.testID)).toEqual([
      "watchlist-entry-e2",
      "watchlist-entry-e1",
      "watchlist-entry-e3",
    ]);
  });

  it("shows genre filter pills only when 'Nach Genre' is the active sort option", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    expect(queryByTestId("watchlist-genre-pill-genre-1")).toBeNull();

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-genre"));

    expect(getByTestId("watchlist-genre-pill-genre-1")).toBeTruthy();
    expect(getByTestId("watchlist-genre-pill-genre-2")).toBeTruthy();
    expect(queryByTestId("watchlist-year-pill-2020")).toBeNull();
  });

  it("shows year filter pills only when 'Nach Jahr' is the active sort option", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-year"));

    expect(getByTestId("watchlist-year-pill-2020")).toBeTruthy();
    expect(getByTestId("watchlist-year-pill-2022")).toBeTruthy();
    expect(queryByTestId("watchlist-genre-pill-genre-1")).toBeNull();
  });

  it("filters the displayed list via the search field", async () => {
    setUpHappyPath();

    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    await fireEvent.changeText(getByTestId("watchlist-search-input"), "Alpha");

    await waitFor(() => expect(mockSearchEntries).toHaveBeenCalledWith(expect.anything(), "Alpha"));
    expect(getByTestId("watchlist-entry-e1")).toBeTruthy();
    expect(queryByTestId("watchlist-entry-e2")).toBeNull();
    expect(queryByTestId("watchlist-entry-e3")).toBeNull();
  });

  it("persists the chosen sort option per group in the preferences store", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-tmdb_score"));

    const { usePreferencesStore } = require("@/stores/usePreferencesStore");
    expect(usePreferencesStore.getState().listFilters["watchlist:g1"].sortOption).toBe("tmdb_score");
  });

  it("restores a persisted sort option on mount", async () => {
    setUpHappyPath();
    require("@/stores/usePreferencesStore").usePreferencesStore.setState({
      listFilters: { "watchlist:g1": { sortOption: "tmdb_score", genreIds: [], year: null, providerCategories: ["flatrate"] } },
    });
    const WatchlistScreen = loadWatchlistScreen();
    const { getAllByTestId } = await render(<WatchlistScreen />);

    const cards = getAllByTestId(/^watchlist-entry-e\d$/);
    expect(cards.map((c) => c.props.testID)).toEqual([
      "watchlist-entry-e2",
      "watchlist-entry-e1",
      "watchlist-entry-e3",
    ]);
  });

  it("persists genre and year selections per group", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);
    const store = require("@/stores/usePreferencesStore").usePreferencesStore;

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-genre"));
    await fireEvent.press(getByTestId("watchlist-genre-pill-genre-1"));
    expect(store.getState().listFilters["watchlist:g1"].genreIds).toEqual(["genre-1"]);

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-year"));
    await fireEvent.press(getByTestId("watchlist-year-pill-2020"));
    expect(store.getState().listFilters["watchlist:g1"].year).toBe(2020);
  });

  it("does not persist the search text", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId } = await render(<WatchlistScreen />);

    await fireEvent.changeText(getByTestId("watchlist-search-input"), "Alpha");

    const filters = require("@/stores/usePreferencesStore").usePreferencesStore.getState().listFilters;
    expect(JSON.stringify(filters)).not.toContain("Alpha");
  });

  it("offers 'Meine Streaming-Dienste' without the old '(bald verfügbar)' label", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByText } = await render(<WatchlistScreen />);

    await fireEvent.press(getByTestId("watchlist-sort-button"));

    expect(queryByText(/bald verfügbar/)).toBeNull();
    expect(getByTestId("watchlist-sort-option-my_streaming")).toBeTruthy();
  });

  it("'Meine Streaming-Dienste': loads providers, filters to own services and shows the category pills (min. 1 active)", async () => {
    setUpHappyPath();
    require("@/stores/usePreferencesStore").usePreferencesStore.setState({ selectedStreamingProviderIds: [8] });
    mockUseMyStreamingProviders.mockImplementation((_ids: number[], enabled: boolean) => ({
      data: enabled
        ? new Map([
            [1, { flatrate: [{ provider_id: 8, provider_name: "N" }], rent: [], buy: [] }],
            [2, { flatrate: [], rent: [{ provider_id: 8, provider_name: "N" }], buy: [] }],
          ])
        : undefined,
      isLoading: false,
    }));
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId } = await render(<WatchlistScreen />);

    expect(queryByTestId("watchlist-provider-categories")).toBeNull();
    expect(mockUseMyStreamingProviders).toHaveBeenLastCalledWith([1, 2, 3], false);

    await fireEvent.press(getByTestId("watchlist-sort-button"));
    await fireEvent.press(getByTestId("watchlist-sort-option-my_streaming"));

    expect(mockUseMyStreamingProviders).toHaveBeenLastCalledWith([1, 2, 3], true);
    expect(getByTestId("watchlist-entry-e1")).toBeTruthy();
    expect(queryByTestId("watchlist-entry-e2")).toBeNull();

    // activate "Leihen" -> e2 (rent at own service) appears
    await fireEvent.press(getByTestId("watchlist-provider-category-rent"));
    expect(getByTestId("watchlist-entry-e2")).toBeTruthy();

    // deactivating both would leave none active: the last one stays on
    await fireEvent.press(getByTestId("watchlist-provider-category-flatrate"));
    await fireEvent.press(getByTestId("watchlist-provider-category-rent"));
    const store = require("@/stores/usePreferencesStore").usePreferencesStore;
    expect(store.getState().listFilters["watchlist:g1"].providerCategories).toEqual(["rent"]);
  });

  it("shows a search-specific text when a search matches nothing, and the empty-list text only for an empty watchlist", async () => {
    setUpHappyPath();
    const WatchlistScreen = loadWatchlistScreen();
    const { getByTestId, queryByTestId, getByText } = await render(<WatchlistScreen />);

    await fireEvent.changeText(getByTestId("watchlist-search-input"), "zzzzzz");

    expect(getByTestId("watchlist-no-results")).toBeTruthy();
    expect(getByText("Keine Treffer für „zzzzzz“.")).toBeTruthy();
    expect(queryByTestId("watchlist-empty")).toBeNull();
  });
});
