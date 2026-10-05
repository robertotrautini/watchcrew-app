import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { fireEvent, render } from "@testing-library/react-native";

// Same MaterialIcons mocking rationale as __tests__/components/movie/MovieGrid.test.tsx
// (the real implementation doesn't forward name/color to the host node RNTL
// queries) -- MovieGrid itself is used for real here (not mocked), since
// this is a screen-integration test of the wiring into it.
const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock({ useLocalSearchParams: () => mockUseLocalSearchParams() }));

const mockUseUserGroups = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseActorFilmography = jest.fn();

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));
jest.mock("@/hooks/useActorFilmography", () => ({
  useActorFilmography: mockUseActorFilmography,
}));

// Lazily required (not statically imported) so the `jest.mock` factories
// above are in place first — same convention as __tests__/screens/Login.test.tsx
// / __tests__/screens/Watchlist.test.tsx.
function loadActorFilmographyScreen() {
  return require("@/app/(app)/(modals)/filmography/actor/[personId]").default;
}

function makeMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: `movie-${overrides.tmdb_id ?? "x"}`,
    tmdb_id: 1,
    name: "Movie",
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
    id: `entry-${overrides.movie_id ?? "x"}`,
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

// Fixture: 5 filmography movies (tmdbId 1-5).
// - tmdbId 1, 3: watched (current user u1 has a real rating -> Diary)
// - tmdbId 2, 4: on the watchlist (no rating)
// - tmdbId 5: not in the group's library at all -> no badge
// => 2 of 5 watched -> "2 von 5 gesehen · 40%".
const FILMOGRAPHY_DATA = [
  { id: 1, title: "Film Eins", poster_path: "/p1.jpg", release_date: "2020-01-01", vote_average: 7 },
  { id: 2, title: "Film Zwei", poster_path: "/p2.jpg", release_date: "2021-01-01", vote_average: 6 },
  { id: 3, title: "Film Drei", poster_path: "/p3.jpg", release_date: "2022-01-01", vote_average: 8 },
  { id: 4, title: "Film Vier", poster_path: "/p4.jpg", release_date: "2023-01-01", vote_average: 5 },
  { id: 5, title: "Film Fuenf", poster_path: "/p5.jpg", release_date: "2024-01-01", vote_average: 4 },
];

const WATCHLIST_ENTRIES = [
  makeEntry({
    id: "e1",
    movie_id: "movie-1",
    movie: makeMovie({ tmdb_id: 1 }),
    ratings: [{ id: "r1", watchlist_entry_id: "e1", member_id: "u1", rating: 5, liked: false, seen_at: "2026-01-01", rated_at: "2026-01-01" }],
  }),
  makeEntry({
    id: "e2",
    movie_id: "movie-2",
    movie: makeMovie({ tmdb_id: 2 }),
    ratings: [],
  }),
  makeEntry({
    id: "e3",
    movie_id: "movie-3",
    movie: makeMovie({ tmdb_id: 3 }),
    ratings: [{ id: "r3", watchlist_entry_id: "e3", member_id: "u1", rating: 4, liked: false, seen_at: "2026-01-02", rated_at: "2026-01-02" }],
  }),
  makeEntry({
    id: "e4",
    movie_id: "movie-4",
    movie: makeMovie({ tmdb_id: 4 }),
    ratings: [],
  }),
];

function setUpHappyPath() {
  mockUseLocalSearchParams.mockReturnValue({ personId: "77" });
  mockCurrentUserId.mockReturnValue("u1");
  mockUseUserGroups.mockReturnValue({
    data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries: WATCHLIST_ENTRIES, streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
    error: null,
  });
  mockUseActorFilmography.mockReturnValue({
    data: FILMOGRAPHY_DATA,
    isLoading: false,
    isError: false,
    error: null,
  });
}

describe("ActorFilmographyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a loading state while the filmography query is loading", async () => {
    mockUseLocalSearchParams.mockReturnValue({ personId: "77" });
    mockCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseActorFilmography.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });

    const Screen = loadActorFilmographyScreen();
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("actor-filmography-screen-loading")).toBeTruthy();
  });

  it("shows an error state when personId is missing/invalid", async () => {
    mockUseLocalSearchParams.mockReturnValue({ personId: undefined });
    mockCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseActorFilmography.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });

    const Screen = loadActorFilmographyScreen();
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("actor-filmography-screen-error")).toBeTruthy();
  });

  it("shows an error state when the filmography query fails", async () => {
    mockUseLocalSearchParams.mockReturnValue({ personId: "77" });
    mockCurrentUserId.mockReturnValue("u1");
    mockUseUserGroups.mockReturnValue({ data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null });
    mockUseActorFilmography.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: { message: "boom" } });

    const Screen = loadActorFilmographyScreen();
    const { getByTestId } = await render(<Screen />);

    expect(getByTestId("actor-filmography-screen-error")).toBeTruthy();
  });

  it("renders one grid tile per filmography item", async () => {
    setUpHappyPath();

    const Screen = loadActorFilmographyScreen();
    const { getByTestId } = await render(<Screen />);

    for (const movie of FILMOGRAPHY_DATA) {
      expect(getByTestId(`actor-filmography-screen-grid-item-${movie.id}`)).toBeTruthy();
    }
  });

  it("shows the progress header as '2 von 5 gesehen · 40%'", async () => {
    setUpHappyPath();

    const Screen = loadActorFilmographyScreen();
    const { getByText } = await render(<Screen />);

    expect(getByText("2 von 5 gesehen · 40%")).toBeTruthy();
  });

  it("shows a watched badge for a watched item and a watchlist badge for an unwatched item, and none for an item not in the library", async () => {
    setUpHappyPath();

    const Screen = loadActorFilmographyScreen();
    const { getByTestId, queryByTestId } = await render(<Screen />);

    const watchedBadge = getByTestId("actor-filmography-screen-grid-badge-1");
    expect(watchedBadge.props.accessibilityLabel).toBe("Gesehen");

    const watchlistBadge = getByTestId("actor-filmography-screen-grid-badge-2");
    expect(watchlistBadge.props.accessibilityLabel).toBe("Auf der Watchlist");

    expect(queryByTestId("actor-filmography-screen-grid-badge-5")).toBeNull();
  });

  it("navigates to the movie-detail route with the tapped item's tmdbId when a tile is pressed", async () => {
    setUpHappyPath();

    const Screen = loadActorFilmographyScreen();
    const { getByTestId } = await render(<Screen />);

    await fireEvent.press(getByTestId("actor-filmography-screen-grid-item-3"));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "3" },
    });
  });
});
