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

// Lazily required (not statically imported) — same Babel CJS-hoisting reason
// as __tests__/useAuthGate.test.tsx: a top-level `import` would run before
// the `jest.mock` factory above is wired up.
function loadUseCurrentUserId() {
  return require("@/hooks/useCurrentUserId").useCurrentUserId;
}

function fakeSession(userId: string) {
  return { user: { id: userId } };
}

describe("useCurrentUserId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("starts undefined before the initial session lookup resolves", async () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    const useCurrentUserId = loadUseCurrentUserId();

    const { result } = await renderHook(() => useCurrentUserId());

    expect(result.current).toBeUndefined();
  });

  it("resolves to the session's user id once the initial lookup completes", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    const useCurrentUserId = loadUseCurrentUserId();

    const { result } = await renderHook(() => useCurrentUserId());

    await waitFor(() => expect(result.current).toBe("u1"));
  });

  it("stays undefined when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useCurrentUserId = loadUseCurrentUserId();

    const { result } = await renderHook(() => useCurrentUserId());

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it("updates when the auth state changes (e.g. sign-out)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    let authStateCallback: ((event: string, session: unknown) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const useCurrentUserId = loadUseCurrentUserId();

    const { result } = await renderHook(() => useCurrentUserId());
    await waitFor(() => expect(result.current).toBe("u1"));

    authStateCallback?.("SIGNED_OUT", null);

    await waitFor(() => expect(result.current).toBeUndefined());
  });

  it("unsubscribes on unmount", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useCurrentUserId = loadUseCurrentUserId();

    const { unmount } = await renderHook(() => useCurrentUserId());
    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
