import { mockRouter } from "../helpers/mockRouter";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockRequestPasswordReset = jest.fn();
jest.mock("@/lib/auth", () => ({
  requestPasswordReset: mockRequestPasswordReset,
}));

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

function loadScreen() {
  return require("@/app/(auth)/forgot-password").default;
}

const NEUTRAL = "Wenn die Adresse existiert, haben wir eine E-Mail gesendet.";

describe("ForgotPasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders an email input and a submit button", async () => {
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    expect(getByTestId("forgot-password-email-input")).toBeTruthy();
    expect(getByTestId("forgot-password-submit-button")).toBeTruthy();
  });

  it("shows a validation error for an invalid email and does not call the API", async () => {
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.changeText(getByTestId("forgot-password-email-input"), "nope");
    await fireEvent.press(getByTestId("forgot-password-submit-button"));
    expect(getByTestId("forgot-password-validation-error")).toBeTruthy();
    expect(mockRequestPasswordReset).not.toHaveBeenCalled();
  });

  it("calls requestPasswordReset with the trimmed email and shows the neutral message", async () => {
    mockRequestPasswordReset.mockResolvedValue({ data: {}, error: null });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.changeText(getByTestId("forgot-password-email-input"), "  a@b.com ");
    await fireEvent.press(getByTestId("forgot-password-submit-button"));
    await waitFor(() => expect(mockRequestPasswordReset).toHaveBeenCalledWith("a@b.com"));
    await waitFor(() =>
      expect(getByTestId("forgot-password-success").props.children).toBe(NEUTRAL),
    );
  });

  it("shows the same neutral message when the API reports an error (no account enumeration)", async () => {
    mockRequestPasswordReset.mockResolvedValue({
      data: null,
      error: { message: "User not found" },
    });
    const Screen = loadScreen();
    const { getByTestId, queryByText } = await render(<Screen />);
    await fireEvent.changeText(getByTestId("forgot-password-email-input"), "a@b.com");
    await fireEvent.press(getByTestId("forgot-password-submit-button"));
    await waitFor(() =>
      expect(getByTestId("forgot-password-success").props.children).toBe(NEUTRAL),
    );
    expect(queryByText(/User not found/)).toBeNull();
  });

  it("navigates back to login from the success state", async () => {
    mockRequestPasswordReset.mockResolvedValue({ data: {}, error: null });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await fireEvent.changeText(getByTestId("forgot-password-email-input"), "a@b.com");
    await fireEvent.press(getByTestId("forgot-password-submit-button"));
    await waitFor(() => expect(getByTestId("forgot-password-back-button")).toBeTruthy());
    await fireEvent.press(getByTestId("forgot-password-back-button"));
    expect(mockRouter.replace).toHaveBeenCalledWith("/(auth)/login");
  });
});
