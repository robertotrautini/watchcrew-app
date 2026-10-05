// M7 part 2b (Rating-Dialog): TanStack Query mutation tests for
// src/hooks/useSaveRating.ts, mirroring the mocking convention in
// __tests__/useMovieDetailMutations.test.tsx (mock the src/lib layer,
// assert the hook throws-as-error on `{ error }` and invalidates the
// group's watchlist cache on success).

import { toLocalIsoDate } from "@/lib/localDate";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockSaveRating = jest.fn();
const mockSavePayment = jest.fn();
const mockResetRating = jest.fn();

jest.mock("@/lib/movieDetailMutations", () => ({
  saveRating: mockSaveRating,
  savePayment: mockSavePayment,
  resetRating: mockResetRating,
}));

// Lazily required, same convention as useMovieDetailMutations.test.tsx, to
// dodge Babel's CJS hoisting of the mock assignments above.
function loadHooks() {
  return require("@/hooks/useSaveRating");
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

describe("useSaveRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("upserts the rating with rated_at set to 'now' and seen_at kept separate, without touching payment when none is given", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4.5,
        liked: true,
        seenAt: "2026-09-10",
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSaveRating).toHaveBeenCalledWith({
      watchlist_entry_id: "we-1",
      member_id: "user-1",
      rating: 4.5,
      liked: true,
      seen_at: "2026-09-10",
      rated_at: NOW.toISOString(),
    });
    expect(mockSavePayment).not.toHaveBeenCalled();
  });

  it("also writes the payment when a payer is assigned, resolving paid_at through the priority chain (falls back to seen_at here)", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
        payment: { paidByMemberId: "user-2", explicitPaidAt: null, existingPaidAt: null },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-09-10",
    });
  });

  it("never overwrites an already-set paid_at when no explicit new payment date is given", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
        payment: {
          paidByMemberId: "user-2",
          explicitPaidAt: null,
          existingPaidAt: "2026-08-01T00:00:00.000Z",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-08-01T00:00:00.000Z",
    });
  });

  it("prefers an explicitly-passed new payment date over everything else", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
        payment: {
          paidByMemberId: "user-2",
          explicitPaidAt: "2026-09-19",
          existingPaidAt: "2026-08-01T00:00:00.000Z",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: "2026-09-19",
    });
  });

  it("falls back to 'now' for paid_at when there's no explicit date, no existing paid_at, and 'Weiß nicht' was checked (seenAt null)", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    mockSavePayment.mockResolvedValue({ data: { id: "we-1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: null,
        now: NOW,
        payment: { paidByMemberId: "user-2", explicitPaidAt: null, existingPaidAt: null },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      paidByMemberId: "user-2",
      paidAt: toLocalIsoDate(NOW),
    });
  });

  it("surfaces a rating-save error through React Query's error channel and never attempts the payment write", async () => {
    const fakeError = { message: "rls denied" };
    mockSaveRating.mockResolvedValue({ data: null, error: fakeError });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
        payment: { paidByMemberId: "user-2", explicitPaidAt: null, existingPaidAt: null },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(mockSavePayment).not.toHaveBeenCalled();
  });

  it("surfaces a payment-save error through React Query's error channel", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    const fakeError = { message: "rls denied" };
    mockSavePayment.mockResolvedValue({ data: null, error: fakeError });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
        payment: { paidByMemberId: "user-2", explicitPaidAt: null, existingPaidAt: null },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("invalidates the group's watchlist cache on success", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("does not invalidate the cache when the save errors", async () => {
    mockSaveRating.mockResolvedValue({ data: null, error: { message: "rls denied" } });
    const { useSaveRating } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSaveRating(), { wrapper });

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
        now: NOW,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("defaults 'now' to the real current time when not given", async () => {
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    const { useSaveRating } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useSaveRating(), { wrapper });
    const before = Date.now();

    await act(async () => {
      result.current.mutate({
        groupId: "group-1",
        watchlistEntryId: "we-1",
        memberId: "user-1",
        rating: 4,
        liked: false,
        seenAt: "2026-09-10",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const after = Date.now();
    const call = mockSaveRating.mock.calls[0][0];
    const ratedAtMs = new Date(call.rated_at).getTime();
    expect(ratedAtMs).toBeGreaterThanOrEqual(before);
    expect(ratedAtMs).toBeLessThanOrEqual(after);
  });
});

describe("useResetRating", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resets the targeted rating row and invalidates the group's watchlist cache on success", async () => {
    mockResetRating.mockResolvedValue({ data: { id: "r1", rating: null, liked: false }, error: null });
    const { useResetRating } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useResetRating(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", ratingId: "r1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockResetRating).toHaveBeenCalledWith({ ratingId: "r1" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("surfaces a reset error through React Query's error channel without invalidating the cache", async () => {
    const fakeError = { message: "rls denied" };
    mockResetRating.mockResolvedValue({ data: null, error: fakeError });
    const { useResetRating } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useResetRating(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "group-1", ratingId: "r1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
