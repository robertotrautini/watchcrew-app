import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

// M7 part 2 (Add-Movie-Modal), Film mode: debounced (350ms) fuzzy movie
// search via the `search` tmdb-proxy action. Mirrors the
// useSimilarMovies.ts/useDirectorFilmography.ts convention (thin useQuery
// wrapper translating the never-throws { data, error } tuple into React
// Query's native error channel), plus the new 350ms debounce on top of the
// raw query string.

const mockSearchMovies = jest.fn();
jest.mock("@/lib/tmdbProxy", () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
}));

function loadHook() {
  return require("@/hooks/useMovieSearch").useMovieSearch;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const wrapper = function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return wrapper;
}

describe("useMovieSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
  });

  it("does not call searchMovies before the 350ms debounce elapses, once the query changes", async () => {
    mockSearchMovies.mockResolvedValue({ data: [], error: null });
    const useMovieSearch = loadHook();
    const wrapper = createWrapper();

    const { rerender, unmount } = await renderHook(
      ({ query }: { query: string }) => useMovieSearch(query),
      { wrapper, initialProps: { query: "" } },
    );
    await rerender({ query: "matrix" });

    await act(async () => {
      jest.advanceTimersByTime(349);
    });
    expect(mockSearchMovies).not.toHaveBeenCalled();

    await unmount();
  });

  it("calls searchMovies with the query once 350ms have elapsed, and resolves with its data", async () => {
    const results = [{ id: 603, title: "The Matrix" }];
    mockSearchMovies.mockResolvedValue({ data: results, error: null });
    const useMovieSearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => useMovieSearch("matrix"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchMovies).toHaveBeenCalledWith("matrix");
    expect(result.current.data).toEqual(results);
  });

  it("does not query at all for an empty/whitespace-only query string", async () => {
    const useMovieSearch = loadHook();
    const wrapper = createWrapper();

    await renderHook(() => useMovieSearch("   "), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockSearchMovies).not.toHaveBeenCalled();
  });

  it("surfaces a searchMovies error through React Query's native error channel", async () => {
    const fakeError = { message: "edge function failed" };
    mockSearchMovies.mockResolvedValue({ data: null, error: fakeError });
    const useMovieSearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => useMovieSearch("matrix"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});
