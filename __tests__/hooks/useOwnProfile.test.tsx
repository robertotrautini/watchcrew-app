import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

const mockGetOwnProfile = jest.fn();

jest.mock("@/lib/profile", () => ({
  getOwnProfile: mockGetOwnProfile,
}));

function loadUseOwnProfile() {
  return require("@/hooks/useOwnProfile").useOwnProfile;
}

describe("useOwnProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves the current user's own profile row", async () => {
    mockGetOwnProfile.mockResolvedValue({ data: { display_name: "robin" }, error: null });
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile("u1"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ display_name: "robin" });
    expect(mockGetOwnProfile).toHaveBeenCalledWith("u1");
    await unmount();
  });

  it("stays disabled (no fetch) when userId is undefined", async () => {
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile(undefined), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockGetOwnProfile).not.toHaveBeenCalled();
    await unmount();
  });

  it("surfaces an error via React Query's error channel", async () => {
    mockGetOwnProfile.mockResolvedValue({ data: null, error: { message: "boom" } });
    const useOwnProfile = loadUseOwnProfile();

    const { result, unmount } = await renderHook(() => useOwnProfile("u1"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: "boom" });
    await unmount();
  });
});
