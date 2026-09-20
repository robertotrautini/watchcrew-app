import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

// M7 part 2 (Add-Movie-Modal), Regisseur/Besetzung modes: debounced (250ms)
// person autocomplete via the `search_person` tmdb-proxy action. Same shape
// as useMovieSearch.ts, different debounce timing and underlying action.

const mockSearchPerson = jest.fn();
jest.mock("@/lib/tmdbProxy", () => ({
  searchPerson: (...args: unknown[]) => mockSearchPerson(...args),
}));

function loadHook() {
  return require("@/hooks/usePersonSearch").usePersonSearch;
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

describe("usePersonSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
  });

  it("does not call searchPerson before the 250ms debounce elapses, once the query changes", async () => {
    mockSearchPerson.mockResolvedValue({ data: [], error: null });
    const usePersonSearch = loadHook();
    const wrapper = createWrapper();

    const { rerender, unmount } = await renderHook(
      ({ query }: { query: string }) => usePersonSearch(query),
      { wrapper, initialProps: { query: "" } },
    );
    await rerender({ query: "jane" });

    await act(async () => {
      jest.advanceTimersByTime(249);
    });
    expect(mockSearchPerson).not.toHaveBeenCalled();

    await unmount();
  });

  it("calls searchPerson with the query once 250ms have elapsed, and resolves with its data", async () => {
    const results = [{ id: 5, name: "Jane Director" }];
    mockSearchPerson.mockResolvedValue({ data: results, error: null });
    const usePersonSearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => usePersonSearch("jane"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchPerson).toHaveBeenCalledWith("jane");
    expect(result.current.data).toEqual(results);
  });

  it("does not query at all for an empty/whitespace-only query string", async () => {
    const usePersonSearch = loadHook();
    const wrapper = createWrapper();

    await renderHook(() => usePersonSearch("  "), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockSearchPerson).not.toHaveBeenCalled();
  });

  it("surfaces a searchPerson error through React Query's native error channel", async () => {
    const fakeError = { message: "edge function failed" };
    mockSearchPerson.mockResolvedValue({ data: null, error: fakeError });
    const usePersonSearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => usePersonSearch("jane"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});
