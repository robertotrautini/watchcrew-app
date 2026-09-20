import { fireEvent, render, waitFor } from "@testing-library/react-native";

// M9 part 2: the new "⚙️" header button navigates via expo-router, same
// router mocking convention as __tests__/screens/Watchlist.test.tsx's
// "+" Add-Movie button.
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockUseCurrentUserId = jest.fn();
const mockUseActiveGroup = jest.fn();
const mockUseGroupWatchlist = jest.fn();
const mockUseGroupMembers = jest.fn();
const mockSetPaymentMutate = jest.fn();
const mockDeletePaymentMutate = jest.fn();
let mockSetPaymentIsPending = false;
let mockDeletePaymentIsPending = false;

jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: mockUseCurrentUserId,
}));
jest.mock("@/hooks/useActiveGroup", () => ({
  useActiveGroup: mockUseActiveGroup,
}));
jest.mock("@/hooks/useGroupWatchlist", () => ({
  useGroupWatchlist: mockUseGroupWatchlist,
}));
jest.mock("@/hooks/useGroupMembers", () => ({
  useGroupMembers: mockUseGroupMembers,
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
  mockUseCurrentUserId.mockReturnValue("u1");
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
    mockUseCurrentUserId.mockReturnValue("u1");
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
    mockUseCurrentUserId.mockReturnValue("u1");
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

  it("filters the table via the search field", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

    await fireEvent.changeText(getByTestId("tracker-search-input"), "Alpha");

    await waitFor(() => expect(getByTestId("tracker-row-e1")).toBeTruthy());
    expect(queryByTestId("tracker-row-e2")).toBeNull();
  });

  it("expands a row on tap to show Bearbeiten/Löschen, and collapses it again on a second tap", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

    await fireEvent.press(getByTestId("tracker-row-e1-header"));
    expect(getByTestId("tracker-row-e1-edit-button")).toBeTruthy();
    expect(getByTestId("tracker-row-e1-delete-button")).toBeTruthy();

    await fireEvent.press(getByTestId("tracker-row-e1-header"));
    expect(queryByTestId("tracker-row-e1-expanded")).toBeNull();
  });

  describe("inline edit", () => {
    it("Bearbeiten swaps in an inline form pre-filled with the current payer and date", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-button"));

      expect(getByTestId("tracker-row-e1-edit-payer-u1").props.accessibilityState.selected).toBe(true);
      expect(getByTestId("tracker-row-e1-edit-date-field")).toBeTruthy();
    });

    it("Speichern calls useSetPayment with the entry's existing paid_at as existingPaidAt (never silently overwritten)", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-button"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-payer-u2"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-save-button"));

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

    it("Abbrechen discards the edit and returns to the Bearbeiten/Löschen buttons", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-button"));
      await fireEvent.press(getByTestId("tracker-row-e1-edit-cancel-button"));

      expect(queryByTestId("tracker-row-e1-edit-form")).toBeNull();
      expect(getByTestId("tracker-row-e1-edit-button")).toBeTruthy();
    });
  });

  describe("inline delete", () => {
    it("Löschen shows an inline 'Wirklich löschen?' confirmation, not a Sheet/modal", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, getByText, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-delete-button"));

      expect(getByTestId("tracker-row-e1-delete-confirm")).toBeTruthy();
      expect(getByText("Wirklich löschen?")).toBeTruthy();
      expect(queryByTestId("sheet-backdrop")).toBeNull();
    });

    it("confirming delete calls useDeletePayment for that entry", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-delete-button"));
      await fireEvent.press(getByTestId("tracker-row-e1-delete-confirm-button"));

      expect(mockDeletePaymentMutate).toHaveBeenCalledWith(
        { groupId: "g1", watchlistEntryId: "e1" },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("Abbrechen on the delete confirmation returns to the Bearbeiten/Löschen buttons without deleting", async () => {
      setUpHappyPath();
      const TrackerScreen = loadTrackerScreen();
      const { getByTestId, queryByTestId } = await render(<TrackerScreen />);

      await fireEvent.press(getByTestId("tracker-row-e1-header"));
      await fireEvent.press(getByTestId("tracker-row-e1-delete-button"));
      await fireEvent.press(getByTestId("tracker-row-e1-delete-cancel-button"));

      expect(queryByTestId("tracker-row-e1-delete-confirm")).toBeNull();
      expect(mockDeletePaymentMutate).not.toHaveBeenCalled();
      expect(getByTestId("tracker-row-e1-delete-button")).toBeTruthy();
    });
  });

  it("navigates to the Group-Settings screen when the '⚙️' button is tapped", async () => {
    setUpHappyPath();
    const TrackerScreen = loadTrackerScreen();
    const { getByTestId } = await render(<TrackerScreen />);

    await fireEvent.press(getByTestId("tracker-group-settings-button"));

    expect(mockPush).toHaveBeenCalledWith("/group-settings");
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
