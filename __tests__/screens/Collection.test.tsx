import { fireEvent, render } from "@testing-library/react-native";

// Same Ionicons mocking rationale as __tests__/components/movie/MovieGrid.test.tsx
// (the real implementation doesn't forward name/color to the host node RNTL
// queries) — MovieGrid is rendered for real here (not mocked), since it's a
// small, already-tested presentational component and exercising it for real
// lets this test verify the actual prop wiring (items/testID/badge/filter)
// end-to-end rather than just asserting on mock call args.
jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockUseLocalSearchParams = jest.fn();
const mockPush = jest.fn();
const mockUseRouter = jest.fn(() => ({ push: mockPush }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => mockUseRouter(),
}));

const mockUseCollection = jest.fn();
jest.mock("@/hooks/useCollection", () => ({
  useCollection: (...args: unknown[]) => mockUseCollection(...args),
}));

const mockUseMoviesProviders = jest.fn();
jest.mock("@/hooks/useMoviesProviders", () => ({
  useMoviesProviders: (...args: unknown[]) => mockUseMoviesProviders(...args),
}));

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: () => mockUseCurrentUserId(),
}));

const mockUseUserGroups = jest.fn();
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: (...args: unknown[]) => mockUseUserGroups(...args),
}));

const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: (...args: unknown[]) => mockUseGroupWatchlist(...args),
}));

// Lazily required (not statically imported) to dodge Babel's CJS hoisting of
// the `jest.mock` factories above, matching __tests__/screens/Watchlist.test.tsx
// / __tests__/screens/Login.test.tsx's convention.
function loadCollectionScreen() {
  return require("@/app/(app)/(modals)/collection/[collectionId]").default;
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

const PART_ONE = {
  id: 1,
  title: "Teil Eins",
  poster_path: "/one.jpg",
  release_date: "2020-01-01",
  vote_average: 7.4,
};

const PART_TWO = {
  id: 2,
  title: "Teil Zwei",
  poster_path: "/two.jpg",
  release_date: "2022-01-01",
  vote_average: 6.1,
};

function setUpHappyPath() {
  mockUseLocalSearchParams.mockReturnValue({ collectionId: "999", tmdbId: "678" });
  mockUseCurrentUserId.mockReturnValue("u1");
  mockUseUserGroups.mockReturnValue({
    data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries: [], streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseCollection.mockReturnValue({
    data: { id: 999, name: "Test-Reihe", parts: [PART_ONE, PART_TWO] },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });
}

describe("CollectionScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
  });

  it("shows the error state when collectionId is missing/invalid", async () => {
    mockUseLocalSearchParams.mockReturnValue({ collectionId: "not-a-number", tmdbId: "678" });
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseCollection.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-error")).toBeTruthy();
  });

  it("shows the error state when tmdbId is missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({ collectionId: "999" });
    mockUseCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseCollection.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-error")).toBeTruthy();
  });

  it("shows the data error state when the collection query fails", async () => {
    setUpHappyPath();
    mockUseCollection.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { message: "boom" } });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-error-data")).toBeTruthy();
  });

  it("shows the loading state while the collection query is loading", async () => {
    setUpHappyPath();
    mockUseCollection.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-loading")).toBeTruthy();
  });

  it("renders grid items mapped from the collection's parts", async () => {
    setUpHappyPath();

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-grid-item-1-title").props.children).toBe("Teil Eins");
    expect(getByTestId("collection-screen-grid-item-2-title").props.children).toBe("Teil Zwei");
  });

  it("calls router.push with the movie-detail route and tmdbId when a tile is tapped", async () => {
    setUpHappyPath();

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId } = await render(<CollectionScreen />);

    await fireEvent.press(getByTestId("collection-screen-grid-item-1"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "1" },
    });
  });

  it("filters rendered items via the streaming filter pill", async () => {
    setUpHappyPath();
    const providersByTmdbId = new Map([
      [1, { flatrate: [{ provider_id: 1, provider_name: "Netflix" }], rent: [], buy: [] }],
      [2, { flatrate: [], rent: [], buy: [] }],
    ]);
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId, isLoading: false });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId, queryByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-grid-item-2")).toBeTruthy();

    await fireEvent.press(getByTestId("collection-screen-grid-filter-flatrate"));

    expect(getByTestId("collection-screen-grid-item-1")).toBeTruthy();
    expect(queryByTestId("collection-screen-grid-item-2")).toBeNull();
  });

  it("shows a 'watched' badge for an item the current user has already rated", async () => {
    setUpHappyPath();
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          makeEntry({
            id: "e1",
            movie: makeMovie({ tmdb_id: 1 }),
            ratings: [
              {
                id: "r1",
                watchlist_entry_id: "e1",
                member_id: "u1",
                rating: 4,
                liked: false,
                seen_at: null,
                rated_at: "2026-01-01T00:00:00Z",
              },
            ],
          }),
        ],
        streamingAvailability: new Map(),
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const CollectionScreen = loadCollectionScreen();
    const { getByTestId, queryByTestId } = await render(<CollectionScreen />);

    expect(getByTestId("collection-screen-grid-badge-1").props.accessibilityLabel).toBe("Gesehen");
    expect(queryByTestId("collection-screen-grid-badge-2")).toBeNull();
  });
});
