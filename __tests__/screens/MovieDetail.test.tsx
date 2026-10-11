import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { fireEvent, render } from "@testing-library/react-native";

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

// MovieDetailPosterTrailer (real component, rendered as-is by this route)
// pulls in react-native-webview, which needs the same
// mock as __tests__/components/movie/MovieDetailPosterTrailer.test.tsx.
jest.mock("react-native-webview", () => {
  const { View } = require("react-native");
  return {
    WebView: (props: Record<string, unknown>) => <View testID="movie-detail-trailer-webview" {...props} />,
  };
});

const mockUseActiveGroup = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseMovieDetail = jest.fn();
const mockUseToggleLike = jest.fn();
const mockUseDeleteWatchlistEntry = jest.fn();
const mockUseAddToWatchlist = jest.fn();
const mockSetReleaseDateMutate = jest.fn();

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
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
// MovieDetailActionsBar needs from this module is mocked directly instead.
jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useToggleLike: mockUseToggleLike,
  useDeleteWatchlistEntry: mockUseDeleteWatchlistEntry,
  useAddToWatchlist: mockUseAddToWatchlist,
  useSetReleaseDateOverride: () => ({ mutate: mockSetReleaseDateMutate, isPending: false }),
}));

// M7 consolidation (Item 2): this screen now renders the real `RatingDialog`
// (src/components/movie/RatingDialog.tsx), which itself pulls in
// `useSaveRating`/`useResetRating` (src/hooks/useSaveRating.ts) -- same
// "mock the whole hook module, never requireActual" rationale as
// useMovieDetailMutations above (that module chain also ends at a real
// src/lib/supabase client construction, which errors under Jest's Node
// environment).
const mockUseSaveRating = jest.fn();
const mockUseResetRating = jest.fn();
jest.mock("@/hooks/useSaveRating", () => ({
  useSaveRating: mockUseSaveRating,
  useResetRating: mockUseResetRating,
}));

// RatingDialog pulls in useDirectRate -> lib/supabase (realtime needs a WebSocket
// that plain Node lacks); not under test here.
jest.mock("@/hooks/useDirectRate", () => ({
  useDirectRate: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  DirectRateError: class DirectRateError extends Error {},
}));

