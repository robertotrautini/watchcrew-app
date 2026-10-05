import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

const mockGetDirectorMovies = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getDirectorMovies: mockGetDirectorMovies,
}));

function loadUseDirectorFilmography() {
  return require("@/hooks/useDirectorFilmography").useDirectorFilmography;
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
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(movies));
    expect(mockGetDirectorMovies).toHaveBeenCalledWith(7);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetDirectorMovies.mockResolvedValue({ data: null, error: fakeError });
    const useDirectorFilmography = loadUseDirectorFilmography();

    const { result } = await renderHook(() => useDirectorFilmography(7), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when personId is undefined", async () => {
    const useDirectorFilmography = loadUseDirectorFilmography();

    await renderHook(() => useDirectorFilmography(undefined), { wrapper: createQueryWrapper() });

    expect(mockGetDirectorMovies).not.toHaveBeenCalled();
  });
});
