import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetWatchGroupDetails = jest.fn();
const mockGetWatchGroupsByIds = jest.fn();

jest.mock("@/lib/groups", () => ({
  getWatchGroupDetails: mockGetWatchGroupDetails,
  getWatchGroupsByIds: mockGetWatchGroupsByIds,
}));

// Lazily required, same Babel CJS-hoisting reason as __tests__/useUserGroups.test.tsx.
function loadUseGroupDetails() {
  return require("@/hooks/useGroupDetails").useGroupDetails;
}

function loadUseGroupNames() {
  return require("@/hooks/useGroupDetails").useGroupNames;
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

describe("useGroupDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getWatchGroupDetails with the given groupId", async () => {
    mockGetWatchGroupDetails.mockResolvedValue({
      data: { id: "g1", name: "Filmfreunde", color_theme: "gold", invite_token: "tok-1", invite_enabled: true },
      error: null,
    });
    const useGroupDetails = loadUseGroupDetails();

    const { unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetWatchGroupDetails).toHaveBeenCalledWith("g1"));
    await unmount();
  });

  it("resolves the group's own row from the successful query", async () => {
    mockGetWatchGroupDetails.mockResolvedValue({
      data: { id: "g1", name: "Filmfreunde", color_theme: "blue", invite_token: "tok-1", invite_enabled: true },
      error: null,
    });
    const useGroupDetails = loadUseGroupDetails();

    const { result, unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.name).toBe("Filmfreunde"));
    expect(result.current.data?.color_theme).toBe("blue");
    await unmount();
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetWatchGroupDetails.mockResolvedValue({ data: null, error: fakeError });
    const useGroupDetails = loadUseGroupDetails();

    const { result, unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    await unmount();
  });

  it("does not call getWatchGroupDetails when groupId is undefined (query disabled)", async () => {
    const useGroupDetails = loadUseGroupDetails();

    const { unmount } = await renderHook(() => useGroupDetails(undefined), { wrapper: createWrapper() });

    expect(mockGetWatchGroupDetails).not.toHaveBeenCalled();
    await unmount();
  });
});

describe("useGroupNames", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getWatchGroupsByIds with the given group ids", async () => {
    mockGetWatchGroupsByIds.mockResolvedValue({
      data: [{ id: "g1", name: "Filmfreunde" }, { id: "g2", name: "Kinoclub" }],
      error: null,
    });
    const useGroupNames = loadUseGroupNames();

    const { unmount } = await renderHook(() => useGroupNames(["g1", "g2"]), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetWatchGroupsByIds).toHaveBeenCalledWith(["g1", "g2"]));
    await unmount();
  });

  it("resolves the groups' rows from the successful query", async () => {
    mockGetWatchGroupsByIds.mockResolvedValue({
      data: [{ id: "g1", name: "Filmfreunde" }],
      error: null,
    });
    const useGroupNames = loadUseGroupNames();

    const { result, unmount } = await renderHook(() => useGroupNames(["g1"]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([{ id: "g1", name: "Filmfreunde" }]));
    await unmount();
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetWatchGroupsByIds.mockResolvedValue({ data: null, error: fakeError });
    const useGroupNames = loadUseGroupNames();

    const { result, unmount } = await renderHook(() => useGroupNames(["g1"]), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    await unmount();
  });

  it("does not call getWatchGroupsByIds for an empty id list (query disabled)", async () => {
    const useGroupNames = loadUseGroupNames();

    const { unmount } = await renderHook(() => useGroupNames([]), { wrapper: createWrapper() });

    expect(mockGetWatchGroupsByIds).not.toHaveBeenCalled();
    await unmount();
  });
});