// RatingDialog itself renders react-native's DateTimePicker indirectly via
// src/components/ui/DateField.tsx -- mocked the same way as every other
// test that renders RatingDialog (see RatingDialog.test.tsx).
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

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
  mockCurrentUserId.mockReturnValue("user-1");
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: undefined,
    setActiveGroup: jest.fn(),
    groupsQuery: { data: [] },
  });
  mockUseGroupMembers.mockReturnValue({ data: [] });
  mockUseGroupWatchlist.mockReturnValue({ data: undefined });
  mockUseMovieDetail.mockReturnValue({ data: undefined, isLoading: false });
  mockUseToggleLike.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseDeleteWatchlistEntry.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseAddToWatchlist.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseSaveRating.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseResetRating.mockReturnValue({ mutate: jest.fn(), isPending: false });
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

  it("renders the group ratings block in diary context only when other members exist", async () => {
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

    mockUseGroupMembers.mockReturnValue({ data: [{ user_id: "user-1", profiles: null }, { user_id: "user-2", profiles: { display_name: "Ben" } }] });
    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, getByText, queryByTestId, rerender } = await render(<MovieDetailScreen />);

    expect(getByTestId("movie-detail-ratings-section")).toBeTruthy();
    expect(getByText("Test Movie")).toBeTruthy();

    mockUseGroupMembers.mockReturnValue({ data: [{ user_id: "user-1", profiles: null }] });
    await rerender(<MovieDetailScreen />);
    expect(queryByTestId("movie-detail-ratings-section")).toBeNull();
  });

  it("switches the action bar to the in-watchlist actions once the movie appears in the active group's watchlist (no route group context)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tmdbId: "42" });
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "active-group-1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [] },
    });
    mockUseGroupWatchlist.mockImplementation((groupId: string | undefined) => ({
      data:
        groupId === "active-group-1"
          ? {
              entries: [
                {
                  id: "entry-new",
                  group_id: "active-group-1",
                  movie_id: "movie-1",
                  added_at: "2026-01-01T00:00:00Z",
                  added_by: "user-1",
                  paid_by_member_id: null,
                  paid_at: null,
                  movie: { id: "movie-1", tmdb_id: 42, name: "Test Movie", release_date: null, poster: null, overview: null, runtime: null, director: null, director_id: null, vote_average: null },
                  ratings: [],
                },
              ],
              streamingAvailability: new Map(),
            }
          : undefined,
    }));

    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);

    expect(queryByTestId("movie-detail-action-zur_watchlist")).toBeNull();
    expect(queryByTestId("movie-detail-action-direkt_bewerten")).toBeNull();
    expect(getByTestId("movie-detail-action-loeschen")).toBeTruthy();
  });

  it("tapping 'Löschen' on the screen opens the ConfirmDialog; confirm triggers exactly one delete mutation", async () => {
    mockUseLocalSearchParams.mockReturnValue({ tmdbId: "42" });
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "active-group-1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [] },
    });
    mockUseGroupWatchlist.mockImplementation((groupId: string | undefined) => ({
      data:
        groupId === "active-group-1"
          ? {
              entries: [
                {
                  id: "entry-new",
                  group_id: "active-group-1",
                  movie_id: "movie-1",
                  added_at: "2026-01-01T00:00:00Z",
                  added_by: "user-1",
                  paid_by_member_id: null,
                  paid_at: null,
                  movie: { id: "movie-1", tmdb_id: 42, name: "Test Movie", release_date: null, poster: null, overview: null, runtime: null, director: null, director_id: null, vote_average: null },
                  ratings: [],
                },
              ],
              streamingAvailability: new Map(),
            }
          : undefined,
    }));
    const deleteMutate = jest.fn();
    mockUseDeleteWatchlistEntry.mockReturnValue({ mutate: deleteMutate, isPending: false });

    const MovieDetailScreen = loadMovieDetailScreen();
    const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);

    expect(queryByTestId("movie-detail-delete-dialog")).toBeNull();
    await fireEvent.press(getByTestId("movie-detail-action-loeschen"));
    expect(getByTestId("movie-detail-delete-dialog")).toBeTruthy();
    await fireEvent.press(getByTestId("movie-detail-delete-confirm-button"));
    expect(deleteMutate).toHaveBeenCalledTimes(1);
    expect(deleteMutate.mock.calls[0][0]).toEqual({ watchlistEntryId: "entry-new", groupId: "active-group-1" });
  });

  describe("live TMDB details when the movie is not stored locally (opened from search)", () => {
    function mockLiveDetails() {
      mockUseMovieDetail.mockReturnValue({
        isLoading: false,
        data: {
          details: {
            id: 27205,
            title: "Inception",
            overview: "Ein Dieb der Traeume stiehlt.",
            posterPath: "/poster123.jpg",
            releaseDate: "2010-07-15",
            runtime: 148,
            genres: ["Action"],
            belongs_to_collection: null,
            vote_average: 8.4,
          },
          trailer: null,
          credits: null,
          germanReleaseDate: { category: "Kino", release_date: "2010-07-29T00:00:00.000Z" },
          providers: null,
        },
      });
    }

    it("shows the live title instead of the 'Film' placeholder", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205" });
      mockLiveDetails();

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByText, queryByText } = await render(<MovieDetailScreen />);

      expect(getByText("Inception")).toBeTruthy();
      expect(queryByText("Film")).toBeNull();
    });

    it("renders the poster from the live posterPath as a full TMDB image URL", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205" });
      mockLiveDetails();

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-poster-image").props.source).toEqual([
        { uri: "https://image.tmdb.org/t/p/w780/poster123.jpg" },
      ]);
    });

    it("shows the per-group release_date_override instead of the TMDB/German date", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "27205",
        groupId: "group-1",
        source: "watchlist",
        watchlistEntryId: "entry-1",
      });
      mockLiveDetails();
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
              release_date_override: "2027-03-05",
              movie: { id: "movie-1", tmdb_id: 27205, name: "Inception", release_date: "2010-07-16", poster: null, overview: null, runtime: null, director: null, director_id: null, vote_average: null },
              ratings: [],
            },
          ],
          streamingAvailability: new Map(),
        },
      });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-release-date").props.children).toBe("Erscheinungsdatum 05.03.2027");
      expect(queryByTestId("movie-detail-action-erscheinungsdatum")).toBeNull();
    });

    it("no group context: the release date is not tappable", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205" });
      mockLiveDetails();

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-release-date")).toBeTruthy();
      expect(queryByTestId("movie-detail-release-date-edit")).toBeNull();
    });

    it("formats an ISO-datetime release date as DD.MM.YYYY", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205" });
      mockLiveDetails();

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-release-date").props.children).toBe("Kino 29.07.2010");
    });

    it("turns a stored bare poster path into a full TMDB image URL", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        movieJson: encodeURIComponent(
          JSON.stringify({ id: "m", tmdb_id: 42, name: "Stored", poster: "/stored.jpg", release_date: null }),
        ),
      });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-poster-image").props.source).toEqual([
        { uri: "https://image.tmdb.org/t/p/w780/stored.jpg" },
      ]);
    });
  });

  // M7 consolidation (Item 2): RatingDialog wiring smoke tests -- the real
  // dialog is now rendered by this screen (see the module comment above the
  // hook mocks), replacing the former placeholder-route navigation.
  describe("RatingDialog wiring", () => {
    const { fireEvent } = require("@testing-library/react-native");

    it("'direkt_bewerten' (no group context) opens the dialog in 'direct' mode without any addToWatchlist write", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "42" });
      mockUseActiveGroup.mockReturnValue({
        activeGroupId: "active-group-1",
        setActiveGroup: jest.fn(),
        groupsQuery: { data: [{ group_id: "active-group-1", user_id: "user-1" }] },
      });
      const directAddMutate = jest.fn();
      mockUseAddToWatchlist.mockReturnValue({ mutate: directAddMutate, isPending: false });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, getAllByText, queryByTestId } = await render(<MovieDetailScreen />);

      expect(queryByTestId("rating-dialog")).toBeNull();

      await fireEvent.press(getByTestId("movie-detail-action-direkt_bewerten"));

      expect(getByTestId("rating-dialog")).toBeTruthy();
      // The dialog's Sheet title ("Direkt bewerten") is a SECOND occurrence
      // of this text alongside the action button's own label -- proves the
      // Sheet actually opened with the "direct" mode's title, not just that
      // the button rendered.
      expect(getAllByText("Direkt bewerten").length).toBeGreaterThan(1);
      expect(directAddMutate).not.toHaveBeenCalled();
    });

    it("'bewerten' (watchlist context) opens the dialog in 'watchlist' mode for the existing watchlistEntryId", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        groupId: "group-1",
        source: "watchlist",
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
      const { getByTestId, getAllByText, queryByTestId } = await render(<MovieDetailScreen />);

      expect(queryByTestId("rating-dialog")).toBeNull();

      await fireEvent.press(getByTestId("movie-detail-action-bewerten"));

      expect(getByTestId("rating-dialog")).toBeTruthy();
      // Same rationale as the "direkt_bewerten" test above: a second
      // "Bewerten" occurrence (the Sheet title) proves the dialog opened.
      expect(getAllByText("Bewerten").length).toBeGreaterThan(1);
    });

    it("'bearbeiten' (diary context) opens the dialog in 'diary' mode", async () => {
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

      await fireEvent.press(getByTestId("movie-detail-action-bearbeiten"));

      expect(getByTestId("rating-dialog")).toBeTruthy();
      expect(getByText("Bewertung bearbeiten")).toBeTruthy();
    });

    function watchlistEntries() {
      return {
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
      };
    }

    it("watchlist context: no 'bearbeiten' button; tapping the date opens the entry edit sheet, not the rating dialog", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        groupId: "group-1",
        source: "watchlist",
        watchlistEntryId: "entry-1",
      });
      mockUseGroupWatchlist.mockReturnValue(watchlistEntries());

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, getByText, queryByTestId } = await render(<MovieDetailScreen />);

      expect(queryByTestId("movie-detail-action-bearbeiten")).toBeNull();
      expect(queryByTestId("movie-detail-release-date-field")).toBeNull();

      await fireEvent.press(getByTestId("movie-detail-release-date-edit"));

      expect(queryByTestId("rating-dialog")).toBeNull();
      expect(getByText("Eintrag bearbeiten")).toBeTruthy();
      expect(getByTestId("movie-detail-release-date-field")).toBeTruthy();
    });

    function undatedWatchlistEntries() {
      const base = watchlistEntries();
      base.data.entries[0].movie.release_date = null as unknown as string;
      return base;
    }

    it("watchlist context without any date: shows 'Kein Datum' placeholder, tap opens the sheet, picking + Speichern saves the date", async () => {
      mockSetReleaseDateMutate.mockClear();
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        groupId: "group-1",
        source: "watchlist",
        watchlistEntryId: "entry-1",
      });
      mockUseGroupWatchlist.mockReturnValue(undatedWatchlistEntries());

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, getByText } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-release-date").props.children).toBe("Kein Datum");
      await fireEvent.press(getByTestId("movie-detail-release-date-edit"));
      expect(getByText("Eintrag bearbeiten")).toBeTruthy();

      await fireEvent.press(getByTestId("movie-detail-release-date-field"));
      await fireEvent(
        getByTestId("movie-detail-release-date-field-picker"),
        "change",
        { type: "set" },
        new Date(2027, 2, 5),
      );
      expect(mockSetReleaseDateMutate).not.toHaveBeenCalled();
      await fireEvent.press(getByTestId("movie-detail-release-date-save-button"));
      expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
        watchlistEntryId: "entry-1",
        groupId: "group-1",
        releaseDate: "2027-03-05",
      });
    });

    it("diary context without any date: no date line and no 'Kein Datum'", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        groupId: "group-1",
        source: "diary",
        watchlistEntryId: "entry-1",
      });
      mockUseGroupWatchlist.mockReturnValue(undatedWatchlistEntries());

      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryByTestId, queryByText } = await render(<MovieDetailScreen />);

      expect(queryByTestId("movie-detail-release-date")).toBeNull();
      expect(queryByTestId("movie-detail-release-date-edit")).toBeNull();
      expect(queryByText("Kein Datum")).toBeNull();
    });

    it("no group context without any date: nothing rendered", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "42" });
      mockUseMovieDetail.mockReturnValue({ data: undefined, isLoading: false, isError: false });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryByTestId, queryByText } = await render(<MovieDetailScreen />);

      expect(queryByTestId("movie-detail-release-date")).toBeNull();
      expect(queryByText("Kein Datum")).toBeNull();
    });

    it("diary context: the release date is not tappable", async () => {
      mockUseLocalSearchParams.mockReturnValue({
        tmdbId: "42",
        groupId: "group-1",
        source: "diary",
        watchlistEntryId: "entry-1",
      });
      mockUseGroupWatchlist.mockReturnValue(watchlistEntries());

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-release-date")).toBeTruthy();
      expect(queryByTestId("movie-detail-release-date-edit")).toBeNull();
    });
  });

  describe("central content loading (first open from a search result)", () => {
    const movieJson = JSON.stringify({
      id: "m1",
      tmdb_id: 27205,
      name: "Inception",
      poster: "/p.jpg",
      overview: "Ein Dieb der Traeume stiehlt.",
      runtime: null,
      release_date: null,
      vote_average: 8.4,
      movie_genres: [],
    });

    const LOADED = {
      isLoading: false,
      data: {
        details: {
          id: 27205,
          title: "Inception",
          overview: "Ein Dieb der Traeume stiehlt.",
          posterPath: "/p.jpg",
          releaseDate: "2010-07-15",
          runtime: 148,
          genres: ["Action"],
          belongs_to_collection: null,
          vote_average: 8.4,
        },
        trailer: null,
        credits: { director: { id: 1, name: "Nolan", job: "Director" }, cast: [{ id: 5, name: "DiCaprio", character: "Cobb", profile_path: null }] },
        germanReleaseDate: null,
        providers: { flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: null }], rent: [], buy: [] },
      },
    };

    it("shows exactly one spinner for the content area while loading; title and description are visible at once", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson });
      mockUseMovieDetail.mockReturnValue({ data: undefined, isLoading: true });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId, getAllByLabelText } = await render(<MovieDetailScreen />);

      expect(getByTestId("movie-detail-content-loading")).toBeTruthy();
      expect(getAllByLabelText("Lädt")).toHaveLength(1);
      expect(getByTestId("movie-detail-title")).toBeTruthy();
      expect(getByTestId("movie-detail-description-text")).toBeTruthy();
      for (const id of ["meta-row", "genre-tags", "director-row", "cast-frame", "providers"]) {
        expect(queryByTestId(`movie-detail-${id}`)).toBeNull();
      }
      expect(queryByTestId("movie-detail-content")).toBeNull();
      expect(queryByTestId("movie-detail-poster-spinner")).toBeNull();
    });

    it("shows meta, genres, credits and providers together without any spinner once loaded", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson });
      mockUseMovieDetail.mockReturnValue(LOADED);

      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId, queryAllByLabelText } = await render(<MovieDetailScreen />);

      expect(queryByTestId("movie-detail-content-loading")).toBeNull();
      expect(queryAllByLabelText("Lädt")).toHaveLength(0);
      expect(getByTestId("movie-detail-content")).toBeTruthy();
      for (const id of ["meta-row", "genre-tags", "director-row", "cast-frame", "providers"]) {
        expect(getByTestId(`movie-detail-${id}`)).toBeTruthy();
      }
    });

    it("providers have no spinner of their own when the query is done but no providers exist", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson });
      mockUseMovieDetail.mockReturnValue({ ...LOADED, data: { ...LOADED.data, providers: null } });

      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryByTestId } = await render(<MovieDetailScreen />);

      expect(queryByTestId("movie-detail-providers")).toBeNull();
      expect(queryByTestId("movie-detail-providers-loading")).toBeNull();
    });
  });

  describe("unified left aligned sections", () => {
    const movieJson = JSON.stringify({
      id: "m1",
      tmdb_id: 27205,
      name: "Inception",
      poster: "/p.jpg",
      overview: "Ein Dieb.",
      runtime: 148,
      release_date: "2010-07-15",
      vote_average: 8.4,
      movie_genres: [],
    });
    const FULL = {
      isLoading: false,
      data: {
        details: { id: 27205, title: "Inception", overview: "Ein Dieb.", posterPath: "/p.jpg", releaseDate: "2010-07-15", runtime: 148, genres: ["Action"], belongs_to_collection: null, vote_average: 8.4 },
        trailer: null,
        credits: { director: { id: 1, name: "Nolan", job: "Director" }, cast: [{ id: 5, name: "DiCaprio", character: "Cobb", profile_path: null }] },
        germanReleaseDate: null,
        providers: { flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: null }], rent: [], buy: [] },
      },
    };

    function entryWithRating(rating: number | null, liked = false) {
      return {
        data: {
          entries: [
            {
              id: "entry-1", group_id: "group-1", movie_id: "m1", added_at: "2026-01-01T00:00:00Z", added_by: "user-1",
              paid_by_member_id: null, paid_at: null, release_date_override: null,
              movie: { id: "m1", tmdb_id: 27205, name: "Inception", release_date: "2010-07-15", poster: null, overview: "Ein Dieb.", runtime: 148, director: null, director_id: null, vote_average: 8.4 },
              ratings: rating == null ? [] : [{ member_id: "user-1", rating, liked, seen_at: null, rated_at: null }],
            },
          ],
          streamingAvailability: new Map(),
        },
      };
    }

    it("orders sections info, rating, details, director, cast, streaming (diary context)", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", groupId: "group-1", source: "diary", watchlistEntryId: "entry-1" });
      mockUseGroupWatchlist.mockReturnValue(entryWithRating(4, true));
      mockUseGroupMembers.mockReturnValue({ data: [{ user_id: "user-1", profiles: { display_name: "A" } }, { user_id: "user-2", profiles: { display_name: "B" } }] });
      mockUseMovieDetail.mockReturnValue(FULL);
      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryAllByTestId, getByTestId } = await render(<MovieDetailScreen />);
      const names = queryAllByTestId(/^movie-detail-section-[a-z]+$/).map((n) => n.props.testID.replace("movie-detail-section-", ""));
      expect(names).toEqual(["info", "rating", "details", "director", "cast", "streaming"]);
      expect(getByTestId("movie-detail-rated-count").props.children).toBe("1/2 bewertet");
      expect(getByTestId("movie-detail-like-heart")).toBeTruthy();
      expect(getByTestId("movie-detail-ratings-section")).toBeTruthy();
    });

    it("group list shows only other members (not me), rated first; counter counts all members incl. me", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", groupId: "group-1", source: "diary", watchlistEntryId: "entry-1" });
      const entry = entryWithRating(4);
      entry.data.entries[0].ratings.push({ member_id: "user-3", rating: 2, liked: false, seen_at: null, rated_at: null });
      mockUseGroupWatchlist.mockReturnValue(entry);
      mockUseGroupMembers.mockReturnValue({ data: [
        { user_id: "user-1", profiles: { display_name: "Robin" } },
        { user_id: "user-2", profiles: { display_name: "Ben" } },
        { user_id: "user-3", profiles: { display_name: "Cara" } },
      ] });
      mockUseMovieDetail.mockReturnValue(FULL);
      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, getAllByTestId, queryByText } = await render(<MovieDetailScreen />);
      expect(getByTestId("movie-detail-rated-count").props.children).toBe("2/3 bewertet");
      await fireEvent.press(getByTestId("movie-detail-ratings-toggle"));
      expect(queryByText("Robin")).toBeNull();
      expect(getAllByTestId("member-rating-name").map((n) => n.props.children)).toEqual(["Cara", "Ben"]);
      expect(getAllByTestId("member-rating-unrated")).toHaveLength(1);
    });

    it("draws dividers only on sections after the first, never on info", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", groupId: "group-1", source: "diary", watchlistEntryId: "entry-1" });
      mockUseGroupWatchlist.mockReturnValue(entryWithRating(4));
      mockUseMovieDetail.mockReturnValue(FULL);
      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryAllByTestId } = await render(<MovieDetailScreen />);
      expect(getByTestId("movie-detail-section-info").props.className).not.toContain("border-t");
      const rest = queryAllByTestId(/^movie-detail-section-[a-z]+$/).slice(1);
      for (const node of rest) {
        expect(node.props.className).toContain("border-t");
      }
    });

    it("omits the rating section for a search result without own rating", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson });
      mockUseMovieDetail.mockReturnValue(FULL);
      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryByTestId, queryAllByTestId } = await render(<MovieDetailScreen />);
      expect(queryByTestId("movie-detail-section-rating")).toBeNull();
      expect(queryAllByTestId(/^movie-detail-section-[a-z]+$/).length).toBe(5);
    });

    it("shows the rating section in watchlist context once the user has an own rating, without the group list", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", groupId: "group-1", source: "watchlist", watchlistEntryId: "entry-1" });
      mockUseGroupWatchlist.mockReturnValue(entryWithRating(3.5));
      mockUseMovieDetail.mockReturnValue(FULL);
      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryByTestId } = await render(<MovieDetailScreen />);
      expect(getByTestId("movie-detail-section-rating")).toBeTruthy();
      expect(getByTestId("movie-detail-own-stars")).toBeTruthy();
      expect(queryByTestId("movie-detail-ratings-section")).toBeNull();
    });

    it("hides sections with empty content (no director, cast, providers) and their lines", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson });
      mockUseMovieDetail.mockReturnValue({
        ...FULL,
        data: { ...FULL.data, credits: { director: null, cast: [] }, providers: { flatrate: [], rent: [], buy: [] } },
      });
      const MovieDetailScreen = loadMovieDetailScreen();
      const { queryAllByTestId } = await render(<MovieDetailScreen />);
      const names = queryAllByTestId(/^movie-detail-section-[a-z]+$/).map((n) => n.props.testID.replace("movie-detail-section-", ""));
      expect(names).toEqual(["info", "details"]);
    });

    it("keeps info visible and shows the loader instead of later sections while pending", async () => {
      mockUseLocalSearchParams.mockReturnValue({ tmdbId: "27205", movieJson: JSON.stringify({ id: "m1", tmdb_id: 27205, name: "Inception", poster: null, overview: "x", runtime: null, release_date: null, vote_average: null, movie_genres: [] }) });
      mockUseMovieDetail.mockReturnValue({ data: undefined, isLoading: true });
      const MovieDetailScreen = loadMovieDetailScreen();
      const { getByTestId, queryAllByTestId } = await render(<MovieDetailScreen />);
      expect(getByTestId("movie-detail-content-loading")).toBeTruthy();
      expect(queryAllByTestId(/^movie-detail-section-[a-z]+$/).length).toBe(1);
    });
  });
});
