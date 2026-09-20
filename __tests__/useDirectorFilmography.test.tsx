import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetDirectorMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getDirectorMovies: mockGetDirectorMovies,
}));

function loadUseDirectorFilmography() {
  return require("@/hooks/useDirectorFilmography").useDirectorFilmography;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useDirectorFilmography", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches via getDirectorMovies and resolves its data", async () => {
    const movies = [{ id: 1, title: "Movie One", job: "Director" }];
    mockGetDirectorMovies.mockResolvedValue({ data: movies, error: null });
    const useDirectorFilmography = loadUseDirectorFilmography();

    const { result } = await renderHook(() => useDirectorFilmography(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(movies));
    expect(mockGetDirectorMovies).toHaveBeenCalledWith(7);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetDirectorMovies.mockResolvedValue({ data: null, error: fakeError });
    const useDirectorFilmography = loadUseDirectorFilmography();

    const { result } = await renderHook(() => useDirectorFilmography(7), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when personId is undefined", async () => {
    const useDirectorFilmography = loadUseDirectorFilmography();

    await renderHook(() => useDirectorFilmography(undefined), { wrapper: createWrapper() });

    expect(mockGetDirectorMovies).not.toHaveBeenCalled();
  });
});
