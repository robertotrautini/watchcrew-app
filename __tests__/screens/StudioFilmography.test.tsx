import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { act, fireEvent, render } from "@testing-library/react-native";

// --- Hook/router mocks -------------------------------------------------
const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock({ useLocalSearchParams: () => mockUseLocalSearchParams() }));

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());

const mockUseUserGroups = jest.fn();
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));

const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));

const mockUseStudioFilmography = jest.fn();
jest.mock("@/hooks/useStudioFilmography", () => ({
  useStudioFilmography: mockUseStudioFilmography,
}));

// Lazily required, per __tests__/screens/Watchlist.test.tsx / Login.test.tsx
// convention, to dodge Babel's CJS hoisting of the jest.mock factories above.
function loadStudioFilmographyScreen() {
  return require("@/app/(app)/(modals)/filmography/studio/[companyId]").default;
}

function makeMovie(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Movie One",
    poster_path: "/one.jpg",
    release_date: "2020-01-01",
    vote_average: 7.5,
    ...overrides,
  };
}

function makeInfiniteQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: { pages: [{ page: 1, results: [makeMovie()], total_pages: 1, total_results: 1 }], pageParams: [1] },
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
}

describe("StudioFilmographyScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ companyId: "42" });
    mockCurrentUserId.mockReturnValue("user-1");
    mockUseUserGroups.mockReturnValue({ data: [{ group_id: "group-1" }], isLoading: false, isError: false });
    mockUseGroupWatchlist.mockReturnValue({ data: { entries: [] }, isLoading: false, isError: false });
    mockUseStudioFilmography.mockReturnValue(makeInfiniteQueryResult());
  });

  it("renders the flattened items across multiple mocked pages", async () => {
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({
        data: {
          pages: [
            { page: 1, results: [makeMovie({ id: 1, title: "Movie One" })], total_pages: 2, total_results: 2 },
            { page: 2, results: [makeMovie({ id: 2, title: "Movie Two" })], total_pages: 2, total_results: 2 },
          ],
          pageParams: [1, 2],
        },
        hasNextPage: false,
      })
    );

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    expect(getByTestId("studio-filmography-screen-grid-item-1")).toBeTruthy();
    expect(getByTestId("studio-filmography-screen-grid-item-2")).toBeTruthy();
  });

  it("dedupes an item appearing in two mocked pages, keeping only one tile", async () => {
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({
        data: {
          pages: [
            { page: 1, results: [makeMovie({ id: 1, title: "Movie One" })], total_pages: 2, total_results: 2 },
            { page: 2, results: [makeMovie({ id: 1, title: "Movie One" })], total_pages: 2, total_results: 2 },
          ],
          pageParams: [1, 2],
        },
        hasNextPage: false,
      })
    );

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getAllByTestId } = await render(<StudioFilmographyScreen />);

    expect(getAllByTestId("studio-filmography-screen-grid-item-1")).toHaveLength(1);
  });

  it('shows the "Mehr laden" button when hasNextPage is true and calls fetchNextPage on press', async () => {
    const fetchNextPage = jest.fn();
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({ hasNextPage: true, fetchNextPage })
    );

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    const loadMoreButton = getByTestId("studio-filmography-screen-load-more-button");
    expect(loadMoreButton).toBeTruthy();

    await act(async () => {
      fireEvent.press(loadMoreButton);
    });

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('disables/loads the "Mehr laden" button while isFetchingNextPage is true', async () => {
    const fetchNextPage = jest.fn();
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({ hasNextPage: true, isFetchingNextPage: true, fetchNextPage })
    );

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    const loadMoreButton = getByTestId("studio-filmography-screen-load-more-button");
    expect(loadMoreButton.props.accessibilityState.disabled).toBe(true);
    expect(getByTestId("studio-filmography-screen-load-more-button-loading-indicator")).toBeTruthy();

    await act(async () => {
      fireEvent.press(loadMoreButton);
    });
    expect(fetchNextPage).not.toHaveBeenCalled();
  });

  it("omits the footer entirely when hasNextPage is false", async () => {
    mockUseStudioFilmography.mockReturnValue(makeInfiniteQueryResult({ hasNextPage: false }));

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { queryByTestId } = await render(<StudioFilmographyScreen />);

    expect(queryByTestId("studio-filmography-screen-grid-footer")).toBeNull();
  });

  it("shows an error state for a missing companyId param", async () => {
    mockUseLocalSearchParams.mockReturnValue({ companyId: undefined });

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    expect(getByTestId("studio-filmography-screen-error")).toBeTruthy();
  });

  it("shows an error state for an invalid (non-numeric) companyId param", async () => {
    mockUseLocalSearchParams.mockReturnValue({ companyId: "not-a-number" });

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    expect(getByTestId("studio-filmography-screen-error")).toBeTruthy();
  });

  it("navigates to the movie-detail route with tmdbId when a tile is pressed", async () => {
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({
        data: { pages: [{ page: 1, results: [makeMovie({ id: 7 })], total_pages: 1, total_results: 1 }], pageParams: [1] },
      })
    );

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    await act(async () => {
      fireEvent.press(getByTestId("studio-filmography-screen-grid-item-7"));
    });

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "7" },
    });
  });

  it("renders a watched badge per a mocked watchlist diary entry", async () => {
    mockUseStudioFilmography.mockReturnValue(
      makeInfiniteQueryResult({
        data: { pages: [{ page: 1, results: [makeMovie({ id: 9 })], total_pages: 1, total_results: 1 }], pageParams: [1] },
      })
    );
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          {
            id: "entry-1",
            group_id: "group-1",
            movie_id: "movie-9",
            added_at: "2026-01-01T00:00:00Z",
            added_by: "user-1",
            movie: { id: "movie-9", tmdb_id: 9, name: "Movie Nine" },
            ratings: [{ user_id: "user-1", rating: 4 }],
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    expect(getByTestId("studio-filmography-screen-grid-badge-9")).toBeTruthy();
  });

  it("shows the initial loading state while isLoading is true", async () => {
    mockUseStudioFilmography.mockReturnValue(makeInfiniteQueryResult({ isLoading: true, data: undefined }));

    const StudioFilmographyScreen = loadStudioFilmographyScreen();
    const { getByTestId } = await render(<StudioFilmographyScreen />);

    expect(getByTestId("studio-filmography-screen-loading")).toBeTruthy();
  });
});
