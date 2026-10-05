import { queryKeys } from "@/lib/queryKeys";
// M10 (part): tests for src/hooks/useGroupPushSubscription.ts -- the
// Settings-hub's per-group push opt-in surface. Mocks src/lib/pushTokens.ts
// (same convention as __tests__/hooks/useSaveRating.test.tsx: mock the src/lib
// layer, assert query state + mutation calls + cache invalidation).

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetGroupPushSubscription = jest.fn();
const mockSubscribeToGroupPush = jest.fn();
const mockUnsubscribeFromGroupPush = jest.fn();

jest.mock("@/lib/pushTokens", () => ({
  getGroupPushSubscription: mockGetGroupPushSubscription,
  subscribeToGroupPush: mockSubscribeToGroupPush,
  unsubscribeFromGroupPush: mockUnsubscribeFromGroupPush,
}));

function loadHook() {
  return require("@/hooks/useGroupPushSubscription").useGroupPushSubscription;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return { wrapper, queryClient };
}

describe("useGroupPushSubscription", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is disabled (no query call) until both groupId and userId are known", async () => {
    const useGroupPushSubscription = loadHook();
    const { wrapper } = createWrapper();

    await renderHook(() => useGroupPushSubscription(undefined, "u1"), { wrapper });

    expect(mockGetGroupPushSubscription).not.toHaveBeenCalled();
  });

  it("resolves isSubscribed: true when a subscription row exists", async () => {
    mockGetGroupPushSubscription.mockResolvedValue({ data: { user_id: "u1", group_id: "g1" }, error: null });
    const useGroupPushSubscription = loadHook();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useGroupPushSubscription("g1", "u1"), { wrapper });

    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
  });

  it("resolves isSubscribed: false when no subscription row exists", async () => {
    mockGetGroupPushSubscription.mockResolvedValue({ data: null, error: null });
    const useGroupPushSubscription = loadHook();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useGroupPushSubscription("g1", "u1"), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isSubscribed).toBe(false);
  });

  it("subscribe() calls subscribeToGroupPush and invalidates the subscription query", async () => {
    mockGetGroupPushSubscription.mockResolvedValue({ data: null, error: null });
    mockSubscribeToGroupPush.mockResolvedValue({ data: {}, error: null });
    const useGroupPushSubscription = loadHook();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useGroupPushSubscription("g1", "u1"), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.subscribe();
    });

    await waitFor(() =>
      expect(mockSubscribeToGroupPush).toHaveBeenCalledWith({ groupId: "g1", userId: "u1" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.pushSubscription.byGroupUser("g1", "u1") });
  });

  it("unsubscribe() calls unsubscribeFromGroupPush and invalidates the subscription query", async () => {
    mockGetGroupPushSubscription.mockResolvedValue({ data: { user_id: "u1", group_id: "g1" }, error: null });
    mockUnsubscribeFromGroupPush.mockResolvedValue({ data: null, error: null });
    const useGroupPushSubscription = loadHook();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useGroupPushSubscription("g1", "u1"), { wrapper });
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));

    await act(async () => {
      result.current.unsubscribe();
    });

    await waitFor(() =>
      expect(mockUnsubscribeFromGroupPush).toHaveBeenCalledWith({ groupId: "g1", userId: "u1" }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.pushSubscription.byGroupUser("g1", "u1") });
  });
});
