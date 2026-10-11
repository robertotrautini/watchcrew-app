import { createQueryWrapper } from "../helpers/renderWithProviders";
import { renderHook, waitFor } from "@testing-library/react-native";

const mockGetUserGroups = jest.fn();

jest.mock("@/lib/groups", () => ({
  getUserGroups: mockGetUserGroups,
}));

// Lazily required (rather than statically imported) to dodge Babel's CJS
// hoisting of the `mockGetUserGroups`/`jest.mock` assignments above, matching
// the convention in __tests__/hooks/useAuthGate.test.tsx.
function loadUseUserGroups() {
  return require("@/hooks/useUserGroups").useUserGroups;
}

describe("useUserGroups", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls getUserGroups with the given userId", async () => {
    mockGetUserGroups.mockResolvedValue({ data: [{ group_id: "g1" }], error: null });
    const useUserGroups = loadUseUserGroups();

    await renderHook(() => useUserGroups("u1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(mockGetUserGroups).toHaveBeenCalledWith("u1"));
  });

  it("starts loading, then resolves data from the successful query", async () => {
    mockGetUserGroups.mockResolvedValue({
      data: [{ group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" }],
      error: null,
    });
    const useUserGroups = loadUseUserGroups();

    // Record the first render synchronously: asserting on result.current after
    // `await renderHook` races the mocked promise resolving.
    const loadingHistory: boolean[] = [];
    const { result } = await renderHook(
      () => {
        const query = useUserGroups("u1");
        loadingHistory.push(query.isLoading);
        return query;
      },
      { wrapper: createQueryWrapper() }
    );

    expect(loadingHistory[0]).toBe(true);

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { group_id: "g1", user_id: "u1", role: "owner", joined_at: "2026-01-01" },
      ])
    );
  });

  it("surfaces the Supabase-style { error } field through React Query's native error channel", async () => {
    const fakeError = { message: "network error" };
    mockGetUserGroups.mockResolvedValue({ data: null, error: fakeError });
    const useUserGroups = loadUseUserGroups();

    const { result } = await renderHook(() => useUserGroups("u1"), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(fakeError);
  });

  it("does not call getUserGroups when userId is undefined (query disabled)", async () => {
    const useUserGroups = loadUseUserGroups();

    await renderHook(() => useUserGroups(undefined), { wrapper: createQueryWrapper() });

    expect(mockGetUserGroups).not.toHaveBeenCalled();
  });
});
