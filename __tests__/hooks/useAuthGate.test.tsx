import { queryKeys } from "@/lib/queryKeys";
import { IsRestoringProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

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

const mockReadStoredSession = jest.fn();
jest.mock("@/lib/storedSession", () => ({
  readStoredSession: mockReadStoredSession,
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
// __tests__/lib/auth.test.ts / __tests__/lib/supabase.test.ts — a static top-level
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
    mockReadStoredSession.mockResolvedValue(null);
    require("@/lib/queryClient").queryClient.clear();
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

  it("falls back to 'onboarding' when the group-membership query errors, rather than getting stuck loading -- but logs the error instead of failing silently", async () => {
    const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const groupsError = { message: "network error" };
    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    mockGetUserGroups.mockResolvedValue({ data: null, error: groupsError });
    const useAuthGate = loadUseAuthGate();

    const { result } = await renderHook(() => useAuthGate());

    await waitFor(() => expect(result.current).toBe("onboarding"));
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("useAuthGate"), groupsError);

    consoleWarnSpy.mockRestore();
  });

  it("keeps the later-started evaluate() call's result when an earlier-started call's request resolves after it (stale-response race)", async () => {
    // Reproduces the real cold-launch bug: `supabase.auth.getSession().then(evaluate)`
    // and the `onAuthStateChange` subscription (which auth-js also fires for the
    // resolved initial session) both trigger `evaluate()` independently. Here the
    // FIRST-started call's `getUserGroups()` resolves LAST, with a stale
    // empty-groups result -- it must not clobber the correct 'app' state that the
    // SECOND-started (and faster-resolving) call already produced.
    let resolveFirstGetUserGroups!: (value: { data: unknown[] | null; error: unknown }) => void;
    const firstCallPromise = new Promise<{ data: unknown[] | null; error: unknown }>((resolve) => {
      resolveFirstGetUserGroups = resolve;
    });

    mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
    mockGetUserGroups
      .mockImplementationOnce(() => firstCallPromise)
      .mockImplementationOnce(() => Promise.resolve({ data: [{ group_id: "g1" }], error: null }));

    const useAuthGate = loadUseAuthGate();
    const { result } = await renderHook(() => useAuthGate());

    // Wait until the first (getSession-triggered) evaluate() call has actually
    // reached its getUserGroups() call before firing the second one, so call
    // order is deterministic.
    await waitFor(() => expect(mockGetUserGroups).toHaveBeenCalledTimes(1));

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    const authStateChangeCallback = mockOnAuthStateChange.mock.calls[0][0];
    await authStateChangeCallback("SIGNED_IN", fakeSession("u1"));

    // The later-started call already resolved (immediately) and should have set
    // the correct 'app' state.
    await waitFor(() => expect(result.current).toBe("app"));

    // Now let the earlier-started call's stale, empty-groups response resolve.
    // It must be discarded, not overwrite the already-correct 'app' state.
    await act(async () => {
      resolveFirstGetUserGroups({ data: [], error: null });
      await firstCallPromise;
    });

    expect(result.current).toBe("app");
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

  describe("offline cold start (persisted query cache)", () => {
    const networkError = { message: "Network request failed" };
    function seedCachedGroups(groups: unknown[]) {
      require("@/lib/queryClient").queryClient.setQueryData(queryKeys.userGroups.byUser("u1"), groups);
    }

    it("resolves 'app' from the cached userGroups when getUserGroups fails with a network error", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      seedCachedGroups([{ group_id: "g1" }]);
      mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
      mockGetUserGroups.mockResolvedValue({ data: null, error: networkError });
      const useAuthGate = loadUseAuthGate();

      const { result } = await renderHook(() => useAuthGate());

      await waitFor(() => expect(result.current).toBe("app"));
    });

    it("still falls back to 'onboarding' on error when nothing is cached", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
      mockGetUserGroups.mockResolvedValue({ data: null, error: networkError });
      const useAuthGate = loadUseAuthGate();

      const { result } = await renderHook(() => useAuthGate());

      await waitFor(() => expect(result.current).toBe("onboarding"));
    });

    it("falls back to 'onboarding' when the cached groups are empty", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      seedCachedGroups([]);
      mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
      mockGetUserGroups.mockResolvedValue({ data: null, error: networkError });
      const useAuthGate = loadUseAuthGate();

      const { result } = await renderHook(() => useAuthGate());

      await waitFor(() => expect(result.current).toBe("onboarding"));
    });

    it("waits for the persisted cache restoration before evaluating (stays 'loading')", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      seedCachedGroups([{ group_id: "g1" }]);
      mockGetSession.mockResolvedValue({ data: { session: fakeSession("u1") } });
      mockGetUserGroups.mockResolvedValue({ data: null, error: networkError });
      const useAuthGate = loadUseAuthGate();
      let restoring = true;
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IsRestoringProvider value={restoring}>{children}</IsRestoringProvider>
      );

      const { result, rerender } = await renderHook(() => useAuthGate(), { wrapper });
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current).toBe("loading");
      expect(mockGetUserGroups).not.toHaveBeenCalled();

      restoring = false;
      await rerender({});
      await waitFor(() => expect(result.current).toBe("app"));
    });

    it("uses the stored session when auth-js returns null because the offline token refresh failed", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      seedCachedGroups([{ group_id: "g1" }]);
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { name: "AuthRetryableFetchError", status: 0 },
      });
      mockReadStoredSession.mockResolvedValue(fakeSession("u1"));
      mockGetUserGroups.mockResolvedValue({ data: null, error: networkError });
      const useAuthGate = loadUseAuthGate();

      const { result } = await renderHook(() => useAuthGate());
      // auth-js also emits INITIAL_SESSION(null) in that situation.
      await waitFor(() => expect(mockOnAuthStateChange).toHaveBeenCalled());
      await mockOnAuthStateChange.mock.calls[0][0]("INITIAL_SESSION", null);

      await waitFor(() => expect(result.current).toBe("app"));
    });

    it("does not resurrect a stored session on SIGNED_OUT", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null } });
      const useAuthGate = loadUseAuthGate();
      const { result } = await renderHook(() => useAuthGate());
      await waitFor(() => expect(result.current).toBe("auth"));
      expect(mockReadStoredSession).toHaveBeenCalledTimes(1);
      mockReadStoredSession.mockResolvedValue(fakeSession("u1"));
      await mockOnAuthStateChange.mock.calls[0][0]("SIGNED_OUT", null);
      await waitFor(() => expect(result.current).toBe("auth"));
      expect(mockReadStoredSession).toHaveBeenCalledTimes(1);
    });
  });
});
