import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

// M7 part 2 (Add-Movie-Modal), Studio mode: debounced company autocomplete
// via the `search_company` tmdb-proxy action (already scored server-side by
// fuzzy+prefix+logo bonus, M6). Debounce timing wasn't specified in the
// source doc for Studio mode (only Film=350ms, Regisseur/Besetzung=250ms
// were given) -- resolved interim decision: 300ms (between the two given
// values), logged in docs/interim-decisions.md.

const mockSearchCompany = jest.fn();
jest.mock("@/lib/tmdbProxy", () => ({
  searchCompany: (...args: unknown[]) => mockSearchCompany(...args),
}));

function loadHook() {
  return require("@/hooks/useCompanySearch").useCompanySearch;
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

describe("useCompanySearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
  });

  it("does not call searchCompany before the 300ms debounce elapses, once the query changes", async () => {
    mockSearchCompany.mockResolvedValue({ data: [], error: null });
    const useCompanySearch = loadHook();
    const wrapper = createWrapper();

    const { rerender, unmount } = await renderHook(
      ({ query }: { query: string }) => useCompanySearch(query),
      { wrapper, initialProps: { query: "" } },
    );
    await rerender({ query: "studio nine" });

    await act(async () => {
      jest.advanceTimersByTime(299);
    });
    expect(mockSearchCompany).not.toHaveBeenCalled();

    await unmount();
  });

  it("calls searchCompany with the query once 300ms have elapsed, and resolves with its data", async () => {
    const results = [{ id: 9, name: "Studio Nine" }];
    mockSearchCompany.mockResolvedValue({ data: results, error: null });
    const useCompanySearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => useCompanySearch("studio nine"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchCompany).toHaveBeenCalledWith("studio nine");
    expect(result.current.data).toEqual(results);
  });

  it("does not query at all for an empty/whitespace-only query string", async () => {
    const useCompanySearch = loadHook();
    const wrapper = createWrapper();

    await renderHook(() => useCompanySearch("  "), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(mockSearchCompany).not.toHaveBeenCalled();
  });

  it("surfaces a searchCompany error through React Query's native error channel", async () => {
    const fakeError = { message: "edge function failed" };
    mockSearchCompany.mockResolvedValue({ data: null, error: fakeError });
    const useCompanySearch = loadHook();
    const wrapper = createWrapper();

    const { result } = await renderHook(() => useCompanySearch("studio nine"), { wrapper });

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});
