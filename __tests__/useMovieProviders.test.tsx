import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetMovieProviders = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getMovieProviders: mockGetMovieProviders,
}));

function loadUseMovieProviders() {
  return require("@/hooks/useMovieProviders").useMovieProviders;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useMovieProviders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches via getMovieProviders and resolves its data", async () => {
    const providers = { flatrate: [], rent: [], buy: [] };
    mockGetMovieProviders.mockResolvedValue({ data: providers, error: null });
    const useMovieProviders = loadUseMovieProviders();

    const { result } = await renderHook(() => useMovieProviders(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(providers));
    expect(mockGetMovieProviders).toHaveBeenCalledWith(42);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetMovieProviders.mockResolvedValue({ data: null, error: fakeError });
    const useMovieProviders = loadUseMovieProviders();

    const { result } = await renderHook(() => useMovieProviders(42), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when tmdbId is undefined", async () => {
    const useMovieProviders = loadUseMovieProviders();

    await renderHook(() => useMovieProviders(undefined), { wrapper: createWrapper() });

    expect(mockGetMovieProviders).not.toHaveBeenCalled();
  });
});
