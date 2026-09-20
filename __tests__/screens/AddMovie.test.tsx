import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

// --- Hook/router mocks, matching __tests__/screens/StudioFilmography.test.tsx's convention ---
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseCurrentUserId = jest.fn();
jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));

const mockUseUserGroups = jest.fn();
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));

const mockUseGroupWatchlist = jest.fn();
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));

const mockUseMovieSearch = jest.fn();
jest.mock("@/hooks/useMovieSearch", () => ({
  useMovieSearch: (...args: unknown[]) => mockUseMovieSearch(...args),
}));

const mockUsePersonSearch = jest.fn();
jest.mock("@/hooks/usePersonSearch", () => ({
  usePersonSearch: (...args: unknown[]) => mockUsePersonSearch(...args),
}));

const mockUseCompanySearch = jest.fn();
jest.mock("@/hooks/useCompanySearch", () => ({
  useCompanySearch: (...args: unknown[]) => mockUseCompanySearch(...args),
}));

const mockUseDirectorFilmography = jest.fn();
jest.mock("@/hooks/useDirectorFilmography", () => ({
  useDirectorFilmography: (...args: unknown[]) => mockUseDirectorFilmography(...args),
}));

const mockUseActorFilmography = jest.fn();
jest.mock("@/hooks/useActorFilmography", () => ({
  useActorFilmography: (...args: unknown[]) => mockUseActorFilmography(...args),
}));

const mockUseStudioFilmography = jest.fn();
jest.mock("@/hooks/useStudioFilmography", () => ({
  useStudioFilmography: (...args: unknown[]) => mockUseStudioFilmography(...args),
}));

const mockAddMutate = jest.fn();
jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useAddToWatchlist: () => ({ mutate: mockAddMutate, isPending: false }),
}));

function loadAddMovieScreen() {
  return require("@/app/(app)/(modals)/add-movie").default;
}

function emptyQueryResult(overrides: Record<string, unknown> = {}) {
  return { data: undefined, isLoading: false, isError: false, ...overrides };
}

function emptyInfiniteQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    ...overrides,
  };
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

function setUpBaseMocks() {
  mockUseCurrentUserId.mockReturnValue("u1");
  mockUseUserGroups.mockReturnValue({ data: [{ group_id: "group-1", user_id: "u1" }] });
  mockUseGroupWatchlist.mockReturnValue({ data: { entries: [], streamingAvailability: new Map() } });
  mockUseMovieSearch.mockReturnValue(emptyQueryResult({ data: [] }));
  mockUsePersonSearch.mockReturnValue(emptyQueryResult({ data: [] }));
  mockUseCompanySearch.mockReturnValue(emptyQueryResult({ data: [] }));
  mockUseDirectorFilmography.mockReturnValue(emptyQueryResult({ data: [] }));
  mockUseActorFilmography.mockReturnValue(emptyQueryResult({ data: [] }));
  mockUseStudioFilmography.mockReturnValue(emptyInfiniteQueryResult());
}

