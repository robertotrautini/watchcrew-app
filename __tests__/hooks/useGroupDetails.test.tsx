import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

const mockGetWatchGroupDetails = jest.fn();
const mockGetWatchGroupsByIds = jest.fn();

jest.mock("@/lib/groups", () => ({
  getWatchGroupDetails: mockGetWatchGroupDetails,
  getWatchGroupsByIds: mockGetWatchGroupsByIds,
}));

// Lazily required, same Babel CJS-hoisting reason as __tests__/hooks/useUserGroups.test.tsx.
function loadUseGroupDetails() {
  return require("@/hooks/useGroupDetails").useGroupDetails;
}

function loadUseGroupNames() {
  return require("@/hooks/useGroupDetails").useGroupNames;
}

describe("useGroupDetails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getWatchGroupDetails with the given groupId", async () => {
    mockGetWatchGroupDetails.mockResolvedValue({
      data: { id: "g1", name: "Filmfreunde", color_theme: "gold", invite_token: "tok-1", invite_enabled: true },
      error: null,
    });
    const useGroupDetails = loadUseGroupDetails();

    const { unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(mockGetWatchGroupDetails).toHaveBeenCalledWith("g1"));
    await unmount();
  });

  it("resolves the group's own row from the successful query", async () => {
    mockGetWatchGroupDetails.mockResolvedValue({
      data: { id: "g1", name: "Filmfreunde", color_theme: "blue", invite_token: "tok-1", invite_enabled: true },
      error: null,
    });
    const useGroupDetails = loadUseGroupDetails();

    const { result, unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.data?.name).toBe("Filmfreunde"));
    expect(result.current.data?.color_theme).toBe("blue");
    await unmount();
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetWatchGroupDetails.mockResolvedValue({ data: null, error: fakeError });
    const useGroupDetails = loadUseGroupDetails();

    const { result, unmount } = await renderHook(() => useGroupDetails("g1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    await unmount();
  });

  it("does not call getWatchGroupDetails when groupId is undefined (query disabled)", async () => {
    const useGroupDetails = loadUseGroupDetails();

    const { unmount } = await renderHook(() => useGroupDetails(undefined), { wrapper: createQueryWrapper() });

    expect(mockGetWatchGroupDetails).not.toHaveBeenCalled();
    await unmount();
  });
});

describe("useGroupNames", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getWatchGroupsByIds with the given group ids", async () => {
    mockGetWatchGroupsByIds.mockResolvedValue({
      data: [{ id: "g1", name: "Filmfreunde" }, { id: "g2", name: "Kinoclub" }],
      error: null,
    });
    const useGroupNames = loadUseGroupNames();

    const { unmount } = await renderHook(() => useGroupNames(["g1", "g2"]), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(mockGetWatchGroupsByIds).toHaveBeenCalledWith(["g1", "g2"]));
    await unmount();
  });

  it("resolves the groups' rows from the successful query", async () => {
    mockGetWatchGroupsByIds.mockResolvedValue({
      data: [{ id: "g1", name: "Filmfreunde" }],
      error: null,
    });
    const useGroupNames = loadUseGroupNames();

    const { result, unmount } = await renderHook(() => useGroupNames(["g1"]), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.data).toEqual([{ id: "g1", name: "Filmfreunde" }]));
    await unmount();
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetWatchGroupsByIds.mockResolvedValue({ data: null, error: fakeError });
    const useGroupNames = loadUseGroupNames();

    const { result, unmount } = await renderHook(() => useGroupNames(["g1"]), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    await unmount();
  });

  it("does not call getWatchGroupsByIds for an empty id list (query disabled)", async () => {
    const useGroupNames = loadUseGroupNames();

    const { unmount } = await renderHook(() => useGroupNames([]), { wrapper: createQueryWrapper() });

    expect(mockGetWatchGroupsByIds).not.toHaveBeenCalled();
    await unmount();
  });
});
