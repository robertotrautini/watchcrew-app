import { Alert } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockDeleteMutate = jest.fn();
const mockAddMutate = jest.fn();
const mockImpactAsync = jest.fn();

jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useDeleteWatchlistEntry: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useAddToWatchlist: () => ({ mutate: mockAddMutate, isPending: false }),
}));

// M11 (haptic polish): see the identical mock in __tests__/components/ui/StarRating.test.tsx.
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

const mockShowToast = jest.fn();
jest.mock("@/lib/toast", () => ({ showToast: (...args: unknown[]) => mockShowToast(...args) }));

jest.mock("@/lib/movieDetailNavigation", () => ({
  navigateToDirectorFilmography: jest.fn(),
  navigateToActorFilmography: jest.fn(),
  navigateToCollection: jest.fn(),
  navigateToSimilarMovies: jest.fn(),
}));

import { MovieDetailActionsBar } from "@/components/movie/MovieDetailActionsBar";
import { navigateToCollection, navigateToSimilarMovies } from "@/lib/movieDetailNavigation";

function createMockRouter() {
  return {
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  } as unknown as Parameters<typeof MovieDetailActionsBar>[0]["router"];
}

describe("MovieDetailActionsBar layout", () => {
  const FIVE = ["bewerten", "bearbeiten", "aehnliche", "filmreihe", "loeschen"] as const;

  it("renders 5 actions as a non-wrapping 3+2 grid", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailActionsBar actions={[...FIVE]} router={createMockRouter()} tmdbId={1} />,
    );

    expect(getByTestId("movie-detail-actions-row").props.className).not.toContain("flex-wrap");
    const first = getByTestId("movie-detail-actions-row-1");
    const second = getByTestId("movie-detail-actions-row-2");
    expect(first.children).toHaveLength(3);
    expect(second.children).toHaveLength(2);
    expect(second.props.className).toContain("justify-center");
    expect(queryByTestId("movie-detail-actions-row-3")).toBeNull();
  });

  it("renders up to 4 actions in a single non-wrapping row", async () => {
    const { getByTestId, queryByTestId } = await render(
      <MovieDetailActionsBar actions={["bewerten", "aehnliche", "loeschen"]} router={createMockRouter()} tmdbId={1} />,
    );

    expect(getByTestId("movie-detail-actions-row").props.className).not.toContain("flex-wrap");
    expect(queryByTestId("movie-detail-actions-row-2")).toBeNull();
  });
});

describe("MovieDetailActionsBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("delete tile uses the shared danger look, other tiles stay neutral", async () => {
    const { getByTestId } = await render(
      <MovieDetailActionsBar actions={["aehnliche", "loeschen"]} router={createMockRouter()} tmdbId={42} />,
    );
    expect(getByTestId("movie-detail-action-loeschen-tint").props.className).toContain("bg-danger/15");
    expect(getByTestId("movie-detail-action-loeschen-tint").props.className).toContain("border-danger/30");
    expect(getByTestId("movie-detail-action-aehnliche").props.className).not.toContain("danger");
  });

  it("all tiles sit on the opaque black, delete is tinted on top of it", async () => {
    const { getByTestId } = await render(
      <MovieDetailActionsBar actions={["aehnliche", "loeschen"]} router={createMockRouter()} tmdbId={42} />,
    );
    expect(getByTestId("movie-detail-action-aehnliche").props.className).toContain("bg-black");
    expect(getByTestId("movie-detail-action-loeschen").props.className).toContain("bg-black");
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

    expect(mockImpactAsync).toHaveBeenCalledWith("medium");
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

  it("'zur_watchlist' calls addToWatchlist mutate with correct args and shows a red error toast on error", async () => {
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

    onError(new Error("boom"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.",
      { variant: "error" },
    );
  });

  it("'direkt_bewerten' calls addToWatchlist mutate and reports the newly-created entry via onDirectRateEntryCreated on success", async () => {
    const router = createMockRouter();
    const onDirectRateEntryCreated = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["direkt_bewerten"]}
        router={router}
        tmdbId={42}
        activeGroupId="active-group-1"
        currentUserId="user-1"
        onDirectRateEntryCreated={onDirectRateEntryCreated}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-direkt_bewerten"));

    expect(mockAddMutate).toHaveBeenCalledWith(
      { tmdbId: 42, groupId: "active-group-1", addedBy: "user-1" },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );

    const onSuccess = mockAddMutate.mock.calls[0][1].onSuccess;
    onSuccess({ id: "new-entry-id", movie_id: "movie-9" });

    expect(onDirectRateEntryCreated).toHaveBeenCalledWith("new-entry-id", "movie-9");
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

    expect(navigateToCollection).toHaveBeenCalledWith(router, 99, 42);
  });

  it("'bewerten' and 'bearbeiten' call onOpenRatingDialog with watchlistEntryId and the matching mode", async () => {
    const router = createMockRouter();
    const onOpenRatingDialog = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["bewerten", "bearbeiten"]}
        router={router}
        tmdbId={42}
        watchlistEntryId="entry-1"
        onOpenRatingDialog={onOpenRatingDialog}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-bewerten"));
    expect(onOpenRatingDialog).toHaveBeenCalledWith("entry-1", "watchlist");

    await fireEvent.press(getByTestId("movie-detail-action-bearbeiten"));
    expect(onOpenRatingDialog).toHaveBeenCalledWith("entry-1", "diary");
  });

  it("'bewerten'/'bearbeiten' do nothing when watchlistEntryId is missing (defensive no-op)", async () => {
    const router = createMockRouter();
    const onOpenRatingDialog = jest.fn();
    const { getByTestId } = await render(
      <MovieDetailActionsBar
        actions={["bewerten", "bearbeiten"]}
        router={router}
        tmdbId={42}
        onOpenRatingDialog={onOpenRatingDialog}
      />,
    );

    await fireEvent.press(getByTestId("movie-detail-action-bewerten"));
    await fireEvent.press(getByTestId("movie-detail-action-bearbeiten"));

    expect(onOpenRatingDialog).not.toHaveBeenCalled();
  });
});

describe("MovieDetailActionsBar inside a SheetHost (as in the movie screen)", () => {
  it("'loeschen' opens the ConfirmDialog, confirm mutates exactly once", async () => {
    mockDeleteMutate.mockClear();
    const { SheetHost } = require("@/components/ui/Sheet");
    const router = createMockRouter();
    const { getByTestId, queryByTestId } = await render(
      <SheetHost>
        <MovieDetailActionsBar
          actions={["loeschen"]}
          router={router}
          tmdbId={42}
          groupId="group-1"
          watchlistEntryId="entry-1"
        />
      </SheetHost>,
    );
    expect(queryByTestId("movie-detail-delete-dialog")).toBeNull();
    await fireEvent.press(getByTestId("movie-detail-action-loeschen"));
    expect(getByTestId("movie-detail-delete-dialog")).toBeTruthy();
    await fireEvent.press(getByTestId("movie-detail-delete-confirm-button"));
    expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
  });
});

describe("MovieDetailActionsBar delete tile touch handling", () => {
  it("inner tint view never takes touches and carries no active: variant (outer Pressable owns the press)", async () => {
    const { getByTestId } = await render(
      <MovieDetailActionsBar actions={["aehnliche", "loeschen"]} router={createMockRouter()} tmdbId={42} />,
    );
    const tint = getByTestId("movie-detail-action-loeschen-tint");
    expect(tint.props.pointerEvents).toBe("none");
    expect(tint.props.className).not.toContain("active:");
    expect(getByTestId("movie-detail-action-loeschen").props.className).toContain("active:bg-danger/25");
  });
});
