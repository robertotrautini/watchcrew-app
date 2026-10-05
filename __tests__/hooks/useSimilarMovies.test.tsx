import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetSimilarMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getSimilarMovies: mockGetSimilarMovies,
}));

function loadUseSimilarMovies() {
  return require("@/hooks/useSimilarMovies").useSimilarMovies;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useSimilarMovies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches via getSimilarMovies and resolves its data", async () => {
    const related = [{ title: "Related", year: 2020, ids: { tmdb: 5 } }];
    mockGetSimilarMovies.mockResolvedValue({ data: related, error: null });
    const useSimilarMovies = loadUseSimilarMovies();

    const { result } = await renderHook(() => useSimilarMovies(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(related));
    expect(mockGetSimilarMovies).toHaveBeenCalledWith(42);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetSimilarMovies.mockResolvedValue({ data: null, error: fakeError });
    const useSimilarMovies = loadUseSimilarMovies();

    const { result } = await renderHook(() => useSimilarMovies(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when tmdbId is undefined", async () => {
    const useSimilarMovies = loadUseSimilarMovies();

    await renderHook(() => useSimilarMovies(undefined), { wrapper: createWrapper() });

    expect(mockGetSimilarMovies).not.toHaveBeenCalled();
  });
});
