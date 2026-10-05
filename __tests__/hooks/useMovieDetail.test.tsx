import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetMovieDetails = jest.fn();
const mockGetMovieTrailer = jest.fn();
const mockGetMovieCredits = jest.fn();
const mockGetGermanReleaseDate = jest.fn();
const mockGetMovieProviders = jest.fn();

jest.mock("@/lib/movieDetail", () => ({
  getMovieDetails: mockGetMovieDetails,
  getMovieTrailer: mockGetMovieTrailer,
  getMovieCredits: mockGetMovieCredits,
  getGermanReleaseDate: mockGetGermanReleaseDate,
  getMovieProviders: mockGetMovieProviders,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the mock assignments above, matching the convention in
// __tests__/useGroupWatchlist.test.tsx / __tests__/useUserGroups.test.tsx.
function loadUseMovieDetail() {
  return require("@/hooks/useMovieDetail").useMovieDetail;
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

const okDetails = {
  data: {
    id: 42,
    runtime: 120,
    genres: ["Drama"],
    belongs_to_collection: null,
    vote_average: 7.5,
  },
  error: null,
};
const okTrailer = {
  data: { id: "v1", key: "abc123", site: "YouTube", type: "Trailer" },
  error: null,
};
const okCredits = { data: { cast: [], crew: [], director: null }, error: null };
const okReleaseDate = {
  data: { category: "Kino", release_date: "2026-01-01", type: 3 },
  error: null,
};
const okProviders = { data: { flatrate: [], rent: [], buy: [] }, error: null };

function mockAllSucceed() {
  mockGetMovieDetails.mockResolvedValue(okDetails);
  mockGetMovieTrailer.mockResolvedValue(okTrailer);
  mockGetMovieCredits.mockResolvedValue(okCredits);
  mockGetGermanReleaseDate.mockResolvedValue(okReleaseDate);
  mockGetMovieProviders.mockResolvedValue(okProviders);
}

describe("useMovieDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not fetch when tmdbId is undefined (query disabled)", async () => {
    const useMovieDetail = loadUseMovieDetail();

    await renderHook(() => useMovieDetail(undefined), { wrapper: createWrapper() });

    expect(mockGetMovieDetails).not.toHaveBeenCalled();
    expect(mockGetMovieTrailer).not.toHaveBeenCalled();
    expect(mockGetMovieCredits).not.toHaveBeenCalled();
    expect(mockGetGermanReleaseDate).not.toHaveBeenCalled();
    expect(mockGetMovieProviders).not.toHaveBeenCalled();
  });

  it("fetches all five tmdb-proxy actions for the given tmdbId", async () => {
    mockAllSucceed();
    const useMovieDetail = loadUseMovieDetail();

    await renderHook(() => useMovieDetail(42), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetMovieDetails).toHaveBeenCalledWith(42));
    expect(mockGetMovieTrailer).toHaveBeenCalledWith(42);
    expect(mockGetMovieCredits).toHaveBeenCalledWith(42);
    expect(mockGetGermanReleaseDate).toHaveBeenCalledWith(42);
    expect(mockGetMovieProviders).toHaveBeenCalledWith(42);
  });

  it("resolves the combined MovieDetailData shape from all five results", async () => {
    mockAllSucceed();
    const useMovieDetail = loadUseMovieDetail();

    const { result } = await renderHook(() => useMovieDetail(42), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toEqual({
      details: okDetails.data,
      trailer: okTrailer.data,
      credits: okCredits.data,
      germanReleaseDate: okReleaseDate.data,
      providers: okProviders.data,
    });
  });

  it("stores the query under the [\"movieDetail\", tmdbId] query key", async () => {
    mockAllSucceed();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const useMovieDetail = loadUseMovieDetail();

    await renderHook(() => useMovieDetail(42), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryData(["movieDetail", 42])).toBeDefined();
    });
  });

  it.each([
    ["details", () => mockGetMovieDetails],
    ["videos/trailer", () => mockGetMovieTrailer],
    ["credits", () => mockGetMovieCredits],
    ["release_dates", () => mockGetGermanReleaseDate],
    ["providers", () => mockGetMovieProviders],
  ])(
    "propagates a %s-fetch error through React Query's native error channel",
    async (_label, getMock) => {
      mockAllSucceed();
      const fakeError = { message: "tmdb-proxy failed" };
      getMock().mockResolvedValue({ data: null, error: fakeError });

      const useMovieDetail = loadUseMovieDetail();
      const { result } = await renderHook(() => useMovieDetail(42), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toEqual(fakeError);
    }
  );
});
