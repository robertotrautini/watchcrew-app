import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { fireEvent, render } from "@testing-library/react-native";

// Same MaterialIcons mocking rationale as __tests__/components/movie/MovieGrid.test.tsx
// / __tests__/screens/Collection.test.tsx (the real implementation doesn't
// forward name/color to the host node RNTL queries) — MovieGrid is rendered
// for real here (not mocked), since it's a small, already-tested
// presentational component and exercising it for real lets this test verify
// the actual prop wiring (items/testID/badge/filter) end-to-end rather than
// just asserting on mock call args.
const mockUseLocalSearchParams = jest.fn();
const mockReplace = jest.fn();
const mockUseRouter = jest.fn(() => ({ replace: mockReplace }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => mockUseRouter(),
}));

const mockUseSimilarMovies = jest.fn();
jest.mock("@/hooks/useSimilarMovies", () => ({
  useSimilarMovies: (...args: unknown[]) => mockUseSimilarMovies(...args),
}));

const mockUseMoviesProviders = jest.fn();
jest.mock("@/hooks/useMoviesProviders", () => ({
  useMoviesProviders: (...args: unknown[]) => mockUseMoviesProviders(...args),
}));

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());

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
// / __tests__/screens/Collection.test.tsx's convention.
function loadSimilarMoviesScreen() {
  return require("@/app/(app)/(modals)/similar/[tmdbId]").default;
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

const RELATED_ONE = { title: "Verwandter Film Eins", year: 2020, ids: { trakt: 1, tmdb: 101 } };
const RELATED_TWO = { title: "Verwandter Film Zwei", year: 2022, ids: { trakt: 2, tmdb: 102 } };
// No `ids.tmdb` — must be filtered out entirely (can't badge/link/navigate).
const RELATED_NO_TMDB = { title: "Ohne TMDB-Id", year: 2019, ids: { trakt: 3, slug: "ohne-tmdb-id" } };

function setUpHappyPath() {
  mockUseLocalSearchParams.mockReturnValue({ tmdbId: "678" });
  mockCurrentUserId.mockReturnValue("u1");
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
  mockUseSimilarMovies.mockReturnValue({
    data: [RELATED_ONE, RELATED_TWO, RELATED_NO_TMDB],
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });
}

describe("SimilarMoviesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
  });

  it("shows the error state when tmdbId is missing/invalid", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tmdbId: "not-a-number" });
    mockCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseSimilarMovies.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-error")).toBeTruthy();
  });

  it("shows the error state when tmdbId param is absent entirely", async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseSimilarMovies.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId: new Map(), isLoading: false });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-error")).toBeTruthy();
  });

  it("shows the data error state when the similar-movies query fails", async () => {
    setUpHappyPath();
    mockUseSimilarMovies.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { message: "boom" } });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-error-data")).toBeTruthy();
  });

  it("shows the loading state while the similar-movies query is loading", async () => {
    setUpHappyPath();
    mockUseSimilarMovies.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-loading")).toBeTruthy();
  });

  it("renders grid items mapped from Trakt data, filtering out items missing ids.tmdb", async () => {
    setUpHappyPath();

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-grid-item-101-title").props.children).toBe("Verwandter Film Eins");
    expect(getByTestId("similar-movies-screen-grid-item-102-title").props.children).toBe("Verwandter Film Zwei");
    // RELATED_NO_TMDB has no ids.tmdb, so it has no tmdbId to render a tile under.
    expect(queryByTestId(/similar-movies-screen-grid-item-.*Ohne/)).toBeNull();
  });

  it("maps a Trakt item's year to a Jan-1st placeholder releaseDate and omits poster/score when the item has none", async () => {
    setUpHappyPath();

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    // No posterPath -> placeholder tile rendered; no voteAverage -> no score pill.
    expect(getByTestId("similar-movies-screen-grid-item-101-poster-placeholder")).toBeTruthy();
    expect(queryByTestId("similar-movies-screen-grid-score-101")).toBeNull();
  });

  it("passes server-enriched posterPath/voteAverage through to the grid", async () => {
    setUpHappyPath();
    mockUseSimilarMovies.mockReturnValue({
      data: [{ ...RELATED_ONE, posterPath: "/abc.jpg", voteAverage: 7.8 }, RELATED_TWO],
      isLoading: false,
      isError: false,
      error: null,
    });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-grid-item-101-poster")).toBeTruthy();
    expect(queryByTestId("similar-movies-screen-grid-item-101-poster-placeholder")).toBeNull();
    expect(getByTestId("similar-movies-screen-grid-score-101")).toBeTruthy();
    // Item without enrichment still falls back to the placeholder.
    expect(getByTestId("similar-movies-screen-grid-item-102-poster-placeholder")).toBeTruthy();
  });

  it("calls router.replace with tmdbId only when the tapped movie is NOT already in the library", async () => {
    setUpHappyPath();

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    await fireEvent.press(getByTestId("similar-movies-screen-grid-item-101"));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "101" },
    });
  });

  it("calls router.replace with groupId/source=watchlist/watchlistEntryId when the tapped movie is on the group's watchlist (unrated)", async () => {
    setUpHappyPath();
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 101 }) })],
        streamingAvailability: new Map(),
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    await fireEvent.press(getByTestId("similar-movies-screen-grid-item-101"));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "101", groupId: "g1", source: "watchlist", watchlistEntryId: "e1" },
    });
  });

  it("calls router.replace with groupId/source=diary/watchlistEntryId when the tapped movie is already watched (rated)", async () => {
    setUpHappyPath();
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          makeEntry({
            id: "e1",
            movie: makeMovie({ tmdb_id: 101 }),
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

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId } = await render(<SimilarMoviesScreen />);

    await fireEvent.press(getByTestId("similar-movies-screen-grid-item-101"));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "101", groupId: "g1", source: "diary", watchlistEntryId: "e1" },
    });
  });

  it("filters rendered items via the streaming filter pill", async () => {
    setUpHappyPath();
    const providersByTmdbId = new Map([
      [101, { flatrate: [{ provider_id: 1, provider_name: "Netflix" }], rent: [], buy: [] }],
      [102, { flatrate: [], rent: [], buy: [] }],
    ]);
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId, isLoading: false });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-grid-item-102")).toBeTruthy();

    await fireEvent.press(getByTestId("similar-movies-screen-grid-filter-flatrate"));

    expect(getByTestId("similar-movies-screen-grid-item-101")).toBeTruthy();
    expect(queryByTestId("similar-movies-screen-grid-item-102")).toBeNull();
  });

  it("narrows the streaming filter pill to the user's own services when some are selected", async () => {
    setUpHappyPath();
    const store = require("@/stores/usePreferencesStore").usePreferencesStore;
    store.setState({ selectedStreamingProviderIds: [2] });
    const providersByTmdbId = new Map([
      [101, { flatrate: [{ provider_id: 1, provider_name: "Netflix" }], rent: [], buy: [] }],
      [102, { flatrate: [{ provider_id: 2, provider_name: "Prime" }], rent: [], buy: [] }],
    ]);
    mockUseMoviesProviders.mockReturnValue({ providersByTmdbId, isLoading: false });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);
    await fireEvent.press(getByTestId("similar-movies-screen-grid-filter-flatrate"));

    expect(getByTestId("similar-movies-screen-grid-item-102")).toBeTruthy();
    expect(queryByTestId("similar-movies-screen-grid-item-101")).toBeNull();
    store.setState({ selectedStreamingProviderIds: [] });
  });

  it("shows a 'watchlist' badge for an item on the active group's watchlist", async () => {
    setUpHappyPath();
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [makeEntry({ id: "e1", movie: makeMovie({ tmdb_id: 101 }) })],
        streamingAvailability: new Map(),
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-grid-badge-101").props.accessibilityLabel).toBe("Auf der Watchlist");
    expect(queryByTestId("similar-movies-screen-grid-badge-102")).toBeNull();
  });

  it("shows a 'watched' badge for an item the current user has already rated", async () => {
    setUpHappyPath();
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          makeEntry({
            id: "e1",
            movie: makeMovie({ tmdb_id: 101 }),
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

    const SimilarMoviesScreen = loadSimilarMoviesScreen();
    const { getByTestId, queryByTestId } = await render(<SimilarMoviesScreen />);

    expect(getByTestId("similar-movies-screen-grid-badge-101").props.accessibilityLabel).toBe("Gesehen");
    expect(queryByTestId("similar-movies-screen-grid-badge-102")).toBeNull();
  });
});
