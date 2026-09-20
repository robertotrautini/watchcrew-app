import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetMovieProviders = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getMovieProviders: mockGetMovieProviders,
}));

// useQueries can't be usefully unit-mocked itself, so this lets it run for
// real against the mocked lib function (per the M6 part 2b task brief),
// with a real QueryClientProvider wrapper.
function loadUseMoviesProviders() {
  return require("@/hooks/useMoviesProviders").useMoviesProviders;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useMoviesProviders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("batch-fetches providers for each tmdbId and builds a tmdbId -> providers map", async () => {
    mockGetMovieProviders.mockImplementation(async (id: number) => {
      if (id === 1) return { data: { flatrate: [{ provider_id: 8, provider_name: "Netflix" }], rent: [], buy: [] }, error: null };
      if (id === 2) return { data: { flatrate: [], rent: [{ provider_id: 2, provider_name: "Apple TV" }], buy: [] }, error: null };
      return { data: null, error: null };
    });
    const useMoviesProviders = loadUseMoviesProviders();

    const { result } = await renderHook(() => useMoviesProviders([1, 2]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.providersByTmdbId.get(1)).toEqual({
      flatrate: [{ provider_id: 8, provider_name: "Netflix" }],
      rent: [],
      buy: [],
    });
    expect(result.current.providersByTmdbId.get(2)).toEqual({
      flatrate: [],
      rent: [{ provider_id: 2, provider_name: "Apple TV" }],
      buy: [],
    });
    expect(mockGetMovieProviders).toHaveBeenCalledWith(1);
    expect(mockGetMovieProviders).toHaveBeenCalledWith(2);
  });

  it("returns isLoading true while any of the queries are still pending, false once all settle", async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    mockGetMovieProviders.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve({ data: { flatrate: [], rent: [], buy: [] }, error: null });
      return new Promise((resolve) => {
        resolveSecond = resolve;
      });
    });
    const useMoviesProviders = loadUseMoviesProviders();

    const { result } = await renderHook(() => useMoviesProviders([1, 2]), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    resolveSecond({ data: { flatrate: [], rent: [], buy: [] }, error: null });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("skips entries in the map for tmdbIds whose query errored or has no data yet", async () => {
    mockGetMovieProviders.mockImplementation(async (id: number) => {
      if (id === 1) return { data: { flatrate: [], rent: [], buy: [] }, error: null };
      throw new Error("boom");
    });
    const useMoviesProviders = loadUseMoviesProviders();

    const { result } = await renderHook(() => useMoviesProviders([1, 2]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.providersByTmdbId.has(1)).toBe(true);
    expect(result.current.providersByTmdbId.has(2)).toBe(false);
  });

  it("returns an empty map and isLoading false for an empty tmdbIds array", async () => {
    const useMoviesProviders = loadUseMoviesProviders();

    const { result } = await renderHook(() => useMoviesProviders([]), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.providersByTmdbId.size).toBe(0);
    expect(mockGetMovieProviders).not.toHaveBeenCalled();
  });
});
