import { render } from "@testing-library/react-native";

const mockUseAuthGate = jest.fn();
jest.mock("@/hooks/useAuthGate", () => ({
  useAuthGate: mockUseAuthGate,
}));

const mockRedirect = jest.fn((_props: { href: string }) => null);
jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }) => mockRedirect(props),
}));

// src/app/index.tsx is the app's initial route and owns the actual
// auth-gate -> route-group redirect decision (the core logic this M3 task
// is responsible for getting right). It's required lazily inside each test
// (see __tests__/useAuthGate.test.tsx for why: a static top-level import
// would be hoisted above these mock factories by Babel's CommonJS interop).
function loadIndexScreen() {
  return require("@/app/index").default;
}

describe("src/app/index.tsx (root redirect)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders no Redirect while the auth gate is still 'loading'", async () => {
    mockUseAuthGate.mockReturnValue("loading");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to (auth)/login when the gate is 'auth'", async () => {
    mockUseAuthGate.mockReturnValue("auth");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(auth)/login" }),
    );
  });

  it("redirects to (onboarding)/create-or-join-group when the gate is 'onboarding'", async () => {
    mockUseAuthGate.mockReturnValue("onboarding");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(onboarding)/create-or-join-group" }),
    );
  });

  it("redirects to (app)/(tabs)/tracker when the gate is 'app'", async () => {
    mockUseAuthGate.mockReturnValue("app");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(app)/(tabs)/tracker" }),
    );
  });
});
