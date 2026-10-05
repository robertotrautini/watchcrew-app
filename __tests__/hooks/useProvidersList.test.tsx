import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetProvidersList = jest.fn();

jest.mock("@/lib/tmdbProxy", () => ({
  getProvidersList: mockGetProvidersList,
}));

function loadUseProvidersList() {
  return require("@/hooks/useProvidersList").useProvidersList;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useProvidersList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves with the DE provider catalog on success", async () => {
    const providers = [
      { provider_id: 8, provider_name: "Netflix" },
      { provider_id: 337, provider_name: "Disney Plus" },
    ];
    mockGetProvidersList.mockResolvedValue({ data: providers, error: null });
    const useProvidersList = loadUseProvidersList();

    const { result, unmount } = await renderHook(() => useProvidersList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(providers);
    await unmount();
  });

  it("defaults to an empty array when the proxy resolves with null data", async () => {
    mockGetProvidersList.mockResolvedValue({ data: null, error: null });
    const useProvidersList = loadUseProvidersList();

    const { result, unmount } = await renderHook(() => useProvidersList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    await unmount();
  });

  it("surfaces a proxy error via React Query's error channel", async () => {
    mockGetProvidersList.mockResolvedValue({ data: null, error: { message: "boom" } });
    const useProvidersList = loadUseProvidersList();

    const { result, unmount } = await renderHook(() => useProvidersList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: "boom" });
    await unmount();
  });
});
