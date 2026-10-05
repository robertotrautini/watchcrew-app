import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

const mockGetActorMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getActorMovies: mockGetActorMovies,
}));

function loadUseActorFilmography() {
  return require("@/hooks/useActorFilmography").useActorFilmography;
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
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(movies));
    expect(mockGetActorMovies).toHaveBeenCalledWith(8);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetActorMovies.mockResolvedValue({ data: null, error: fakeError });
    const useActorFilmography = loadUseActorFilmography();

    const { result } = await renderHook(() => useActorFilmography(8), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when personId is undefined", async () => {
    const useActorFilmography = loadUseActorFilmography();

    await renderHook(() => useActorFilmography(undefined), { wrapper: createQueryWrapper() });

    expect(mockGetActorMovies).not.toHaveBeenCalled();
  });
});
