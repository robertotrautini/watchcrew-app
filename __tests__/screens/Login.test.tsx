import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockSignInWithEmail = jest.fn();
jest.mock("@/lib/auth", () => ({
  signInWithEmail: mockSignInWithEmail,
}));

const mockLink = jest.fn((_props: { href: string; children?: unknown }) => null);
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  Link: (props: { href: string; children?: unknown }) => mockLink(props),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

// Required lazily (not statically imported) for the same reason as
// __tests__/useAuthGate.test.tsx / __tests__/routeIndex.test.tsx: a
// top-level `import` gets hoisted above the `jest.mock` factories above by
// Babel's CommonJS interop, so the mocks wouldn't be in place yet.
function loadLoginScreen() {
  return require("@/app/(auth)/login").default;
}

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders email and password inputs and a submit button", async () => {
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    expect(getByTestId("login-email-input")).toBeTruthy();
    expect(getByTestId("login-password-input")).toBeTruthy();
    expect(getByTestId("login-submit-button")).toBeTruthy();
  });

  it("shows a validation error and does not call signInWithEmail when email is empty", async () => {
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    // Multiple `fireEvent` calls in one test must each be awaited — this
    // RNTL version's `fireEvent.changeText`/`fireEvent.press` return
    // Promises, and NOT awaiting them here leaves a dangling act() scope
    // that corrupts the *next* test's `render()` (a real gotcha in this
    // project's current RN 0.86.3 + React 19.2.3 + RNTL 14.0.1 combo — no
    // existing test file had hit it before since none fired more than one
    // event per test). Flagged in the task report for anyone building
    // other multi-field-form screens/tests (e.g. Register).
    await fireEvent.changeText(getByTestId("login-password-input"), "secret123");
    await fireEvent.press(getByTestId("login-submit-button"));

    expect(getByTestId("login-validation-error")).toBeTruthy();
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not call signInWithEmail when email shape is invalid", async () => {
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "not-an-email");
    await fireEvent.changeText(getByTestId("login-password-input"), "secret123");
    await fireEvent.press(getByTestId("login-submit-button"));

    expect(getByTestId("login-validation-error")).toBeTruthy();
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it("shows a validation error and does not call signInWithEmail when password is empty", async () => {
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "a@b.com");
    await fireEvent.press(getByTestId("login-submit-button"));

    expect(getByTestId("login-validation-error")).toBeTruthy();
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it("calls signInWithEmail with the entered credentials on valid submit", async () => {
    mockSignInWithEmail.mockResolvedValue({ data: {}, error: null });
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "a@b.com");
    await fireEvent.changeText(getByTestId("login-password-input"), "secret123");
    await fireEvent.press(getByTestId("login-submit-button"));

    await waitFor(() =>
      expect(mockSignInWithEmail).toHaveBeenCalledWith("a@b.com", "secret123"),
    );
  });

  it("navigates back to \"/\" on successful sign-in so useAuthGate re-evaluates", async () => {
    // Root cause of the real "tap Anmelden, nothing happens" bug: the root
    // `useAuthGate` subscription (src/hooks/useAuthGate.ts) only lives on
    // `src/app/index.tsx`, which unmounts (and unsubscribes) the moment its
    // own `<Redirect>` sends the user to /login -- the exact same gap M9's
    // Group-Settings screen and M10's Settings sign-out handler already hit
    // and worked around with an explicit `router.replace("/")`. Login never
    // got that same fix, so a successful `signInWithPassword` fired a
    // SIGNED_IN event nobody was listening for anymore, leaving the user
    // stuck on the login screen with no error and no navigation.
    mockSignInWithEmail.mockResolvedValue({ data: {}, error: null });
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "a@b.com");
    await fireEvent.changeText(getByTestId("login-password-input"), "secret123");
    await fireEvent.press(getByTestId("login-submit-button"));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("shows a loading state and disables the submit button while sign-in is pending", async () => {
    let resolveSignIn: (value: unknown) => void = () => {};
    mockSignInWithEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "a@b.com");
    await fireEvent.changeText(getByTestId("login-password-input"), "secret123");
    await fireEvent.press(getByTestId("login-submit-button"));

    expect(getByTestId("login-submit-button-loading-indicator")).toBeTruthy();
    expect(getByTestId("login-submit-button").props.accessibilityState.disabled).toBe(true);

    resolveSignIn({ data: {}, error: null });
    await waitFor(() => expect(mockSignInWithEmail).toHaveBeenCalled());
  });

  it("shows the returned error message when sign-in fails", async () => {
    mockSignInWithEmail.mockResolvedValue({
      data: {},
      error: { message: "Invalid login credentials" },
    });
    const LoginScreen = loadLoginScreen();
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(getByTestId("login-email-input"), "a@b.com");
    await fireEvent.changeText(getByTestId("login-password-input"), "wrong");
    await fireEvent.press(getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(getByTestId("login-api-error").props.children).toContain(
        "Invalid login credentials",
      );
    });
  });

  // M11 keyboard-avoiding review: the screen now wraps its form in a
  // `KeyboardAvoidingView` (src/app/(auth)/login.tsx), whose `behavior`
  // prop is computed by `screenKeyboardAvoidingBehavior` -- that pure,
  // platform-parameterized decision is unit-tested directly in
  // __tests__/lib/platformKeyboardAvoiding.test.ts rather than here
  // (RNTL's rendered-tree API only exposes the underlying host `View`'s
  // props, which never include `behavior` itself -- it's consumed
  // internally by `KeyboardAvoidingView`, not forwarded).

  it("renders a register link pointing to /(auth)/register", async () => {
    const LoginScreen = loadLoginScreen();
    await render(<LoginScreen />);

    expect(mockLink).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(auth)/register" }),
    );
  });

  it("renders a forgot-password link pointing to /(auth)/forgot-password", async () => {
    const LoginScreen = loadLoginScreen();
    await render(<LoginScreen />);

    expect(mockLink).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(auth)/forgot-password" }),
    );
  });
});
