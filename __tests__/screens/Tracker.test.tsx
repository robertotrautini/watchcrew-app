import { mockCurrentUserId } from "../helpers/mockCurrentUser";
import { mockRouter } from "../helpers/mockRouter";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

// M9 part 2: the new "⚙️" header button navigates via expo-router, same
// router mocking convention as __tests__/screens/Watchlist.test.tsx's
// "+" Add-Movie button.
// M10: also needs `useFocusEffect` now (src/hooks/useRegisterFocusedGroupScreen.ts).
const mockShowToast = jest.fn();
jest.mock("@/hooks/useGroupQuickSwitch", () => ({
  useGroupQuickSwitch: () => ({
    activeGroupName: null,
    activeGroupId: undefined,
    groupCount: 1,
    switchToNext: jest.fn(),
  }),
}));

jest.mock("@/lib/toast", () => ({ showToast: (...args: unknown[]) => mockShowToast(...args) }));
jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

// M11 (haptic polish): see the identical mock in __tests__/components/ui/StarRating.test.tsx.
const mockImpactAsync = jest.fn();
jest.mock("expo-haptics", () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
}));

const mockUseActiveGroup = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockSetPaymentMutate = jest.fn();
const mockDeletePaymentMutate = jest.fn();
let mockSetPaymentIsPending = false;
let mockDeletePaymentIsPending = false;

jest.mock("@/hooks/useCurrentUserId", () => require("../helpers/mockCurrentUser").currentUserIdModule());
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
}));
// M10 (Realtime foreground sync, ADR 0006): this screen's own realtime/focus
// wiring has its own dedicated tests -- mocked here as no-ops, see the
// identical comment in __tests__/screens/Watchlist.test.tsx.
const mockUseGroupRealtimeSync = jest.fn();
const mockUseRegisterFocusedGroupScreen = jest.fn();
jest.mock("@/hooks/useGroupRealtimeSync", () => ({
  useGroupRealtimeSync: mockUseGroupRealtimeSync,
}));
jest.mock("@/hooks/useRegisterFocusedGroupScreen", () => ({
  useRegisterFocusedGroupScreen: mockUseRegisterFocusedGroupScreen,
}));
jest.mock("@/hooks/useTrackerPayments", () => ({
  useSetPayment: () => ({ mutate: mockSetPaymentMutate, isPending: mockSetPaymentIsPending }),
  useDeletePayment: () => ({ mutate: mockDeletePaymentMutate, isPending: mockDeletePaymentIsPending }),
}));

