import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockToggleLike = jest.fn();
const mockDeleteWatchlistEntry = jest.fn();
const mockAddToWatchlist = jest.fn();

jest.mock("@/lib/movieDetailMutations", () => ({
  toggleLike: mockToggleLike,
  deleteWatchlistEntry: mockDeleteWatchlistEntry,
  addToWatchlist: mockAddToWatchlist,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the mock assignments above, matching the convention in
// __tests__/useGroupWatchlist.test.tsx.
function loadHooks() {
  return require("@/hooks/useMovieDetailMutations");
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

describe("useToggleLike", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls toggleLike with the given params and resolves with the updated rating on success", async () => {
    mockToggleLike.mockResolvedValue({ data: { id: "r1", liked: true }, error: null });
    const { useToggleLike } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useToggleLike(), { wrapper });

    await act(async () => {
      result.current.mutate({
        watchlistEntryId: "we-1",
        memberId: "user-1",
        nextLiked: true,
        groupId: "group-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToggleLike).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      nextLiked: true,
    });
    expect(result.current.data).toEqual({ id: "r1", liked: true });
  });

  it("passes existingRatingId through so the underlying call updates rather than upserts blind", async () => {
    mockToggleLike.mockResolvedValue({ data: { id: "r1", liked: false }, error: null });
    const { useToggleLike } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useToggleLike(), { wrapper });

    await act(async () => {
      result.current.mutate({
        watchlistEntryId: "we-1",
        memberId: "user-1",
        nextLiked: false,
        existingRatingId: "r1",
        groupId: "group-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockToggleLike).toHaveBeenCalledWith({
      watchlistEntryId: "we-1",
      memberId: "user-1",
      nextLiked: false,
      existingRatingId: "r1",
    });
  });

  it("surfaces an error from toggleLike through React Query's native error channel", async () => {
    const fakeError = { message: "rls denied" };
    mockToggleLike.mockResolvedValue({ data: null, error: fakeError });
    const { useToggleLike } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useToggleLike(), { wrapper });

    await act(async () => {
      result.current.mutate({
        watchlistEntryId: "we-1",
        memberId: "user-1",
        nextLiked: true,
        groupId: "group-1",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("invalidates the group's watchlist cache on success (fixes the missing-refresh bug)", async () => {
    mockToggleLike.mockResolvedValue({ data: { id: "r1", liked: true }, error: null });
    const { useToggleLike } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useToggleLike(), { wrapper });

    await act(async () => {
      result.current.mutate({
        watchlistEntryId: "we-1",
        memberId: "user-1",
        nextLiked: true,
        groupId: "group-1",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("does not invalidate the cache when the like-toggle errors", async () => {
    const fakeError = { message: "rls denied" };
    mockToggleLike.mockResolvedValue({ data: null, error: fakeError });
    const { useToggleLike } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useToggleLike(), { wrapper });

    await act(async () => {
      result.current.mutate({
        watchlistEntryId: "we-1",
        memberId: "user-1",
        nextLiked: true,
        groupId: "group-1",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useDeleteWatchlistEntry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the targeted watchlist entry and invalidates the group's watchlist cache on success", async () => {
    mockDeleteWatchlistEntry.mockResolvedValue({ data: null, error: null });
    const { useDeleteWatchlistEntry } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWatchlistEntry(), { wrapper });

    await act(async () => {
      result.current.mutate({ watchlistEntryId: "we-42", groupId: "group-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockDeleteWatchlistEntry).toHaveBeenCalledWith({ watchlistEntryId: "we-42" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("surfaces a delete error through React Query's native error channel without invalidating the cache", async () => {
    const fakeError = { message: "rls denied" };
    mockDeleteWatchlistEntry.mockResolvedValue({ data: null, error: fakeError });
    const { useDeleteWatchlistEntry } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useDeleteWatchlistEntry(), { wrapper });

    await act(async () => {
      result.current.mutate({ watchlistEntryId: "we-42", groupId: "group-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useAddToWatchlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds the movie to the group's watchlist and invalidates the group's watchlist cache on success", async () => {
    mockAddToWatchlist.mockResolvedValue({ data: { id: "we-new-1" }, error: null });
    const { useAddToWatchlist } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useAddToWatchlist(), { wrapper });

    await act(async () => {
      result.current.mutate({ tmdbId: 603, groupId: "group-1", addedBy: "user-1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAddToWatchlist).toHaveBeenCalledWith({
      tmdbId: 603,
      groupId: "group-1",
      addedBy: "user-1",
    });
    expect(result.current.data).toEqual({ id: "we-new-1" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["watchlist", "group-1"] });
  });

  it("surfaces a generic upsertMovie/edge-function error from addToWatchlist through React Query's error channel without invalidating the cache", async () => {
    const fakeError = { message: "edge function failed" };
    mockAddToWatchlist.mockResolvedValue({ data: null, error: fakeError });
    const { useAddToWatchlist } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useAddToWatchlist(), { wrapper });

    await act(async () => {
      result.current.mutate({ tmdbId: 999, groupId: "group-1", addedBy: "user-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("surfaces a unique-violation error from addToWatchlist unchanged", async () => {
    const uniqueViolation = { code: "23505", message: "duplicate key value" };
    mockAddToWatchlist.mockResolvedValue({ data: null, error: uniqueViolation });
    const { useAddToWatchlist } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useAddToWatchlist(), { wrapper });

    await act(async () => {
      result.current.mutate({ tmdbId: 603, groupId: "group-1", addedBy: "user-1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(uniqueViolation);
  });
});
