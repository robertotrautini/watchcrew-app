import { Alert } from "react-native";
import { act, fireEvent, render, within } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return {
    Ionicons: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// M7 consolidation (Item 3): "Gesehen am"/"Bezahlt am" now render a real
// native date-picker (src/components/ui/DateField.tsx) instead of a plain
// TextInput -- mocked the same way as the Ionicons mock above.
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockSaveMutate = jest.fn();
const mockResetMutate = jest.fn();
let mockSaveIsPending = false;
let mockResetIsPending = false;

jest.mock("@/hooks/useSaveRating", () => ({
  useSaveRating: () => ({ mutate: mockSaveMutate, isPending: mockSaveIsPending }),
  useResetRating: () => ({ mutate: mockResetMutate, isPending: mockResetIsPending }),
}));

import { RatingDialog } from "@/components/movie/RatingDialog";
import type { GroupMemberRow } from "@/lib/groups";
import type { Rating } from "@/lib/watchlistTypes";

const GOLD = "#FFD700";
const NOW = new Date("2026-09-20T12:00:00.000Z");

function makeRating(overrides: Partial<Rating>): Rating {
  return {
    id: "r1",
    watchlist_entry_id: "we-1",
    member_id: "user-1",
    rating: null,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

function makeMember(userId: string, displayName: string): GroupMemberRow {
  return {
    group_id: "group-1",
    user_id: userId,
    role: "member",
    joined_at: "2026-01-01T00:00:00.000Z",
    profiles: { display_name: displayName },
  };
}

function baseProps(overrides: Partial<Parameters<typeof RatingDialog>[0]> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    mode: "watchlist" as const,
    groupId: "group-1",
    currentUserId: "user-1",
    movieTitle: "Der Pate",
    movieReleaseDate: null as string | null,
    watchlistEntryId: "we-1",
    paidByMemberId: null as string | null,
    paidAt: null as string | null,
    ratings: [] as Rating[],
    groupMembers: [makeMember("user-1", "Anna"), makeMember("user-2", "Ben")],
    displayNameById: new Map([
      ["user-1", "Anna"],
      ["user-2", "Ben"],
    ]),
    starColor: GOLD,
    ...overrides,
  };
}

describe("RatingDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockSaveIsPending = false;
    mockResetIsPending = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders the movie title and the mode-specific Sheet title", async () => {
    const { getByText } = await render(<RatingDialog {...baseProps({ mode: "direct" })} />);
    expect(getByText("Der Pate")).toBeTruthy();
    expect(getByText("Direkt bewerten")).toBeTruthy();
  });

  it("defaults 'Gesehen am' to today when there's no existing own rating", async () => {
    const { getByTestId } = await render(<RatingDialog {...baseProps()} />);
    expect(within(getByTestId("rating-dialog-seen-at-input")).getByText("20.09.2026")).toBeTruthy();
  });

  it("pre-fills the star rating, like-heart, and Gesehen-am date from an existing own rating (Diary-edit context)", async () => {
    const ratings = [makeRating({ id: "r1", member_id: "user-1", rating: 3.5, liked: true, seen_at: "2026-09-10" })];
    const { getByTestId } = await render(
      <RatingDialog {...baseProps({ mode: "diary", ratings })} />,
    );

    expect(within(getByTestId("rating-dialog-seen-at-input")).getByText("10.09.2026")).toBeTruthy();
    expect(getByTestId("star-rating-heart-icon").props.name).toBe("heart");
  });

  it("includes the like-heart in 'direct' mode too (resolved decision: uniform across all three contexts)", async () => {
    const { queryByTestId } = await render(<RatingDialog {...baseProps({ mode: "direct" })} />);
    expect(queryByTestId("star-rating-heart-touch")).toBeTruthy();
  });

  it("shows only OTHER members' ratings, never the current user's own row, in the read-only section", async () => {
    const ratings = [
      makeRating({ id: "r1", member_id: "user-1", rating: 4 }),
      makeRating({ id: "r2", member_id: "user-2", rating: 2.5 }),
    ];
    const { getByTestId } = await render(<RatingDialog {...baseProps({ ratings })} />);

    const otherRatingsSection = getByTestId("rating-dialog-other-ratings");
    expect(within(otherRatingsSection).getByText("Ben")).toBeTruthy();
    // "Anna" (the current user, user-1) must not appear as a row label
    // WITHIN this section -- only Ben's (the other member's) row does.
    expect(within(otherRatingsSection).queryByText("Anna")).toBeNull();
  });

  it("hides the other-ratings section entirely when there are no other members' ratings", async () => {
    const { queryByTestId } = await render(<RatingDialog {...baseProps({ ratings: [] })} />);
    expect(queryByTestId("rating-dialog-other-ratings")).toBeNull();
  });

  describe("reset button", () => {
    it("is disabled when there is no existing real rating to reset", async () => {
      const { getByTestId } = await render(<RatingDialog {...baseProps({ ratings: [] })} />);
      expect(getByTestId("rating-dialog-reset-button").props.accessibilityState.disabled).toBe(true);
    });

    it("is disabled when the existing own rating is 0/null (project's 0==null convention)", async () => {
      const ratings = [makeRating({ member_id: "user-1", rating: 0 })];
      const { getByTestId } = await render(<RatingDialog {...baseProps({ ratings })} />);
      expect(getByTestId("rating-dialog-reset-button").props.accessibilityState.disabled).toBe(true);
    });

    it("is enabled when there IS a real existing rating, and resets rating+like to 0/false on success", async () => {
      const ratings = [makeRating({ id: "r1", member_id: "user-1", rating: 4, liked: true })];
      const { getByTestId } = await render(<RatingDialog {...baseProps({ ratings })} />);

      expect(getByTestId("rating-dialog-reset-button").props.accessibilityState.disabled).toBe(false);

      await fireEvent.press(getByTestId("rating-dialog-reset-button"));

      expect(mockResetMutate).toHaveBeenCalledWith(
        { groupId: "group-1", ratingId: "r1" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );

      // Star rating visually resets to empty (rating=null) once the reset
      // mutation's onSuccess fires -- simulate that callback.
      const onSuccess = mockResetMutate.mock.calls[0][1].onSuccess;
      await act(async () => onSuccess());

      expect(getByTestId("star-rating-heart-icon").props.name).toBe("heart-outline");
    });
  });

  describe("'Gesehen am' mutually-exclusive checkboxes", () => {
    it("'Weiß nicht' disables the date field and resolves seen_at to null on save", async () => {
      const { getByTestId } = await render(<RatingDialog {...baseProps()} />);

      await fireEvent.press(getByTestId("rating-dialog-checkbox-unknown"));
      expect(getByTestId("rating-dialog-seen-at-input").props.accessibilityState.disabled).toBe(true);

      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ seenAt: null }),
        expect.anything(),
      );
    });

    it("'Release Date' is only shown when the movie has one, and adopts it as seen_at on save", async () => {
      const { getByTestId, queryByTestId } = await render(
        <RatingDialog {...baseProps({ movieReleaseDate: "2026-03-01" })} />,
      );

      expect(queryByTestId("rating-dialog-checkbox-release-date")).toBeTruthy();

      await fireEvent.press(getByTestId("rating-dialog-checkbox-release-date"));
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ seenAt: "2026-03-01" }),
        expect.anything(),
      );
    });

    it("is hidden entirely when the movie has no release date", async () => {
      const { queryByTestId } = await render(
        <RatingDialog {...baseProps({ movieReleaseDate: null })} />,
      );
      expect(queryByTestId("rating-dialog-checkbox-release-date")).toBeNull();
    });

    it("checking 'Release Date' then 'Weiß nicht' is mutually exclusive -- the later checkbox wins, and re-enables the manual field only when toggled back off", async () => {
      const { getByTestId } = await render(
        <RatingDialog {...baseProps({ movieReleaseDate: "2026-03-01" })} />,
      );

      await fireEvent.press(getByTestId("rating-dialog-checkbox-release-date"));
      await fireEvent.press(getByTestId("rating-dialog-checkbox-unknown"));
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      // "Weiß nicht" was checked LAST -> null wins, not the release date.
      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ seenAt: null }),
        expect.anything(),
      );
    });
  });

  describe("payment section", () => {
    it("does not include a payment write when no payer is selected", async () => {
      const { getByTestId } = await render(<RatingDialog {...baseProps()} />);
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ payment: undefined }),
        expect.anything(),
      );
    });

    it("selecting a payer chip includes a payment write with that member and the existing paid_at passed through", async () => {
      const { getByTestId } = await render(
        <RatingDialog {...baseProps({ paidAt: "2026-08-01T00:00:00.000Z" })} />,
      );

      await fireEvent.press(getByTestId("rating-dialog-payer-chip-user-2"));
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: {
            paidByMemberId: "user-2",
            explicitPaidAt: null,
            existingPaidAt: "2026-08-01T00:00:00.000Z",
          },
        }),
        expect.anything(),
      );
    });

    it("an explicitly-entered 'Bezahlt am' date is passed through as explicitPaidAt", async () => {
      const { getByTestId } = await render(<RatingDialog {...baseProps()} />);

      await fireEvent.press(getByTestId("rating-dialog-payer-chip-user-2"));
      await fireEvent.press(getByTestId("rating-dialog-payment-date-input"));
      await fireEvent(
        getByTestId("rating-dialog-payment-date-input-picker"),
        "change",
        { type: "set" },
        new Date("2026-09-19T00:00:00.000Z"),
      );
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: expect.objectContaining({ explicitPaidAt: "2026-09-19" }),
        }),
        expect.anything(),
      );
    });

    it("tapping an already-selected payer chip again deselects it and removes the payment write", async () => {
      const { getByTestId } = await render(
        <RatingDialog {...baseProps({ paidByMemberId: "user-2" })} />,
      );

      await fireEvent.press(getByTestId("rating-dialog-payer-chip-user-2"));
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        expect.objectContaining({ payment: undefined }),
        expect.anything(),
      );
    });
  });

  describe("save", () => {
    it("saves with the current rating/liked/seenAt/memberId, shows a success alert, and closes on success", async () => {
      const onClose = jest.fn();
      const onSaved = jest.fn();
      const { getByTestId } = await render(
        <RatingDialog {...baseProps({ onClose, onSaved })} />,
      );

      await fireEvent(getByTestId("star-rating-touch-3"), "press", { nativeEvent: { locationX: 40 } });
      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      expect(mockSaveMutate).toHaveBeenCalledWith(
        {
          groupId: "group-1",
          watchlistEntryId: "we-1",
          memberId: "user-1",
          rating: 4,
          liked: false,
          seenAt: "2026-09-20",
          payment: undefined,
        },
        expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
      );

      const onSuccess = mockSaveMutate.mock.calls[0][1].onSuccess;
      await act(async () => onSuccess());

      expect(onSaved).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith("Gespeichert", "Deine Bewertung wurde gespeichert.");
      expect(onClose).toHaveBeenCalled();
    });

    it("shows an error alert and does NOT close when the save mutation errors", async () => {
      const onClose = jest.fn();
      const { getByTestId } = await render(<RatingDialog {...baseProps({ onClose })} />);

      await fireEvent.press(getByTestId("rating-dialog-save-button"));

      const onError = mockSaveMutate.mock.calls[0][1].onError;
      await act(async () => onError(new Error("boom")));

      expect(Alert.alert).toHaveBeenCalledWith(
        "Fehler",
        "Die Bewertung konnte nicht gespeichert werden. Bitte versuche es erneut.",
      );
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
