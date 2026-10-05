import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import React from "react";

const mockUpdateOwnDisplayName = jest.fn();

jest.mock("@/lib/profile", () => ({
  updateOwnDisplayName: mockUpdateOwnDisplayName,
}));

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = jest.spyOn(queryClient, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

describe("useUpdateDisplayName", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("saves the name and invalidates own profile and group member queries", async () => {
    mockUpdateOwnDisplayName.mockResolvedValue({ data: null, error: null });
    const { useUpdateDisplayName } = require("@/hooks/useUpdateDisplayName");
    const { wrapper, invalidate } = setup();

    const { result, unmount } = await renderHook(() => useUpdateDisplayName(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("Robin");
    });

    expect(mockUpdateOwnDisplayName).toHaveBeenCalledWith("Robin");
    const keys = invalidate.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);
    expect(keys).toEqual(expect.arrayContaining(["ownProfile", "groupDetails", "groupMembers", "watchlist"]));
    await unmount();
  });

  it("routes a Supabase error into the mutation error channel", async () => {
    mockUpdateOwnDisplayName.mockResolvedValue({ data: null, error: { message: "boom" } });
    const { useUpdateDisplayName } = require("@/hooks/useUpdateDisplayName");
    const { wrapper } = setup();

    const { result, unmount } = await renderHook(() => useUpdateDisplayName(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("Robin").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    await unmount();
  });
});
