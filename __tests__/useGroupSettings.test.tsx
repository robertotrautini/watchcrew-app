// M9 part 2: mutation tests for src/hooks/useGroupSettings.ts, mirroring the
// mocking convention in __tests__/useTrackerPayments.test.tsx.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockRenameWatchGroup = jest.fn();
const mockSetInviteEnabled = jest.fn();
const mockRegenerateInviteToken = jest.fn();
const mockRemoveMember = jest.fn();

jest.mock("@/lib/groups", () => ({
  renameWatchGroup: mockRenameWatchGroup,
  setInviteEnabled: mockSetInviteEnabled,
  regenerateInviteToken: mockRegenerateInviteToken,
  removeMember: mockRemoveMember,
}));

function loadHooks() {
  return require("@/hooks/useGroupSettings");
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const wrapper = function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
  return { wrapper, queryClient };
}

describe("useRenameGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renames the group and invalidates its groupDetails cache on success", async () => {
    mockRenameWatchGroup.mockResolvedValue({ data: null, error: null });
    const { useRenameGroup } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useRenameGroup(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", newName: "Neuer Name" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRenameWatchGroup).toHaveBeenCalledWith("g1", "Neuer Name");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupDetails", "g1"] });
    // The "Deine Gruppen" switcher reads ["userGroups", userId] (group name embedded there).
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups"] });
  });

  it("surfaces a rename error through React Query's error channel without invalidating the cache", async () => {
    const fakeError = { message: "rls denied" };
    mockRenameWatchGroup.mockResolvedValue({ data: null, error: fakeError });
    const { useRenameGroup } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useRenameGroup(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", newName: "Neuer Name" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useSetInviteEnabled", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("toggles invite_enabled and invalidates the groupDetails cache on success", async () => {
    mockSetInviteEnabled.mockResolvedValue({ data: null, error: null });
    const { useSetInviteEnabled } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useSetInviteEnabled(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", enabled: false });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSetInviteEnabled).toHaveBeenCalledWith("g1", false);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupDetails", "g1"] });
  });
});

describe("useRegenerateInviteToken", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("regenerates the invite token and invalidates the groupDetails cache on success", async () => {
    mockRegenerateInviteToken.mockResolvedValue({ data: { inviteToken: "new-token" }, error: null });
    const { useRegenerateInviteToken } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useRegenerateInviteToken(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRegenerateInviteToken).toHaveBeenCalledWith("g1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupDetails", "g1"] });
  });

  it("surfaces a non-owner (WC004) error through React Query's error channel", async () => {
    const fakeError = { message: "requires group ownership", code: "WC004" };
    mockRegenerateInviteToken.mockResolvedValue({ data: null, error: fakeError });
    const { useRegenerateInviteToken } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useRegenerateInviteToken(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});

describe("useRemoveMember", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes the member and invalidates only that group's groupMembers cache on success", async () => {
    mockRemoveMember.mockResolvedValue({ data: null, error: null });
    const { useRemoveMember } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useRemoveMember(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", userId: "u2" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemoveMember).toHaveBeenCalledWith("g1", "u2");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "g1"] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ["userGroups", "u2"] });
  });

  it("surfaces a kick error (e.g. non-owner blocked by RLS) through React Query's error channel", async () => {
    const fakeError = { message: "rls denied" };
    mockRemoveMember.mockResolvedValue({ data: null, error: fakeError });
    const { useRemoveMember } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useRemoveMember(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", userId: "u2" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});

describe("useLeaveGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("removes the caller's own membership and invalidates BOTH that group's members and the caller's own userGroups cache", async () => {
    mockRemoveMember.mockResolvedValue({ data: null, error: null });
    const { useLeaveGroup } = loadHooks();
    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

    const { result } = await renderHook(() => useLeaveGroup(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", userId: "u1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRemoveMember).toHaveBeenCalledWith("g1", "u1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["groupMembers", "g1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["userGroups", "u1"] });
  });

  it("surfaces a leave error through React Query's error channel", async () => {
    const fakeError = { message: "network error" };
    mockRemoveMember.mockResolvedValue({ data: null, error: fakeError });
    const { useLeaveGroup } = loadHooks();
    const { wrapper } = createWrapper();

    const { result } = await renderHook(() => useLeaveGroup(), { wrapper });

    await act(async () => {
      result.current.mutate({ groupId: "g1", userId: "u1" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });
});
