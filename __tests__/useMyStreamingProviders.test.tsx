import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetRows = jest.fn();
const mockBatch = jest.fn();
jest.mock("@/lib/watchlist", () => ({
  getStreamingAvailabilityForTmdbIds: (...args: unknown[]) => mockGetRows(...args),
}));
jest.mock("@/lib/tmdbProxy", () => ({
  getMoviesProvidersBatch: (...args: unknown[]) => mockBatch(...args),
}));

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function load() {
  return require("@/hooks/useMyStreamingProviders").useMyStreamingProviders;
}

describe("useMyStreamingProviders", () => {
  beforeEach(() => jest.clearAllMocks());

  it("loads rows for all ids (read + refresh) and exposes a tmdbId -> providers map", async () => {
    mockGetRows.mockResolvedValue({ data: [], error: null });
    mockBatch.mockResolvedValue({
      data: { "1": { flatrate: [{ provider_id: 8 }], rent: [], buy: [] } },
      error: null,
    });
    const { result } = await renderHook(() => load()([2, 1, 1], true), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGetRows).toHaveBeenCalledWith([1, 2]);
    expect(mockBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch).toHaveBeenCalledWith([1, 2]);
    expect(result.current.data.get(1)).toEqual({ flatrate: [{ provider_id: 8 }], rent: [], buy: [] });
  });

  it("does nothing while disabled or without ids", async () => {
    await renderHook(() => load()([1], false), { wrapper: createWrapper() });
    await renderHook(() => load()([], true), { wrapper: createWrapper() });
    expect(mockGetRows).not.toHaveBeenCalled();
  });

  it("surfaces a read error through React Query", async () => {
    mockGetRows.mockResolvedValue({ data: null, error: { message: "rls" } });
    const { result } = await renderHook(() => load()([1], true), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("does not crash when an old/JSON-restored cache entry is `{}` (persisted Map)", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    queryClient.setQueryData(["streamingProviders", [1]], JSON.parse(JSON.stringify(new Map([[1, {}]]))));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(() => load()([1], true), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(typeof result.current.data.get).toBe("function");
    expect(result.current.data.get(1)).toBeUndefined();
  });

  it("keeps a JSON-safe shape in the query cache", async () => {
    mockGetRows.mockResolvedValue({ data: [], error: null });
    mockBatch.mockResolvedValue({
      data: { "1": { flatrate: [{ provider_id: 8 }], rent: [], buy: [] } },
      error: null,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = await renderHook(() => load()([1], true), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
    const cached = queryClient.getQueryCache().getAll()[0].state.data;
    expect(JSON.parse(JSON.stringify(cached))).toEqual(cached);
    expect(result.current.data.get(1)).toEqual({ flatrate: [{ provider_id: 8 }], rent: [], buy: [] });
  });
});
