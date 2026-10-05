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
// (see __tests__/hooks/useAuthGate.test.tsx for why: a static top-level import
// would be hoisted above these mock factories by Babel's CommonJS interop).
function loadIndexScreen() {
  return require("@/app/index").default;
}

describe("../../src/app/index.tsx (root redirect)", () => {
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

describe("../../src/app/index.tsx (pending invite + tracker flag)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset before any render so no mounted component observes the change.
    require("@/stores/usePendingInviteStore").usePendingInviteStore.setState({ token: null });
    require("@/stores/usePreferencesStore").usePreferencesStore.setState({ trackerEnabled: true });
  });

  const TOKEN = "11111111-1111-1111-1111-111111111111";

  it("resumes a pending invite join after login (gate 'app')", async () => {
    const { usePendingInviteStore } = require("@/stores/usePendingInviteStore");
    usePendingInviteStore.setState({ token: TOKEN });
    mockUseAuthGate.mockReturnValue("app");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: `/join/${TOKEN}` }));
  });

  it("resumes a pending invite join for a user without a group (gate 'onboarding')", async () => {
    const { usePendingInviteStore } = require("@/stores/usePendingInviteStore");
    usePendingInviteStore.setState({ token: TOKEN });
    mockUseAuthGate.mockReturnValue("onboarding");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: `/join/${TOKEN}` }));
  });

  it("keeps a pending invite while logged out (gate 'auth' -> login)", async () => {
    const { usePendingInviteStore } = require("@/stores/usePendingInviteStore");
    usePendingInviteStore.setState({ token: TOKEN });
    mockUseAuthGate.mockReturnValue("auth");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: "/(auth)/login" }));
    expect(usePendingInviteStore.getState().token).toBe(TOKEN);
  });

  it("redirects to the watchlist tab when the tracker is disabled", async () => {
    const { usePreferencesStore } = require("@/stores/usePreferencesStore");
    usePreferencesStore.setState({ trackerEnabled: false });
    mockUseAuthGate.mockReturnValue("app");
    const Index = loadIndexScreen();

    await render(<Index />);

    expect(mockRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/(app)/(tabs)/watchlist" }),
    );
  });
});
