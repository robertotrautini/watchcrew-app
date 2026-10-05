import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetCollection = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getCollection: mockGetCollection,
}));

// Lazily required to dodge Babel's CJS hoisting of the mock assignment
// above, matching the convention in __tests__/useGroupWatchlist.test.tsx.
function loadUseCollection() {
  return require("@/hooks/useCollection").useCollection;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useCollection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches the collection via getCollection and resolves its data", async () => {
    const collection = { id: 99, name: "Collection", parts: [] };
    mockGetCollection.mockResolvedValue({ data: collection, error: null });
    const useCollection = loadUseCollection();

    const { result } = await renderHook(() => useCollection(42, 99), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(collection));
    expect(mockGetCollection).toHaveBeenCalledWith(42, 99);
  });

  it("surfaces an error through React Query's native error channel", async () => {
    const fakeError = { message: "boom" };
    mockGetCollection.mockResolvedValue({ data: null, error: fakeError });
    const useCollection = loadUseCollection();

    const { result } = await renderHook(() => useCollection(42, 99), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not fetch when tmdbId is undefined", async () => {
    const useCollection = loadUseCollection();

    await renderHook(() => useCollection(undefined, 99), { wrapper: createWrapper() });

    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  it("does not fetch when collectionId is undefined", async () => {
    const useCollection = loadUseCollection();

    await renderHook(() => useCollection(42, undefined), { wrapper: createWrapper() });

    expect(mockGetCollection).not.toHaveBeenCalled();
  });
});
