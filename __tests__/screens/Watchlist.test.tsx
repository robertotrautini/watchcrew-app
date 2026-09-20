import { fireEvent, render, waitFor } from "@testing-library/react-native";

// M7 part 2 (Add-Movie-Modal): the new "+" button navigates via expo-router,
// so this screen now needs a router mock too (it previously had none).
// M10: also needs `useFocusEffect` now (src/hooks/useRegisterFocusedGroupScreen.ts) --
// mocked as "run the effect once on mount, cleanup once on unmount", same
// convention as __tests__/useRegisterFocusedGroupScreen.test.tsx.
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => callback(), []);
  },
}));

// --- Hook mocks -------------------------------------------------------
const mockUseCurrentUserId = jest.fn();
const mockUseActiveGroup = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockUsePreferencesStore = jest.fn();
const mockSetWatchlistViewMode = jest.fn();
// M10 (Realtime foreground sync, ADR 0006): this screen's own realtime/focus
// wiring has its own dedicated tests (useGroupRealtimeSync.test.tsx,
// useRegisterFocusedGroupScreen.test.tsx) -- mocked here as no-ops so this
// file keeps testing only ITS OWN concerns (loading/rendering/sort/filter),
// and so this test doesn't need to construct a real Supabase client.
const mockUseGroupRealtimeSync = jest.fn();
const mockUseRegisterFocusedGroupScreen = jest.fn();

jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));
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
jest.mock("@/stores/usePreferencesStore", () => ({
  usePreferencesStore: mockUsePreferencesStore,
}));

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
  mockUseCurrentUserId.mockReturnValue("u1");
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
  mockUsePreferencesStore.mockImplementation((selector: (state: unknown) => unknown) =>
    selector({
      watchlistViewMode,
      setWatchlistViewMode: mockSetWatchlistViewMode,
      showTitlesInGrid,
    }),
  );
}

describe("WatchlistScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSortWatchlist.mockImplementation(actualWatchlistLogic.sortWatchlist);
    mockSearchEntries.mockImplementation(actualWatchlistLogic.searchEntries);
    setUpPreferencesStore("cards");
  });

  it("renders a loading state while the watchlist query is loading", async () => {
    mockUseCurrentUserId.mockReturnValue("u1");
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
    mockUseCurrentUserId.mockReturnValue("u1");
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

    expect(mockPush).toHaveBeenCalledWith("/add-movie");
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
});
