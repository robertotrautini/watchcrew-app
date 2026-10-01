import { fireEvent, render, within } from "@testing-library/react-native";

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => <View {...props} />,
  };
});

const mockSetPaymentMutate = jest.fn();
let mockSetPaymentIsPending = false;

jest.mock("@/hooks/useTrackerPayments", () => ({
  useSetPayment: () => ({ mutate: mockSetPaymentMutate, isPending: mockSetPaymentIsPending }),
}));

import { PaymentModal } from "@/components/movie/PaymentModal";
import type { GroupMemberRow } from "@/lib/groups";
import type { Rating, WatchlistEntry } from "@/lib/watchlistTypes";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function makeMovie(overrides: Partial<WatchlistEntry["movie"]> = {}): WatchlistEntry["movie"] {
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

function makeRating(overrides: Partial<Rating> = {}): Rating {
  return {
    id: "r1",
    watchlist_entry_id: "we-1",
    member_id: "u1",
    rating: null,
    liked: false,
    seen_at: null,
    rated_at: null,
    ...overrides,
  };
}

function makeEntry(overrides: Partial<WatchlistEntry> = {}): WatchlistEntry {
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

function makeMember(userId: string, name: string, joinedAt = "2026-01-01"): GroupMemberRow {
  return {
    group_id: "g1",
    user_id: userId,
    role: "member",
    joined_at: joinedAt,
    profiles: { display_name: name },
  };
}

const MEMBERS = [makeMember("u1", "Anna", "2026-01-01"), makeMember("u2", "Ben", "2026-01-02")];

const UNPAID_ALPHA = makeEntry({
  id: "e1",
  movie: makeMovie({ name: "Alpha Movie", tmdb_id: 1 }),
  ratings: [makeRating({ member_id: "u2", rating: 4 })],
});

const UNPAID_BETA = makeEntry({
  id: "e2",
  movie: makeMovie({ name: "Beta Movie", tmdb_id: 2 }),
  ratings: [makeRating({ member_id: "u1", rating: 3 })],
});

const ALREADY_PAID = makeEntry({
  id: "e3",
  paid_at: "2026-09-01T00:00:00.000Z",
  paid_by_member_id: "u1",
  movie: makeMovie({ name: "Gamma Movie", tmdb_id: 3 }),
  ratings: [makeRating({ member_id: "u1", rating: 5 })],
});

function baseProps(overrides: Partial<Parameters<typeof PaymentModal>[0]> = {}) {
  return {
    visible: true,
    onClose: jest.fn(),
    groupId: "g1",
    entries: [UNPAID_ALPHA, UNPAID_BETA, ALREADY_PAID],
    groupMembers: MEMBERS,
    displayNameById: new Map([
      ["u1", "Anna"],
      ["u2", "Ben"],
    ]),
    memberColors: new Map([
      ["u1", "#111111"],
      ["u2", "#222222"],
    ]),
    now: NOW,
    ...overrides,
  };
}

describe("PaymentModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetPaymentIsPending = false;
  });

  it("lists only unpaid diary movies, never an already-paid entry", async () => {
    const { getByTestId, queryByTestId } = await render(<PaymentModal {...baseProps()} />);
    expect(getByTestId("payment-modal-movie-e1")).toBeTruthy();
    expect(getByTestId("payment-modal-movie-e2")).toBeTruthy();
    expect(queryByTestId("payment-modal-movie-e3")).toBeNull();
  });

  it("filters the movie list via the search field", async () => {
    const { getByTestId, queryByTestId } = await render(<PaymentModal {...baseProps()} />);
    await fireEvent.changeText(getByTestId("payment-modal-search-input"), "Alpha");
    expect(getByTestId("payment-modal-movie-e1")).toBeTruthy();
    expect(queryByTestId("payment-modal-movie-e2")).toBeNull();
  });

  it("pre-selects the payer suggested by computeNextPayer on open", async () => {
    // Neither member has ever paid in this fixture set (ALREADY_PAID has u1
    // as payer -- so u2 has never paid and should be suggested).
    const { getByTestId } = await render(<PaymentModal {...baseProps()} />);
    expect(getByTestId("payment-modal-payer-button-u2").props.accessibilityState.selected).toBe(true);
  });

  it("defaults the date field to today", async () => {
    const { getByTestId } = await render(<PaymentModal {...baseProps()} />);
    expect(within(getByTestId("payment-modal-date-field")).getByText("20.09.2026")).toBeTruthy();
  });

  it("selecting a movie and a payer, then saving, calls the mutation with the right ids and the default date", async () => {
    const onClose = jest.fn();
    const onSaved = jest.fn();
    const { getByTestId } = await render(<PaymentModal {...baseProps({ onClose, onSaved })} />);

    await fireEvent.press(getByTestId("payment-modal-movie-e1"));
    await fireEvent.press(getByTestId("payment-modal-payer-button-u1"));
    await fireEvent.press(getByTestId("payment-modal-save-button"));

    expect(mockSetPaymentMutate).toHaveBeenCalledWith(
      {
        groupId: "g1",
        watchlistEntryId: "e1",
        paidByMemberId: "u1",
        explicitDate: "2026-09-20",
        existingPaidAt: null,
        now: NOW,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const onSuccess = mockSetPaymentMutate.mock.calls[0][1].onSuccess;
    onSuccess();
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("disables the save button until both a movie and a payer are selected", async () => {
    const { getByTestId } = await render(<PaymentModal {...baseProps()} />);
    // A payer is already pre-selected (computeNextPayer), but no movie yet.
    expect(getByTestId("payment-modal-save-button").props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(getByTestId("payment-modal-movie-e1"));
    expect(getByTestId("payment-modal-save-button").props.accessibilityState.disabled).toBe(false);
  });

  it("resets its draft (search/selection) every time it re-opens", async () => {
    const { getByTestId, rerender } = await render(<PaymentModal {...baseProps({ visible: false })} />);
    await rerender(<PaymentModal {...baseProps({ visible: true })} />);
    await fireEvent.changeText(getByTestId("payment-modal-search-input"), "Alpha");
    await fireEvent.press(getByTestId("payment-modal-movie-e1"));

    await rerender(<PaymentModal {...baseProps({ visible: false })} />);
    await rerender(<PaymentModal {...baseProps({ visible: true })} />);

    expect(getByTestId("payment-modal-search-input").props.value).toBe("");
  });
});
