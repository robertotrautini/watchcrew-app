// Regression: 2026-10-01 00:10 CEST -> dialogs defaulted to 30.09.2026 (UTC date).
process.env.TZ = "Europe/Berlin";

import { Alert } from "react-native";
import { render, within } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => {
  const { View } = require("react-native");
  return { Ionicons: (props: Record<string, unknown>) => <View {...props} /> };
});
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = require("react-native");
  return { __esModule: true, default: (props: Record<string, unknown>) => <View {...props} /> };
});
jest.mock("@/hooks/useSaveRating", () => ({
  useSaveRating: () => ({ mutate: jest.fn(), isPending: false }),
  useResetRating: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/hooks/useTrackerPayments", () => ({
  useSetPayment: () => ({ mutate: jest.fn(), isPending: false }),
}));

import { PaymentModal } from "@/components/movie/PaymentModal";
import { RatingDialog } from "@/components/movie/RatingDialog";

// 2026-09-30T22:10:00Z == 2026-10-01 00:10 in Europe/Berlin (CEST).
const JUST_AFTER_LOCAL_MIDNIGHT = new Date("2026-09-30T22:10:00.000Z");

describe("default 'today' uses the local date", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(JUST_AFTER_LOCAL_MIDNIGHT);
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("RatingDialog 'Gesehen am' defaults to 01.10.2026", async () => {
    const { getByTestId } = await render(
      <RatingDialog
        visible
        onClose={jest.fn()}
        mode="watchlist"
        groupId="g"
        currentUserId="u1"
        movieTitle="X"
        movieReleaseDate={null}
        watchlistEntryId="we"
        paidByMemberId={null}
        paidAt={null}
        ratings={[]}
        groupMembers={[]}
        displayNameById={new Map()}
        starColor="#FFD700"
      />,
    );
    expect(within(getByTestId("rating-dialog-seen-at-input")).getByText("01.10.2026")).toBeTruthy();
  });

  it("PaymentModal date defaults to 2026-10-01", async () => {
    const { getByTestId } = await render(
      <PaymentModal
        visible
        onClose={jest.fn()}
        groupId="g"
        entries={[]}
        groupMembers={[]}
        displayNameById={new Map()}
        memberColors={new Map()}
        now={JUST_AFTER_LOCAL_MIDNIGHT}
      />,
    );
    expect(within(getByTestId("payment-modal-date-field")).getByText("2026-10-01")).toBeTruthy();
  });
});