describe("AddMovieScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setUpBaseMocks();
  });

  it("defaults to Film mode, with the streaming-filter toggle visible", async () => {
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId, queryByTestId } = await render(<AddMovieScreen />);

    expect(getByTestId("add-movie-film-search-input")).toBeTruthy();
    expect(getByTestId("add-movie-streaming-filter-toggle")).toBeTruthy();
    expect(queryByTestId("add-movie-person-search-input")).toBeNull();
    expect(queryByTestId("add-movie-company-search-input")).toBeNull();
  });

  it("switches modes via the pills, hiding the streaming-filter toggle outside Film mode", async () => {
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId, queryByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-mode-regisseur"));
    expect(getByTestId("add-movie-person-search-input")).toBeTruthy();
    expect(queryByTestId("add-movie-streaming-filter-toggle")).toBeNull();

    await fireEvent.press(getByTestId("add-movie-mode-studio"));
    expect(getByTestId("add-movie-company-search-input")).toBeTruthy();

    await fireEvent.press(getByTestId("add-movie-mode-besetzung"));
    expect(getByTestId("add-movie-person-search-input")).toBeTruthy();

    await fireEvent.press(getByTestId("add-movie-mode-film"));
    expect(getByTestId("add-movie-film-search-input")).toBeTruthy();
  });

  it("Film mode: passes the typed query through to useMovieSearch and renders results in the grid", async () => {
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 603, title: "The Matrix", release_date: "1999-03-31", poster_path: null, vote_average: 8.2 }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.changeText(getByTestId("add-movie-film-search-input"), "matrix");

    expect(mockUseMovieSearch).toHaveBeenLastCalledWith("matrix");
    expect(getByTestId("add-movie-film-grid-item-603")).toBeTruthy();
  });

  it("tapping a result tile navigates to the movie detail overlay with just tmdbId when not in the library", async () => {
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 603, title: "The Matrix", release_date: "1999-03-31" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-film-grid-item-603"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "603" },
    });
  });

  it("tapping a result tile already on the watchlist navigates with groupId/source/watchlistEntryId", async () => {
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [makeEntry({ id: "entry-1", movie: makeMovie({ tmdb_id: 603 }), ratings: [] })],
        streamingAvailability: new Map(),
      },
    });
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 603, title: "The Matrix", release_date: "1999-03-31" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-film-grid-item-603"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "603", groupId: "group-1", source: "watchlist", watchlistEntryId: "entry-1" },
    });
  });

  it("quick-add: adds a movie with a release date directly, with no manual-date or duplicate sheet", async () => {
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 603, title: "The Matrix", release_date: "1999-03-31" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId, queryByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-film-grid-add-603"));

    expect(mockAddMutate).toHaveBeenCalledWith({ tmdbId: 603, groupId: "group-1", addedBy: "u1" });
    expect(queryByTestId("add-movie-manual-date-input")).toBeNull();
    expect(queryByTestId("add-movie-duplicate-cancel-button")).toBeNull();
  });

  it("manual-date fallback: gates the add behind a required date input when release_date is missing", async () => {
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 604, title: "No Date Movie", release_date: undefined }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-film-grid-add-604"));

    expect(mockAddMutate).not.toHaveBeenCalled();
    expect(getByTestId("add-movie-manual-date-input")).toBeTruthy();

    // Confirm button disabled until a date is typed.
    await fireEvent.press(getByTestId("add-movie-manual-date-confirm-button"));
    expect(mockAddMutate).not.toHaveBeenCalled();

    await fireEvent.changeText(getByTestId("add-movie-manual-date-input"), "1999-03-31");
    await fireEvent.press(getByTestId("add-movie-manual-date-confirm-button"));

    expect(mockAddMutate).toHaveBeenCalledWith({ tmdbId: 604, groupId: "group-1", addedBy: "u1" });
  });

  it("duplicate warning: shows the 'Bereits gesehen' sheet with the average rating when the target group already rated this tmdbId", async () => {
    mockUseGroupWatchlist.mockReturnValue({
      data: {
        entries: [
          makeEntry({
            id: "entry-1",
            movie: makeMovie({ tmdb_id: 603 }),
            ratings: [
              { id: "r1", watchlist_entry_id: "entry-1", member_id: "u1", rating: 4, liked: false, seen_at: null, rated_at: null },
              { id: "r2", watchlist_entry_id: "entry-1", member_id: "u2", rating: 5, liked: false, seen_at: null, rated_at: null },
            ],
          }),
        ],
        streamingAvailability: new Map(),
      },
    });
    mockUseMovieSearch.mockReturnValue(
      emptyQueryResult({ data: [{ id: 603, title: "The Matrix", release_date: "1999-03-31" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId, getByText } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-film-grid-add-603"));

    expect(mockAddMutate).not.toHaveBeenCalled();
    expect(getByText("Film bereits gesehen")).toBeTruthy();
    expect(getByText(/Ø 4\.5 Sternen/)).toBeTruthy();

    await fireEvent.press(getByTestId("add-movie-duplicate-cancel-button"));
    expect(mockAddMutate).not.toHaveBeenCalled();

    await fireEvent.press(getByTestId("add-movie-film-grid-add-603"));
    await fireEvent.press(getByTestId("add-movie-duplicate-confirm-button"));

    expect(mockAddMutate).toHaveBeenCalledWith({ tmdbId: 603, groupId: "group-1", addedBy: "u1" });
  });

  it("Regisseur mode: searching, selecting a person, then rendering their (director) filmography grid", async () => {
    mockUsePersonSearch.mockReturnValue(emptyQueryResult({ data: [{ id: 5, name: "Jane Director" }] }));
    mockUseDirectorFilmography.mockReturnValue(
      emptyQueryResult({ data: [{ id: 10, title: "Directed Movie", release_date: "2020-01-01" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId, queryByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-mode-regisseur"));
    await fireEvent.changeText(getByTestId("add-movie-person-search-input"), "jane");

    expect(mockUsePersonSearch).toHaveBeenLastCalledWith("jane");
    expect(getByTestId("add-movie-person-result-5")).toBeTruthy();

    await fireEvent.press(getByTestId("add-movie-person-result-5"));

    expect(mockUseDirectorFilmography).toHaveBeenLastCalledWith(5);
    expect(mockUseActorFilmography).toHaveBeenLastCalledWith(undefined);
    expect(queryByTestId("add-movie-person-search-input")).toBeNull();
    expect(getByTestId("add-movie-person-grid-item-10")).toBeTruthy();
  });

  it("Besetzung mode: selecting a person loads their actor filmography, not director", async () => {
    mockUsePersonSearch.mockReturnValue(emptyQueryResult({ data: [{ id: 6, name: "John Actor" }] }));
    mockUseActorFilmography.mockReturnValue(
      emptyQueryResult({ data: [{ id: 11, title: "Acted Movie", release_date: "2021-01-01" }] }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-mode-besetzung"));
    await fireEvent.press(getByTestId("add-movie-person-result-6"));

    expect(mockUseActorFilmography).toHaveBeenLastCalledWith(6);
    expect(getByTestId("add-movie-person-grid-item-11")).toBeTruthy();
  });

  it("Studio mode: searching, selecting a company, then rendering the paginated studio grid with a load-more footer", async () => {
    mockUseCompanySearch.mockReturnValue(emptyQueryResult({ data: [{ id: 9, name: "Studio Nine" }] }));
    mockUseStudioFilmography.mockReturnValue(
      emptyInfiniteQueryResult({
        data: { pages: [{ page: 1, results: [{ id: 20, title: "Studio Movie" }], total_pages: 2, total_results: 40 }] },
        hasNextPage: true,
      }),
    );
    const AddMovieScreen = loadAddMovieScreen();
    const { getByTestId } = await render(<AddMovieScreen />);

    await fireEvent.press(getByTestId("add-movie-mode-studio"));
    await fireEvent.changeText(getByTestId("add-movie-company-search-input"), "studio nine");

    expect(mockUseCompanySearch).toHaveBeenLastCalledWith("studio nine");
    await fireEvent.press(getByTestId("add-movie-company-result-9"));

    expect(mockUseStudioFilmography).toHaveBeenLastCalledWith(9);
    expect(getByTestId("add-movie-studio-grid-item-20")).toBeTruthy();
    expect(getByTestId("add-movie-studio-load-more-button")).toBeTruthy();
  });
});