function loadTrackerScreen() {
  return require("@/app/(app)/(tabs)/tracker").default;
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

const PAID_ALPHA = makeEntry({
  id: "e1",
  paid_at: "2026-09-01T00:00:00.000Z",
  paid_by_member_id: "u1",
  movie: makeMovie({ name: "Alpha Movie", tmdb_id: 1 }),
});

const PAID_BETA = makeEntry({
  id: "e2",
  paid_at: "2026-09-15T00:00:00.000Z",
  paid_by_member_id: "u2",
  movie: makeMovie({ name: "Beta Movie", tmdb_id: 2 }),
});

const UNPAID_GAMMA = makeEntry({
  id: "e3",
  paid_at: null,
  ratings: [{ id: "r1", watchlist_entry_id: "e3", member_id: "u1", rating: 4, liked: false, seen_at: null, rated_at: null }],
  movie: makeMovie({ name: "Gamma Movie (unbezahlt)", tmdb_id: 3 }),
});

const MEMBERS = [
  { group_id: "g1", user_id: "u1", role: "member", joined_at: "2026-01-01", profiles: { display_name: "Anna" } },
  { group_id: "g1", user_id: "u2", role: "member", joined_at: "2026-01-02", profiles: { display_name: "Ben" } },
];

function setUpHappyPath(entries = [PAID_ALPHA, PAID_BETA, UNPAID_GAMMA]) {
  mockCurrentUserId.mockReturnValue("u1");
  mockUseActiveGroup.mockReturnValue({
    activeGroupId: "g1",
    setActiveGroup: jest.fn(),
    groupsQuery: {
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      isLoading: false,
      isError: false,
      error: null,
    },
  });
  mockUseGroupMembers.mockReturnValue({ data: MEMBERS, isLoading: false, isError: false, error: null });
  mockUseGroupWatchlist.mockReturnValue({
    data: { entries, streamingAvailability: new Map() },
    isLoading: false,
    isError: false,
    error: null,
  });
}

describe("TrackerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetPaymentIsPending = false;
    mockDeletePaymentIsPending = false;
  });

  it("renders a loading state while any underlying query is loading", async () => {
    mockCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });

    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);
    expect(getByTestId("tracker-loading")).toBeTruthy();
  });

  it("renders an error state when a query fails", async () => {
    mockCurrentUserId.mockReturnValue("u1");
    mockUseActiveGroup.mockReturnValue({
      activeGroupId: "g1",
      setActiveGroup: jest.fn(),
      groupsQuery: { data: [{ group_id: "g1" }], isLoading: false, isError: false, error: null },
    });
    mockUseGroupMembers.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    mockUseGroupWatchlist.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "network error" },
    });

    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);
    expect(getByTestId("tracker-error")).toBeTruthy();
  });

  it("renders an empty state when no entries have been paid for yet", async () => {
    setUpHappyPath([UNPAID_GAMMA]);
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);
    expect(getByTestId("tracker-empty")).toBeTruthy();
  });

  it("shows only paid entries, sorted by paid_at descending, never an unpaid-only entry", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId, getAllByTestId } = await render(<TrackerScreen />);

    expect(getByTestId("tracker-row-e1")).toBeTruthy();
    expect(getByTestId("tracker-row-e2")).toBeTruthy();
    expect(queryByTestId("tracker-row-e3")).toBeNull();

    const rows = getAllByTestId(/^tracker-row-e\d$/);
    // Beta (Sep 15) is newer than Alpha (Sep 1) -> Beta first.
    expect(rows.map((r) => r.props.testID)).toEqual(["tracker-row-e2", "tracker-row-e1"]);
  });

  it("draws a separator only BETWEEN rows, none after the last row", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);

    // Order: e2 (first), e1 (last).
    expect(getByTestId("tracker-row-e2").props.className).toContain("border-b");
    expect(getByTestId("tracker-row-e1").props.className ?? "").not.toContain("border-b");
  });

  it("renders the date cell single-line with a column wide enough for DD.MM.YYYY (no '30.09.202 / 6' wrap)", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);

    const dateCell = getByTestId("tracker-row-e1-date");
    expect(dateCell.props.numberOfLines).toBe(1);
    expect(dateCell.props.className).toMatch(/\bw-28\b/);
  });

  it("filters the table via the search field", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

    await fireEvent.changeText(getByTestId("tracker-search-input"), "Alpha");

    await waitFor(() => expect(getByTestId("tracker-row-e1")).toBeTruthy());
    expect(queryByTestId("tracker-row-e2")).toBeNull();
  });

  it("opens the entry flyout on row tap and does not expand the row inline", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

    expect(queryByTestId("tracker-entry-sheet")).toBeNull();
    await fireEvent.press(getByTestId("tracker-row-e1-header"));

    expect(getByTestId("tracker-entry-sheet")).toBeTruthy();
    expect(queryByTestId("tracker-row-e1-expanded")).toBeNull();
    expect(queryByTestId("tracker-row-e1-edit-button")).toBeNull();
  });

  describe("entry flyout edit", () => {
    it("is pre-filled with the current payer and date", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));

      expect(getByTestId("tracker-entry-sheet-payer-u1").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("tracker-entry-sheet-date-field")).toBeTruthy();
    });

    it("shows no 'days since' hint on the payer chips (the entry's own date is in the date field)", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));

      expect(queryByTestId("tracker-entry-sheet-payer-hint-u1")).toBeNull();
      expect(queryByTestId("tracker-entry-sheet-payer-hint-u2")).toBeNull();
    });

    it("Speichern calls useSetPayment with the entry's existing paid_at as existingPaidAt", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-payer-u2"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-save-button"));

      expect(mockSetPaymentMutate).toHaveBeenCalledWith(
        {
          groupId: "g1",
          watchlistEntryId: "e1",
          paidByMemberId: "u2",
          explicitDate: "2026-09-01",
          existingPaidAt: "2026-09-01T00:00:00.000Z",
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("shows the toast and closes the flyout once the save succeeded", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-save-button"));
      expect(mockShowToast).not.toHaveBeenCalled();

      await act(async () => {
        mockSetPaymentMutate.mock.calls[0][1].onSuccess();
      });
      expect(mockShowToast).toHaveBeenCalledWith("Zahlung gespeichert", { variant: "success" });
      expect(queryByTestId("tracker-entry-sheet")).toBeNull();
    });

    it("shows a red error toast and keeps the flyout open when the save failed", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);
      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-save-button"));

      await act(async () => {
        mockSetPaymentMutate.mock.calls[0][1].onError(new Error("boom"));
      });
      expect(mockShowToast).toHaveBeenCalledWith("Zahlung konnte nicht gespeichert werden", { variant: "error" });
      expect(queryByTestId("tracker-entry-sheet")).toBeTruthy();
    });

    it("the sheet close button dismisses the flyout without saving", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("sheet-close-button"));

      expect(queryByTestId("tracker-entry-sheet")).toBeNull();
      expect(mockSetPaymentMutate).not.toHaveBeenCalled();
    });
  });

  describe("entry flyout delete", () => {
    it("Löschen is the rightmost button of the action row (after Speichern)", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, getAllByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      const ids = getAllByTestId(/^tracker-entry-sheet-(save|delete)-button$/).map((n) => n.props.testID);
      expect(ids).toEqual(["tracker-entry-sheet-save-button", "tracker-entry-sheet-delete-button"]);
    });

    it("Löschen shows a 'Wirklich löschen?' confirmation inside the flyout", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, getByText } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-delete-button"));

      expect(getByTestId("tracker-entry-sheet-delete-confirm")).toBeTruthy();
      expect(getByText("Wirklich löschen?")).toBeTruthy();
      expect(mockDeletePaymentMutate).not.toHaveBeenCalled();
    });

    it("confirming delete calls useDeletePayment for that entry and closes on success", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-delete-button"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-delete-confirm-button"));

      expect(mockImpactAsync).toHaveBeenCalledWith("medium");
      expect(mockDeletePaymentMutate).toHaveBeenCalledWith(
        { groupId: "g1", watchlistEntryId: "e1" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );

      await act(async () => {
        mockDeletePaymentMutate.mock.calls[0][1].onSuccess();
      });
      expect(queryByTestId("tracker-entry-sheet")).toBeNull();
    });

    it("Abbrechen on the confirmation returns to the edit form without deleting", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-delete-button"));
      await fireEvent.press(getByTestId("tracker-entry-sheet-delete-cancel-button"));

      expect(queryByTestId("tracker-entry-sheet-delete-confirm")).toBeNull();
      expect(mockDeletePaymentMutate).not.toHaveBeenCalled();
      expect(getByTestId("tracker-entry-sheet-delete-button")).toBeTruthy();
    });
  });

  it("navigates to the Settings hub when the '⚙️' button is tapped", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);

    await fireEvent.press(getByTestId("tracker-group-settings-button"));

    expect(mockRouter.push).toHaveBeenCalledWith("/settings");
  });

  it("opens the 'Zahlung erfassen' modal via the 💰 button, listing only unpaid diary movies", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

    expect(queryByTestId("payment-modal-movie-e3")).toBeNull();

    await fireEvent.press(getByTestId("tracker-log-payment-button"));

    expect(getByTestId("payment-modal-movie-e3")).toBeTruthy();
    expect(queryByTestId("payment-modal-movie-e1")).toBeNull();
  });
});
