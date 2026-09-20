import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  Stack: { Screen: () => null },
}));

const mockDeleteOwnAccount = jest.fn();
jest.mock("@/lib/deleteAccount", () => ({
  deleteOwnAccount: mockDeleteOwnAccount,
}));

const mockSignOut = jest.fn();
jest.mock("@/lib/auth", () => ({
  signOut: mockSignOut,
}));

function loadScreen() {
  return require("@/app/(app)/(modals)/settings/delete-account").default;
}

describe("SettingsDeleteAccountScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens the confirmation sheet when 'Konto löschen' is tapped", async () => {
    const Screen = loadScreen();
    const { getByTestId, queryByTestId } = await render(<Screen />);

    expect(queryByTestId("delete-account-confirm-input")).toBeNull();

    await fireEvent.press(getByTestId("delete-account-open-button"));

    expect(getByTestId("delete-account-confirm-input")).toBeTruthy();
  });

  it("keeps the confirm button disabled until the exact phrase 'LÖSCHEN' is typed", async () => {
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.press(getByTestId("delete-account-open-button"));

    expect(getByTestId("delete-account-confirm-button").props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "loeschen");
    expect(getByTestId("delete-account-confirm-button").props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");
    expect(getByTestId("delete-account-confirm-button").props.accessibilityState.disabled).toBe(
      false,
    );
  });

  it("does not call deleteOwnAccount when the confirm button is pressed while still disabled", async () => {
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.press(getByTestId("delete-account-open-button"));

    await fireEvent.press(getByTestId("delete-account-confirm-button"));

    expect(mockDeleteOwnAccount).not.toHaveBeenCalled();
  });

  it("on success: calls deleteOwnAccount, then signOut, then navigates to '/'", async () => {
    mockDeleteOwnAccount.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.press(getByTestId("delete-account-open-button"));
    await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");

    await fireEvent.press(getByTestId("delete-account-confirm-button"));

    await waitFor(() => expect(mockDeleteOwnAccount).toHaveBeenCalled());
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("on failure: shows an error message and does NOT sign out or navigate", async () => {
    mockDeleteOwnAccount.mockResolvedValue({ error: { message: "server error" } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.press(getByTestId("delete-account-open-button"));
    await fireEvent.changeText(getByTestId("delete-account-confirm-input"), "LÖSCHEN");

    await fireEvent.press(getByTestId("delete-account-confirm-button"));

    await waitFor(() => expect(getByTestId("delete-account-error")).toBeTruthy());
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
