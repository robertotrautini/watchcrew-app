// M8 (Bezahl-Tracker): TanStack Query mutation tests for
// src/hooks/useTrackerPayments.ts, mirroring the mocking convention in
// __tests__/useSaveRating.test.tsx.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockSavePayment = jest.fn();
const mockDeletePayment = jest.fn();

jest.mock("@/lib/movieDetailMutations", () => ({
  savePayment: mockSavePayment,
  deletePayment: mockDeletePayment,
}));

function loadHooks() {
  return require("@/hooks/useTrackerPayments");
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

const NOW = new Date("2026-09-20T12:00:00.000Z");

describe("useSetPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefers an explicitly-entered date over everything else", async () => {
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSetPayment } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSetPayment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        paidByMemberId: "user-2",
        explicitDate: "2026-09-19",
        existingPaidAt: "2026-08-01T00:00:00.000Z",
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-09-19",
    });
  });

  it("never overwrites an existing paid_at when no explicit date is given", async () => {
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSetPayment } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSetPayment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        paidByMemberId: "user-2",
        explicitDate: null,
        existingPaidAt: "2026-08-01T00:00:00.000Z",
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("falls back to 'now' when there's no explicit date and no existing paid_at (the simplified chain -- no seen_at fallback here)", async () => {
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSetPayment } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSetPayment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        paidByMemberId: "user-2",
        explicitDate: null,
        existingPaidAt: null,
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: NOW.toISOString(),
    });
  });

  it("surfaces a save error through React Query's error channel and does not invalidate the cache", async () => {
    const fakeError = { message: "rls denied" };
    mockSavePayment.mockResolvedValue({ data: null, error: fakeError });
    const { useSetPayment } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSetPayment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        paidByMemberId: "user-2",
        explicitDate: "2026-09-19",
        existingPaidAt: null,
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("invalidates the group's watchlist cache on success", async () => {
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSetPayment } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSetPayment(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        paidByMemberId: "user-2",
        explicitDate: "2026-09-19",
        existingPaidAt: null,
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });
});

describe("useDeletePayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("clears the targeted entry's payment and invalidates the group's watchlist cache on success", async () => {
    mockDeletePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useDeletePayment } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeletePayment(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", watchlistEntryId: "we-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeletePayment).toHaveBeenCalledWith({ watchlistEntryId: "we-1" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("surfaces a delete error through React Query's error channel without invalidating the cache", async () => {
    const fakeError = { message: "rls denied" };
    mockDeletePayment.mockResolvedValue({ data: null, error: fakeError });
    const { useDeletePayment } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeletePayment(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", watchlistEntryId: "we-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
