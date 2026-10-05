import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetGroupMembers = jest.fn();

jest.mock("@/lib/groups", () => ({
  getGroupMembers: mockGetGroupMembers,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the `mockGetGroupMembers`/`jest.mock` assignments above,
// matching the convention in __tests__/useUserGroups.test.tsx.
function loadUseGroupMembers() {
  return require("@/hooks/useGroupMembers").useGroupMembers;
}

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

describe("useGroupMembers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getGroupMembers with the given groupId", async () => {
    mockGetGroupMembers.mockResolvedValue({ data: [{ user_id: "u1" }], error: null });
    const useGroupMembers = loadUseGroupMembers();

    await renderHook(() => useGroupMembers("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetGroupMembers).toHaveBeenCalledWith("g1"));
  });

  it("resolves the group's membership rows from the successful query", async () => {
    mockGetGroupMembers.mockResolvedValue({
      data: [
        { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" },
        { group_id: "g1", user_id: "u2", role: "member", joined_at: "2026-01-02" },
      ],
      error: null,
    });
    const useGroupMembers = loadUseGroupMembers();

    const { result } = await renderHook(() => useGroupMembers("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(2));
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetGroupMembers.mockResolvedValue({ data: null, error: fakeError });
    const useGroupMembers = loadUseGroupMembers();

    const { result } = await renderHook(() => useGroupMembers("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not call getGroupMembers when groupId is undefined (query disabled)", async () => {
    const useGroupMembers = loadUseGroupMembers();

    await renderHook(() => useGroupMembers(undefined), { wrapper: createWrapper() });

    expect(mockGetGroupMembers).not.toHaveBeenCalled();
  });
});
