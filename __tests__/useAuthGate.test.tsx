import { renderHook, waitFor } from "@testing-library/react-native";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

const mockGetUserGroups = jest.fn();
jest.mock("@/lib/groups", () => ({
  getUserGroups: mockGetUserGroups,
}));

// The root navigation shell (src/app/_layout.tsx + src/app/index.tsx) drives
// its redirect purely off this hook's return value:
//   'loading'    -> nothing shown yet (session/group lookup in flight)
//   'auth'       -> (auth) group (login/register)
//   'onboarding' -> (onboarding) group ("create or join a group")
//   'app'        -> (app)/(tabs) group
//
// The hook is required lazily inside each test (rather than statically
// imported at the top), matching the convention already used in
// __tests__/auth.test.ts / __tests__/supabase.test.ts — a static top-level
// `import` gets hoisted above the `const mockGetSession = jest.fn()`
// assignments by Babel's CommonJS interop, so the mock factories above would
// run against not-yet-initialized mock functions.

function fakeSession(userId: string) {
  return { user: { id: userId } };
}

function loadUseAuthGate() {
  return require("@/hooks/useAuthGate").useAuthGate;
}

describe("useAuthGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("starts in the 'loading' state before the initial session lookup resolves", async () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    const useAuthGate = loadUseAuthGate();
    const { result } = await renderHook(() => useAuthGate());

    expect(result.current).toBe("loading");
  });

  it("resolves to 'auth' when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useAuthGate = loadUseAuthGate();
    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("auth"));
    expect(mockGetUserGroups).not.toHaveBeenCalled();
  });

  it("resolves to 'onboarding' when there is a session but no group memberships", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    mockGetUserGroups.mockResolvedValue({ data: [], error: null });
    const useAuthGate = loadUseAuthGate();

    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("onboarding"));
    expect(mockGetUserGroups).toHaveBeenCalledWith("u1");
  });

  it("resolves to 'app' when there is a session and at least one group membership", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    mockGetUserGroups.mockResolvedValue({ data: [{ group_id: "g1" }], error: null });
    const useAuthGate = loadUseAuthGate();

    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("app"));
  });

  it("falls back to 'onboarding' when the group-membership query errors, rather than getting stuck loading", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    mockGetUserGroups.mockResolvedValue({ data: null, error: { message: "network error" } });
    const useAuthGate = loadUseAuthGate();

    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("onboarding"));
  });

  it("re-evaluates when the Supabase auth state changes (e.g. sign-in after starting signed out)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useAuthGate = loadUseAuthGate();
    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("auth"));

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];

    mockGetUserGroups.mockResolvedValue({ data: [{ group_id: "g1" }], error: null });
    await authStateChangeCallback("SIGNED_IN", fakeSession("u1"));

    await waitFor(() => expect(result.current).toBe("app"));
  });

  it("unsubscribes from the auth-state listener on unmount", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useAuthGate = loadUseAuthGate();
    const { unmount } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1));

    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
