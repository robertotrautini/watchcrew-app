import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetGroupWatchlistEntries = jest.fn();
const mockGetStreamingAvailabilityForTmdbIds = jest.fn();

const mockGetMoviesProvidersBatch = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getMoviesProvidersBatch: (...args: unknown[]) => mockGetMoviesProvidersBatch(...args),
}));

jest.mock("@/lib/watchlist", () => ({
  getGroupWatchlistEntries: mockGetGroupWatchlistEntries,
  getStreamingAvailabilityForTmdbIds: mockGetStreamingAvailabilityForTmdbIds,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the mock assignments above, matching the convention in
// __tests__/useUserGroups.test.tsx.
function loadUseGroupWatchlist() {
  return require("@/hooks/useGroupWatchlist").useGroupWatchlist;
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

describe("useGroupWatchlist", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMoviesProvidersBatch.mockResolvedValue({ data: {}, error: null });
  });

  it("fetches entries, then fetches streaming availability for the entries' tmdb_ids", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [
        { id: "e1", movie: { tmdb_id: 1 }, ratings: [] },
        { id: "e2", movie: { tmdb_id: 2 }, ratings: [] },
      ],
      error: null,
    });
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({ data: [], error: null });
    const useGroupWatchlist = loadUseGroupWatchlist();

    await renderHook(() => useGroupWatchlist("group-1"), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetGroupWatchlistEntries).toHaveBeenCalledWith("group-1"));
    await waitFor(() =>
      expect(mockGetStreamingAvailabilityForTmdbIds).toHaveBeenCalledWith([1, 2])
    );
  });

  it("resolves entries and a streaming-availability lookup built from the cache rows", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [{ id: "e1", movie: { tmdb_id: 42 }, ratings: [] }],
      error: null,
    });
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({
      data: [
        {
          tmdb_id: 42,
          region: "DE",
          data: { flatrate: [{ provider_id: 8 }], rent: [], buy: [] },
          last_fetched_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    const useGroupWatchlist = loadUseGroupWatchlist();

    const { result } = await renderHook(() => useGroupWatchlist("group-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data.entries).toEqual([{ id: "e1", movie: { tmdb_id: 42 }, ratings: [] }]);
    expect(result.current.data.streamingAvailability.get(42)).toBe(true);
  });

  it("refreshes the availability cache via ONE batch call for the date-less movies only, and uses the result", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [
        { id: "e1", movie: { tmdb_id: 1, release_date: null }, ratings: [] },
        { id: "e2", movie: { tmdb_id: 2, release_date: "2020-01-01" }, ratings: [] },
        { id: "e3", movie: { tmdb_id: 3, release_date: null }, ratings: [] },
      ],
      error: null,
    });
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({ data: [], error: null });
    mockGetMoviesProvidersBatch.mockResolvedValue({
      data: {
        "1": { flatrate: [{ provider_id: 8 }], rent: [], buy: [] },
        "3": { flatrate: [], rent: [{ provider_id: 8 }], buy: [] },
      },
      error: null,
    });
    const useGroupWatchlist = loadUseGroupWatchlist();

    const { result } = await renderHook(() => useGroupWatchlist("group-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetMoviesProvidersBatch).toHaveBeenCalledTimes(1);
    expect(mockGetMoviesProvidersBatch).toHaveBeenCalledWith([1, 3]);
    expect(result.current.data.streamingAvailability.get(1)).toBe(true);
    // rent-only does not count as "streamable"
    expect(result.current.data.streamingAvailability.get(3)).toBeFalsy();
  });

  it("does not call the batch action when all date-less movies have fresh cache rows", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [{ id: "e1", movie: { tmdb_id: 1, release_date: null }, ratings: [] }],
      error: null,
    });
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({
      data: [
        {
          tmdb_id: 1,
          region: "DE",
          data: { flatrate: [], rent: [], buy: [] },
          last_fetched_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    const useGroupWatchlist = loadUseGroupWatchlist();

    const { result } = await renderHook(() => useGroupWatchlist("group-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetMoviesProvidersBatch).not.toHaveBeenCalled();
  });

  it("surfaces an entries-query error through React Query's native error channel without calling the availability query", async () => {
    const fakeError = { message: "network error" };
    mockGetGroupWatchlistEntries.mockResolvedValue({ data: null, error: fakeError });
    const useGroupWatchlist = loadUseGroupWatchlist();

    const { result } = await renderHook(() => useGroupWatchlist("group-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(mockGetStreamingAvailabilityForTmdbIds).not.toHaveBeenCalled();
  });

  it("surfaces a streaming-availability query error through React Query's native error channel", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [{ id: "e1", movie: { tmdb_id: 1 }, ratings: [] }],
      error: null,
    });
    const fakeError = { message: "availability lookup failed" };
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({ data: null, error: fakeError });
    const useGroupWatchlist = loadUseGroupWatchlist();

    const { result } = await renderHook(() => useGroupWatchlist("group-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when groupId is undefined (query disabled)", async () => {
    const useGroupWatchlist = loadUseGroupWatchlist();

    await renderHook(() => useGroupWatchlist(undefined), { wrapper: createWrapper() });

    expect(mockGetGroupWatchlistEntries).not.toHaveBeenCalled();
  });

  it("keeps a JSON-safe shape in the query cache and rebuilds the Map in select", async () => {
    mockGetGroupWatchlistEntries.mockResolvedValue({
      data: [{ id: "e1", movie: { tmdb_id: 42 }, ratings: [] }],
      error: null,
    });
    mockGetStreamingAvailabilityForTmdbIds.mockResolvedValue({
      data: [{ tmdb_id: 42, region: "DE", data: { flatrate: [{ provider_id: 8 }], rent: [], buy: [] }, last_fetched_at: new Date().toISOString() }],
      error: null,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const useGroupWatchlist = loadUseGroupWatchlist();
    const { result } = await renderHook(() => useGroupWatchlist("group-1"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const cached = queryClient.getQueryCache().getAll()[0].state.data;
    expect(JSON.parse(JSON.stringify(cached))).toEqual(cached);
    expect(result.current.data.streamingAvailability.get(42)).toBe(true);
  });

  it("does not crash on an old JSON-restored cache entry whose Map became `{}`", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    queryClient.setQueryData(["watchlist", "group-1"], { entries: [], streamingAvailability: {} });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const useGroupWatchlist = loadUseGroupWatchlist();
    const { result } = await renderHook(() => useGroupWatchlist("group-1"), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data.streamingAvailability.get(1)).toBeUndefined();
  });
});
