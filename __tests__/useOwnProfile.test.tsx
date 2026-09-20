import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockGetOwnProfile = jest.fn();

jest.mock("@/lib/profile", () => ({
  getOwnProfile: mockGetOwnProfile,
}));

function loadUseOwnProfile() {
  return require("@/hooks/useOwnProfile").useOwnProfile;
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useOwnProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves the current user's own profile row", async () => {
    mockGetOwnProfile.mockResolvedValue({ data: { display_name: "robin" }, error: null });
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile("u1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ display_name: "robin" });
    expect(mockGetOwnProfile).toHaveBeenCalledWith("u1");
    await unmount();
  });

  it("stays disabled (no fetch) when userId is undefined", async () => {
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetOwnProfile).not.toHaveBeenCalled();
    await unmount();
  });

  it("surfaces an error via React Query's error channel", async () => {
    mockGetOwnProfile.mockResolvedValue({ data: null, error: { message: "boom" } });
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile("u1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: "boom" });
    await unmount();
  });
});
