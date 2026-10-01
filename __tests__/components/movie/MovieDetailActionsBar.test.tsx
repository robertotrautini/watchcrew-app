import { Alert } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";

const mockDeleteMutate = jest.fn();
const mockAddMutate = jest.fn();
const mockImpactAsync = jest.fn();
const mockSetReleaseDateMutate = jest.fn();

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

jest.mock("@/hooks/useMovieDetailMutations", () => ({
  useDeleteWatchlistEntry: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useAddToWatchlist: () => ({ mutate: mockAddMutate, isPending: false }),
  useSetReleaseDateOverride: () => ({ mutate: mockSetReleaseDateMutate, isPending: false }),
}));

// M11 (haptic polish): see the identical mock in __tests__/StarRating.test.tsx.
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

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

    onError(new Error("boom"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Fehler",
      "Der Film konnte nicht zur Watchlist hinzugefügt werden. Bitte versuche es erneut.",
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
    onSuccess({ id: "new-entry-id" });

    expect(onDirectRateEntryCreated).toHaveBeenCalledWith("new-entry-id");
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

  describe("'erscheinungsdatum' (per-group release date edit)", () => {
    function renderBar(extra: Record<string, unknown> = {}) {
      return render(
        <MovieDetailActionsBar
          actions={["erscheinungsdatum"]}
          router={createMockRouter()}
          tmdbId={42}
          groupId="group-1"
          watchlistEntryId="entry-1"
          releaseDate="2026-12-24"
          {...extra}
        />,
      );
    }

    it("opens a sheet showing the date as DD.MM.YYYY", async () => {
      const { getByTestId, queryByTestId, getByText } = await renderBar();
      expect(queryByTestId("movie-detail-release-date-field")).toBeNull();

      await fireEvent.press(getByTestId("movie-detail-action-erscheinungsdatum"));

      expect(getByTestId("movie-detail-release-date-field")).toBeTruthy();
      expect(getByText("24.12.2026")).toBeTruthy();
    });

    it("picking a date saves it as ISO for the entry and closes the sheet", async () => {
      const { getByTestId, queryByTestId } = await renderBar();
      await fireEvent.press(getByTestId("movie-detail-action-erscheinungsdatum"));
      await fireEvent.press(getByTestId("movie-detail-release-date-field"));
      await fireEvent(
        getByTestId("movie-detail-release-date-field-picker"),
        "change",
        { type: "set" },
        new Date(2027, 2, 5),
      );

      expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
        watchlistEntryId: "entry-1",
        groupId: "group-1",
        releaseDate: "2027-03-05",
      });
      expect(queryByTestId("movie-detail-release-date-field")).toBeNull();
    });

    it("offers a reset to the TMDB date only when an override exists, saving null", async () => {
      const first = await renderBar();
      await fireEvent.press(first.getByTestId("movie-detail-action-erscheinungsdatum"));
      expect(first.queryByTestId("movie-detail-release-date-reset")).toBeNull();
      await first.unmount();

      const { getByTestId } = await renderBar({ hasReleaseDateOverride: true });
      await fireEvent.press(getByTestId("movie-detail-action-erscheinungsdatum"));
      await fireEvent.press(getByTestId("movie-detail-release-date-reset"));

      expect(mockSetReleaseDateMutate).toHaveBeenCalledWith({
        watchlistEntryId: "entry-1",
        groupId: "group-1",
        releaseDate: null,
      });
    });

    it("is a no-op without a watchlist entry/group", async () => {
      const { getByTestId, queryByTestId } = await renderBar({ watchlistEntryId: undefined });
      await fireEvent.press(getByTestId("movie-detail-action-erscheinungsdatum"));
      expect(queryByTestId("movie-detail-release-date-field")).toBeNull();
    });
  });
});
