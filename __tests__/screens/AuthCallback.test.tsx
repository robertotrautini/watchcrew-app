import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

const mockEstablishSessionFromTokens = jest.fn();
const mockExchangeAuthCode = jest.fn();
const mockUpdatePassword = jest.fn();
jest.mock("@/lib/auth", () => ({
  establishSessionFromTokens: mockEstablishSessionFromTokens,
  exchangeAuthCode: mockExchangeAuthCode,
  updatePassword: mockUpdatePassword,
}));

let mockUrl: string | null = null;
jest.mock("expo-linking", () => ({
  useLinkingURL: () => mockUrl,
}));

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

function loadScreen() {
  return require("@/app/auth/callback").default;
}

const RECOVERY = "watchcrew://auth/callback#access_token=AT&refresh_token=RT&type=recovery";

describe("AuthCallbackScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUrl = null;
    mockEstablishSessionFromTokens.mockResolvedValue({ data: { session: {} }, error: null });
    mockUpdatePassword.mockResolvedValue({ data: { user: {} }, error: null });
  });

  it("establishes a session from recovery tokens exactly once and shows the new-password form", async () => {
    mockUrl = RECOVERY;
    const Screen = loadScreen();
    const { getByTestId, rerender } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-password-input")).toBeTruthy());
    await rerender(<Screen />);
    expect(mockEstablishSessionFromTokens).toHaveBeenCalledTimes(1);
    expect(mockEstablishSessionFromTokens).toHaveBeenCalledWith("AT", "RT");
  });

  it("validates minimum length and matching passwords", async () => {
    mockUrl = RECOVERY;
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-password-input")).toBeTruthy());

    await fireEvent.changeText(getByTestId("auth-callback-password-input"), "123");
    await fireEvent.changeText(getByTestId("auth-callback-confirm-input"), "123");
    await fireEvent.press(getByTestId("auth-callback-submit-button"));
    expect(getByTestId("auth-callback-validation-error")).toBeTruthy();

    await fireEvent.changeText(getByTestId("auth-callback-password-input"), "123456");
    await fireEvent.changeText(getByTestId("auth-callback-confirm-input"), "654321");
    await fireEvent.press(getByTestId("auth-callback-submit-button"));
    expect(getByTestId("auth-callback-validation-error").props.children).toMatch(/stimmen nicht/);
    expect(mockUpdatePassword).not.toHaveBeenCalled();
  });

  it("updates the password and navigates to / on success", async () => {
    mockUrl = RECOVERY;
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-password-input")).toBeTruthy());
    await fireEvent.changeText(getByTestId("auth-callback-password-input"), "newsecret");
    await fireEvent.changeText(getByTestId("auth-callback-confirm-input"), "newsecret");
    await fireEvent.press(getByTestId("auth-callback-submit-button"));
    await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith("newsecret"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows the API error and stays on the form when updating fails", async () => {
    mockUrl = RECOVERY;
    mockUpdatePassword.mockResolvedValue({ data: null, error: { message: "Same password" } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-password-input")).toBeTruthy());
    await fireEvent.changeText(getByTestId("auth-callback-password-input"), "newsecret");
    await fireEvent.changeText(getByTestId("auth-callback-confirm-input"), "newsecret");
    await fireEvent.press(getByTestId("auth-callback-submit-button"));
    await waitFor(() => expect(getByTestId("auth-callback-api-error")).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("routes home after establishing a session from a signup confirmation link", async () => {
    mockUrl = "watchcrew://auth/callback#access_token=AT&refresh_token=RT&type=signup";
    const Screen = loadScreen();
    await render(<Screen />);
    await waitFor(() => expect(mockEstablishSessionFromTokens).toHaveBeenCalledWith("AT", "RT"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("exchanges a PKCE code and routes home", async () => {
    mockUrl = "watchcrew://auth/callback?code=abc";
    mockExchangeAuthCode.mockResolvedValue({ data: { session: {} }, error: null });
    const Screen = loadScreen();
    await render(<Screen />);
    await waitFor(() => expect(mockExchangeAuthCode).toHaveBeenCalledWith("abc"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows an expired-link message with a way back to forgot-password when the URL carries an error", async () => {
    mockUrl =
      "watchcrew://auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-error")).toBeTruthy());
    expect(mockEstablishSessionFromTokens).not.toHaveBeenCalled();
    await fireEvent.press(getByTestId("auth-callback-forgot-password-button"));
    expect(mockReplace).toHaveBeenCalledWith("/(auth)/forgot-password");
  });

  it("shows the error state when setSession fails", async () => {
    mockUrl = RECOVERY;
    mockEstablishSessionFromTokens.mockResolvedValue({ data: { session: null }, error: { message: "bad" } });
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-error")).toBeTruthy());
  });

  it("shows the error state when the URL has no usable params", async () => {
    mockUrl = "watchcrew://auth/callback";
    const Screen = loadScreen();
    const { getByTestId } = await render(<Screen />);
    await waitFor(() => expect(getByTestId("auth-callback-error")).toBeTruthy());
  });

  it("shows the error state after a timeout when no URL ever arrives", async () => {
    jest.useFakeTimers();
    try {
      const Screen = loadScreen();
      const { getByTestId, queryByTestId } = await render(<Screen />);
      expect(queryByTestId("auth-callback-error")).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(getByTestId("auth-callback-error")).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
