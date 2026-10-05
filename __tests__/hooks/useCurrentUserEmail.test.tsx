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

// Lazily required — same Babel CJS-hoisting reason as
// __tests__/useCurrentUserId.test.tsx.
function loadUseCurrentUserEmail() {
  return require("@/hooks/useCurrentUserEmail").useCurrentUserEmail;
}

function fakeSession(email: string) {
  return { user: { email } };
}

describe("useCurrentUserEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("starts undefined before the initial session lookup resolves", async () => {
    mockGetSession.mockReturnValue(new Promise(() => {}));
    const useCurrentUserEmail = loadUseCurrentUserEmail();

    const { result } = await renderHook(() => useCurrentUserEmail());

    expect(result.current).toBeUndefined();
  });

  it("resolves to the session's user email once the initial lookup completes", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("robin@example.com") } });
    const useCurrentUserEmail = loadUseCurrentUserEmail();

    const { result } = await renderHook(() => useCurrentUserEmail());

    await waitFor(() => expect(result.current).toBe("robin@example.com"));
  });

  it("stays undefined when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useCurrentUserEmail = loadUseCurrentUserEmail();

    const { result } = await renderHook(() => useCurrentUserEmail());

    await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it("updates when the auth state changes (e.g. sign-out)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("robin@example.com") } });
    let authStateCallback: ((event: string, session: unknown) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authStateCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });
    const useCurrentUserEmail = loadUseCurrentUserEmail();

    const { result } = await renderHook(() => useCurrentUserEmail());
    await waitFor(() => expect(result.current).toBe("robin@example.com"));

    authStateCallback?.("SIGNED_OUT", null);

    await waitFor(() => expect(result.current).toBeUndefined());
  });

  it("unsubscribes on unmount", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const useCurrentUserEmail = loadUseCurrentUserEmail();

    const { unmount } = await renderHook(() => useCurrentUserEmail());
    await unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
