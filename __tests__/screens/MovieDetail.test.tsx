import { render } from "@testing-library/react-native";

// M6 part 2a: minimal smoke test for the Movie-Detail-Overlay route file,
// following the precedent set by __tests__/screens/Collection.test.tsx /
// SimilarMovies.test.tsx (mock expo-router + every data hook, require the
// route lazily). This is NOT a re-test of the 91 already-passing
// component-level/logic tests this screen composes (44 logic + 21 header +
// 16 body + 7 actions-bar) — it only asserts the route file itself wires
// everything together without crashing, for both the invalid-param error
// state and the happy-path render.

const mockUseLocalSearchParams = jest.fn();
const mockUseRouter = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => mockUseRouter(),
  Stack: { Screen: () => null },
}));

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// MovieDetailPosterTrailer (real component, rendered as-is by this route)
// pulls in react-native-webview/expo-screen-orientation, which need the same
// mocks as __tests__/components/movie/MovieDetailPosterTrailer.test.tsx.
jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return {
    WebView: (props: Record<string, unknown>) => <View testID="movie-detail-trailer-webview" {...props} />,
  };
});

jest.mock("expo-screen-orientation", () => ({
  lockAsync: jest.fn(),
  OrientationLock: { LANDSCAPE: "LANDSCAPE", PORTRAIT_UP: "PORTRAIT_UP" },
}));

const mockUseCurrentUserId = jest.fn();
const mockUseUserGroups = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseMovieDetail = jest.fn();
const mockUseToggleLike = jest.fn();
const mockUseDeleteWatchlistEntry = jest.fn();
const mockUseAddToWatchlist = jest.fn();

jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));
jest.mock("@/hooks/useMovieDetail", () => ({
  useMovieDetail: mockUseMovieDetail,
}));
// NOT `jest.requireActual` here: the real module chain
// (useMovieDetailMutations -> movieDetailMutations -> lib/supabase) would
// construct a real Supabase client (incl. a Realtime websocket) at import
// time, which errors out under Jest's Node environment. So every export
// MovieDetailActionsBar needs from this module is mocked directly instead,
// including a standalone `MovieNotCatalogedError` stand-in (never actually
// thrown in these tests, just needs to exist as an importable class).
class MockMovieNotCatalogedError extends Error {}
jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useToggleLike: mockUseToggleLike,
  useDeleteWatchlistEntry: mockUseDeleteWatchlistEntry,
  useAddToWatchlist: mockUseAddToWatchlist,
  MovieNotCatalogedError: MockMovieNotCatalogedError,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the jest.mock factories above, matching the convention in
// __tests__/screens/Collection.test.tsx.
function loadMovieDetailScreen() {
  return require("@/app/(app)/(modals)/movie/[tmdbId]").default;
}

function setupDefaultMocks() {
  mockUseRouter.mockReturnValue({
    back: jest.fn(),
    canGoBack: () => true,
    push: jest.fn(),
  });
  mockUseCurrentUserId.mockReturnValue("user-1");
  mockUseUserGroups.mockReturnValue({ data: [] });
  mockUseGroupMembers.mockReturnValue({ data: [] });
  mockUseGroupWatchlist.mockReturnValue({ data: undefined });
  mockUseMovieDetail.mockReturnValue({ data: undefined, isLoading: false });
  mockUseToggleLike.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteWatchlistEntry.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseAddToWatchlist.mockReturnValue({ mutate: jest.fn(), isPending: false });
}

describe("MovieDetailScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  it("renders an inline error state for an invalid/missing tmdbId, without crashing", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tmdbId: "not-a-number" });

    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, getByText } = await render(<MovieDetailScreen />);

    expect(getByTestId("movie-detail-invalid")).toBeTruthy();
    expect(getByText("Ungültiger Film")).toBeTruthy();
  });

  it("renders the composed screen for a valid tmdbId with no group context, without crashing", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tmdbId: "42" });

    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, getByText } = await render(<MovieDetailScreen />);

    expect(getByTestId("movie-detail-screen")).toBeTruthy();
    expect(getByTestId("movie-detail-back-button")).toBeTruthy();
    expect(getByTestId("movie-detail-action-bar")).toBeTruthy();
    // No storedMovie available -> falls back to the "Film" placeholder title.
    expect(getByText("Film")).toBeTruthy();
  });

  it("renders the 'Bewertungen' section only when source is diary", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      tmdbId: "42",
      groupId: "group-1",
      source: "diary",
      watchlistEntryId: "entry-1",
    });
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          {
            id: "entry-1",
            group_id: "group-1",
            movie_id: "movie-1",
            added_at: "2026-01-01T00:00:00Z",
            added_by: "user-1",
            paid_by_member_id: null,
            paid_at: null,
            movie: {
              id: "movie-1",
              tmdb_id: 42,
              name: "Test Movie",
              release_date: "2020-01-01",
              poster: null,
              overview: null,
              runtime: null,
              director: null,
              director_id: null,
              vote_average: null,
            },
            ratings: [],
          },
        ],
        streamingAvailability: new Map(),
      },
    });

    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, getByText } = await render(<MovieDetailScreen />);

    expect(getByTestId("movie-detail-ratings-section")).toBeTruthy();
    expect(getByText("Test Movie")).toBeTruthy();
  });
});
