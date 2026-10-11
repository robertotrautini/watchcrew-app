import { queryKeys } from "@/lib/queryKeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockUpsertMovie = jest.fn();
const mockSaveRating = jest.fn();
const mockEnsureEntry = jest.fn();
const mockSavePayment = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({ upsertMovie: mockUpsertMovie }));
jest.mock("@/lib/movieDetailMutations", () => ({
  saveRating: mockSaveRating,
  ensureWatchlistEntry: mockEnsureEntry,
  savePayment: mockSavePayment,
}));

function loadHook() {
  return require("@/hooks/useDirectRate");
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const wrapper = function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return { wrapper, queryClient };
}

const NOW = new Date("2026-09-20T12:00:00.000Z");
const PARAMS = {
  tmdbId: 42,
  groupId: "group-1",
  memberId: "user-1",
  rating: 4,
  liked: false,
  seenAt: "2026-09-10",
  now: NOW,
};

describe("useDirectRate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsertMovie.mockResolvedValue({ data: { movieId: "movie-1" }, error: null });
    mockSaveRating.mockResolvedValue({ data: { id: "r1" }, error: null });
    mockEnsureEntry.mockResolvedValue({ data: { id: "we-1", paid_at: null }, error: null });
  });

  it("upserts the rating once, ensures the group entry once, and invalidates caches", async () => {
    const { useDirectRate } = loadHook();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useDirectRate(), { wrapper });

    await act(async () => {
      result.current.mutate(PARAMS);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSaveRating).toHaveBeenCalledTimes(1);
    expect(mockSaveRating).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-1", movie_id: "movie-1", rating: 4 }),
    );
    expect(mockEnsureEntry).toHaveBeenCalledTimes(1);
    expect(mockEnsureEntry).toHaveBeenCalledWith({
      groupId: "group-1",
      movieId: "movie-1",
      addedBy: "user-1",
    });
    expect(mockSaveRating.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnsureEntry.mock.invocationCallOrder[0],
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.watchlist.all });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.myDiary.all });
  });

  it("uses the existing entry (ensureWatchlistEntry is idempotent) and writes payment to it", async () => {
    mockEnsureEntry.mockResolvedValue({ data: { id: "we-old", paid_at: null }, error: null });
    mockSavePayment.mockResolvedValue({ data: {}, error: null });
    const { useDirectRate } = loadHook();
    const { wrapper } = createWrapper();
    const { result } = await renderHook(() => useDirectRate(), { wrapper });

    await act(async () => {
      result.current.mutate({
        ...PARAMS,
        payment: { paidByMemberId: "user-2", explicitPaidAt: null },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEnsureEntry).toHaveBeenCalledTimes(1);
    expect(mockSavePayment).toHaveBeenCalledWith({
      watchlistEntryId: "we-old",
      paidByMemberId: "user-2",
      paidAt: "2026-09-10",
    });
  });

  it("writes nothing when the movie upsert fails", async () => {
    mockUpsertMovie.mockResolvedValue({ data: null, error: { message: "edge" } });
    const { useDirectRate } = loadHook();
    const { wrapper } = createWrapper();
    const { result } = await renderHook(() => useDirectRate(), { wrapper });

    await act(async () => {
      result.current.mutate(PARAMS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSaveRating).not.toHaveBeenCalled();
    expect(mockEnsureEntry).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({ ratingSaved: false });
  });

  it("creates no entry when the rating save fails", async () => {
    mockSaveRating.mockResolvedValue({ data: null, error: { message: "rls" } });
    const { useDirectRate } = loadHook();
    const { wrapper } = createWrapper();
    const { result } = await renderHook(() => useDirectRate(), { wrapper });

    await act(async () => {
      result.current.mutate(PARAMS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockEnsureEntry).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({ ratingSaved: false });
  });

  it("flags ratingSaved and still invalidates caches when the entry creation fails", async () => {
    mockEnsureEntry.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { useDirectRate } = loadHook();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useDirectRate(), { wrapper });

    await act(async () => {
      result.current.mutate(PARAMS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockSaveRating).toHaveBeenCalledTimes(1);
    expect(result.current.error).toMatchObject({ ratingSaved: true });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.myDiary.all });
  });
});
