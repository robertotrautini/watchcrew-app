import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetStudioMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getStudioMovies: mockGetStudioMovies,
}));

function loadUseStudioFilmography() {
  return require("@/hooks/useStudioFilmography").useStudioFilmography;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useStudioFilmography (paginated via useInfiniteQuery)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches page 1 first (initialPageParam) and resolves it into pages[0]", async () => {
    mockGetStudioMovies.mockResolvedValue({
      data: { page: 1, results: [{ id: 1, title: "Movie One" }], total_pages: 3, total_results: 60 },
      error: null,
    });
    const useStudioFilmography = loadUseStudioFilmography();

    const { result } = await renderHook(() => useStudioFilmography(55), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetStudioMovies).toHaveBeenCalledWith(55, 1);
    expect(result.current.data.pages[0].results).toEqual([{ id: 1, title: "Movie One" }]);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("fetches the next page with an incremented page number when fetchNextPage is called", async () => {
    mockGetStudioMovies.mockResolvedValueOnce({
      data: { page: 1, results: [{ id: 1, title: "Movie One" }], total_pages: 2, total_results: 40 },
      error: null,
    });
    mockGetStudioMovies.mockResolvedValueOnce({
      data: { page: 2, results: [{ id: 2, title: "Movie Two" }], total_pages: 2, total_results: 40 },
      error: null,
    });
    const useStudioFilmography = loadUseStudioFilmography();

    const { result } = await renderHook(() => useStudioFilmography(55), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data.pages).toHaveLength(2));
    expect(mockGetStudioMovies).toHaveBeenCalledWith(55, 2);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("does not fetch when companyId is undefined", async () => {
    const useStudioFilmography = loadUseStudioFilmography();

    await renderHook(() => useStudioFilmography(undefined), { wrapper: createWrapper() });

    expect(mockGetStudioMovies).not.toHaveBeenCalled();
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetStudioMovies.mockResolvedValue({ data: null, error: fakeError });
    const useStudioFilmography = loadUseStudioFilmography();

    const { result } = await renderHook(() => useStudioFilmography(55), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});
