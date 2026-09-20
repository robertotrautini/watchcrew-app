import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetActorMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getActorMovies: mockGetActorMovies,
}));

function loadUseActorFilmography() {
  return require("@/hooks/useActorFilmography").useActorFilmography;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useActorFilmography", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches via getActorMovies and resolves its data", async () => {
    const movies = [{ id: 2, title: "Movie Two", character: "Hero" }];
    mockGetActorMovies.mockResolvedValue({ data: movies, error: null });
    const useActorFilmography = loadUseActorFilmography();

    const { result } = await renderHook(() => useActorFilmography(8), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(movies));
    expect(mockGetActorMovies).toHaveBeenCalledWith(8);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetActorMovies.mockResolvedValue({ data: null, error: fakeError });
    const useActorFilmography = loadUseActorFilmography();

    const { result } = await renderHook(() => useActorFilmography(8), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when personId is undefined", async () => {
    const useActorFilmography = loadUseActorFilmography();

    await renderHook(() => useActorFilmography(undefined), { wrapper: createWrapper() });

    expect(mockGetActorMovies).not.toHaveBeenCalled();
  });
});
