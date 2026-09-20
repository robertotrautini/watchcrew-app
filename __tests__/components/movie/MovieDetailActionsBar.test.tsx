import { Alert } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockDeleteMutate = jest.fn();
const mockAddMutate = jest.fn();

jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useDeleteWatchlistEntry: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useAddToWatchlist: () => ({ mutate: mockAddMutate, isPending: false }),
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  MovieNotCatalogedError: class MovieNotCatalogedError extends Error {},
}));

jest.mock("@/lib/movieDetailNavigation", () => ({
  navigateToDirectorFilmography: jest.fn(),
  navigateToActorFilmography: jest.fn(),
  navigateToCollection: jest.fn(),
  navigateToSimilarMovies: jest.fn(),
  navigateToRatingDialog: jest.fn(),
  navigateToEditFlow: jest.fn(),
}));

import { MovieDetailActionsBar } from "@/components/movie/MovieDetailActionsBar";
import {
  navigateToCollection,
  navigateToEditFlow,
  navigateToRatingDialog,
  navigateToSimilarMovies,
} from "@/lib/movieDetailNavigation";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MovieNotCatalogedError } = require("@/hooks/useMovieDetailMutations");

function createMockRouter() {
  return {
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  } as unknown as Parameters<typeof MovieDetailActionsBar>[0]["router"];
}

describe("MovieDetailActionsBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("renders only the actions passed in the actions prop, in order", async () => {
    const router = createMockRouter();
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailActionsBar actions={["aehnliche", "loeschen"]} router={router} tmdbId={42} />,
    );

    expect(getByTestId("movie-detail-action-aehnliche")).toBeTruthy();
    expect(getByTestId("movie-detail-action-loeschen")).toBeTruthy();
    expect(queryByTestId("movie-detail-action-bewerten")).toBeNull();
    expect(queryByTestId("movie-detail-action-bearbeiten")).toBeNull();
    expect(queryByTestId("movie-detail-action-filmreihe")).toBeNull();
    expect(queryByTestId("movie-detail-action-zur_watchlist")).toBeNull();
    expect(queryByTestId("movie-detail-action-direkt_bewerten")).toBeNull();
  });

  it("tapping 'aehnliche' navigates to similar movies with router and tmdbId", async () => {
    const router = createMockRouter();
    const { getByTestId } = await render(
      <MovieDetailActionsBar actions={["aehnliche"]} router={router} tmdbId={42} />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-aehnliche"));

    expect(navigateToSimilarMovies).toHaveBeenCalledWith(router, 42);
  });

  it("'loeschen' opens a confirmation sheet; cancel closes without mutating; confirm mutates and navigates back on success", async () => {
    const router = createMockRouter();
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailActionsBar
        actions={["loeschen"]}
        router={router}
        tmdbId={42}
        groupId="group-1"
        watchlistEntryId="entry-1"
      />,
    );

    expect(queryByTestId("movie-detail-delete-confirm-button")).toBeNull();

    await fireEvent.press(getByTestId("movie-detail-action-loeschen"));

    expect(getByTestId("movie-detail-delete-confirm-button")).toBeTruthy();
    expect(getByTestId("movie-detail-delete-cancel-button")).toBeTruthy();

    await fireEvent.press(getByTestId("movie-detail-delete-cancel-button"));
    expect(queryByTestId("movie-detail-delete-confirm-button")).toBeNull();
    expect(mockDeleteMutate).not.toHaveBeenCalled();

    await fireEvent.press(getByTestId("movie-detail-action-loeschen"));
    await fireEvent.press(getByTestId("movie-detail-delete-confirm-button"));

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      { watchlistEntryId: "entry-1", groupId: "group-1" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const onSuccess = mockDeleteMutate.mock.calls[0][1].onSuccess;
    await act(async () => {
      onSuccess();
    });

    expect(router.back).toHaveBeenCalled();
  });

  it("'zur_watchlist' calls addToWatchlist mutate with correct args and shows alerts on error", async () => {
    const router = createMockRouter();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["zur_watchlist"]}
        router={router}
        tmdbId={42}
        activeGroupId="active-group-1"
        currentUserId="user-1"
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-zur_watchlist"));

    expect(mockAddMutate).toHaveBeenCalledWith(
      { tmdbId: 42, groupId: "active-group-1", addedBy: "user-1" },
      expect.objectContaining({ onError: expect.any(Function) }),
    );

    const onError = mockAddMutate.mock.calls[0][1].onError;

    onError(new MovieNotCatalogedError());
    expect(Alert.alert).toHaveBeenCalledWith(
      "Film kann nicht hinzugefügt werden",
      "Dieser Film ist noch nicht im Katalog erfasst — bitte an die Entwicklung melden.",
    );

    onError(new Error("boom"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Fehler",
      "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.",
    );
  });

  it("'direkt_bewerten' calls addToWatchlist mutate and navigates to rating dialog on success", async () => {
    const router = createMockRouter();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["direkt_bewerten"]}
        router={router}
        tmdbId={42}
        activeGroupId="active-group-1"
        currentUserId="user-1"
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-direkt_bewerten"));

    expect(mockAddMutate).toHaveBeenCalledWith(
      { tmdbId: 42, groupId: "active-group-1", addedBy: "user-1" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    const onSuccess = mockAddMutate.mock.calls[0][1].onSuccess;
    onSuccess({ id: "new-entry-id" });

    expect(navigateToRatingDialog).toHaveBeenCalledWith(router, "new-entry-id");
  });

  it("'filmreihe' navigates to the collection", async () => {
    const router = createMockRouter();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["filmreihe"]}
        router={router}
        tmdbId={42}
        collectionId={99}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-filmreihe"));

    expect(navigateToCollection).toHaveBeenCalledWith(router, 99);
  });

  it("'bewerten' and 'bearbeiten' navigate with watchlistEntryId", async () => {
    const router = createMockRouter();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["bewerten", "bearbeiten"]}
        router={router}
        tmdbId={42}
        watchlistEntryId="entry-1"
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-bewerten"));
    expect(navigateToRatingDialog).toHaveBeenCalledWith(router, "entry-1");

    await fireEvent.press(getByTestId("movie-detail-action-bearbeiten"));
    expect(navigateToEditFlow).toHaveBeenCalledWith(router, "entry-1");
  });
});
