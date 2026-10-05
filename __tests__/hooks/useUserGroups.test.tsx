import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetUserGroups = jest.fn();

jest.mock("@/lib/groups", () => ({
  getUserGroups: mockGetUserGroups,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the `mockGetUserGroups`/`jest.mock` assignments above, matching
// the convention in __tests__/useAuthGate.test.tsx.
function loadUseUserGroups() {
  return require("@/hooks/useUserGroups").useUserGroups;
}

// Fresh QueryClient per test (never the app singleton) with retries disabled
// so failing-query tests resolve to `isError` immediately instead of hanging
// on retry/backoff, and gcTime disabled so no pending garbage-collection
// setTimeout is left behind after the test ends (a real, non-unref'd timer
// that would otherwise keep the Jest process alive for up to the app
// singleton's 10-minute gcTime).
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUserGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getUserGroups with the given userId", async () => {
    mockGetUserGroups.mockResolvedValue({ data: [{ group_id: "g1" }], error: null });
    const useUserGroups = loadUseUserGroups();

    await renderHook(() => useUserGroups("u1"), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetUserGroups).toHaveBeenCalledWith("u1"));
  });

  it("starts loading, then resolves data from the successful query", async () => {
    mockGetUserGroups.mockResolvedValue({
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      error: null,
    });
    const useUserGroups = loadUseUserGroups();

    const { result } = await renderHook(() => useUserGroups("u1"), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" },
      ])
    );
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetUserGroups.mockResolvedValue({ data: null, error: fakeError });
    const useUserGroups = loadUseUserGroups();

    const { result } = await renderHook(() => useUserGroups("u1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not call getUserGroups when userId is undefined (query disabled)", async () => {
    const useUserGroups = loadUseUserGroups();

    await renderHook(() => useUserGroups(undefined), { wrapper: createWrapper() });

    expect(mockGetUserGroups).not.toHaveBeenCalled();
  });
});
