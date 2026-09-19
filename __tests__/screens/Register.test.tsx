import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

// Mocked per the established lazy-require convention (see
// __tests__/routeIndex.test.tsx / __tests__/useAuthGate.test.tsx): jest.mock
// factories run at require-time of the mocked module, not at file-eval time,
// so referencing these consts from inside the factory is safe even though
// jest hoists the jest.mock() calls above these declarations.
const mockSignUpWithEmail = jest.fn();
jest.mock("@/lib/auth", () => ({
  signUpWithEmail: mockSignUpWithEmail,
}));

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function loadRegisterScreen() {
  return require("@/app/(auth)/register").default;
}

// react-native@0.86 + @testing-library/react-native@14 + React 19: a plain
// `fireEvent.changeText`/`fireEvent.press` does not reliably flush the
// resulting `useState` update before the next assertion (unlike some older
// RNTL versions) — wrapping each interaction in `act(async () => ...)` is
// required, matching what a plain RNTL sanity spike against a bare
// controlled TextInput confirmed for this project's exact dependency
// versions.
async function changeText(element: any, value: string) {
  await act(async () => {
    fireEvent.changeText(element, value);
  });
}

async function press(element: any) {
  await act(async () => {
    fireEvent.press(element);
  });
}

async function fillValidForm(getByTestId: (testId: string) => any) {
  await changeText(getByTestId("register-email-input"), "test@example.com");
  await changeText(getByTestId("register-password-input"), "secret123");
  await changeText(getByTestId("register-confirm-password-input"), "secret123");
}

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email, password, confirm-password inputs and the submit button", async () => {
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    expect(getByTestId("register-email-input")).toBeTruthy();
    expect(getByTestId("register-password-input")).toBeTruthy();
    expect(getByTestId("register-confirm-password-input")).toBeTruthy();
    expect(getByTestId("register-submit-button")).toBeTruthy();
  });

  it("shows a validation error for an invalid email and does not call signUpWithEmail", async () => {
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await changeText(getByTestId("register-email-input"), "not-an-email");
    await changeText(getByTestId("register-password-input"), "secret123");
    await changeText(getByTestId("register-confirm-password-input"), "secret123");
    await press(getByTestId("register-submit-button"));

    expect(getByTestId("register-validation-error")).toBeTruthy();
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("shows a validation error for a too-short password and does not call signUpWithEmail", async () => {
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await changeText(getByTestId("register-email-input"), "test@example.com");
    await changeText(getByTestId("register-password-input"), "abc");
    await changeText(getByTestId("register-confirm-password-input"), "abc");
    await press(getByTestId("register-submit-button"));

    expect(getByTestId("register-validation-error")).toBeTruthy();
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("shows a validation error for mismatched passwords and does not call signUpWithEmail", async () => {
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await changeText(getByTestId("register-email-input"), "test@example.com");
    await changeText(getByTestId("register-password-input"), "secret123");
    await changeText(getByTestId("register-confirm-password-input"), "different123");
    await press(getByTestId("register-submit-button"));

    expect(getByTestId("register-validation-error")).toBeTruthy();
    expect(mockSignUpWithEmail).not.toHaveBeenCalled();
  });

  it("calls signUpWithEmail with the entered email and password on valid submit", async () => {
    mockSignUpWithEmail.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await fillValidForm(getByTestId);
    await press(getByTestId("register-submit-button"));

    await waitFor(() =>
      expect(mockSignUpWithEmail).toHaveBeenCalledWith("test@example.com", "secret123"),
    );
  });

  it("shows a loading state and disables the button while the request is pending", async () => {
    let resolveSignUp: (value: unknown) => void = () => {};
    mockSignUpWithEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await fillValidForm(getByTestId);
    await press(getByTestId("register-submit-button"));

    expect(getByTestId("register-submit-button-loading-indicator")).toBeTruthy();
    expect(getByTestId("register-submit-button").props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      resolveSignUp({ data: { user: { id: "u1" }, session: null }, error: null });
    });
  });

  it("shows the returned error message when signUpWithEmail resolves with an error", async () => {
    mockSignUpWithEmail.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId, findByText } = await render(<RegisterScreen />);

    await fillValidForm(getByTestId);
    await press(getByTestId("register-submit-button"));

    expect(await findByText("User already registered")).toBeTruthy();
  });

  it("shows the confirm-your-email state instead of the form after a successful signup", async () => {
    mockSignUpWithEmail.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId, queryByTestId } = await render(<RegisterScreen />);

    await fillValidForm(getByTestId);
    await press(getByTestId("register-submit-button"));

    await waitFor(() => expect(getByTestId("register-success-heading")).toBeTruthy());
    expect(queryByTestId("register-email-input")).toBeNull();
  });

  it("navigates to /(auth)/login when the login link is pressed", async () => {
    const RegisterScreen = loadRegisterScreen();
    const { getByTestId } = await render(<RegisterScreen />);

    await press(getByTestId("register-login-link"));

    expect(mockPush).toHaveBeenCalledWith("/(auth)/login");
  });
});
