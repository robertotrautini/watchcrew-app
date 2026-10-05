import { act, renderHook } from "@testing-library/react-native";

// Same plain Map-backed MMKV fake as __tests__/usePreferencesStore.test.ts /
// __tests__/screens/Tagebuch.test.tsx -- the real native module isn't
// available under Jest, and this hook pulls in the real (not mocked)
// usePreferencesStore.
jest.mock("react-native-mmkv", () => ({
  createMMKV: jest.fn().mockImplementation(() => {
    const map = new Map<string, string>();
    return {
      getString: (key: string) => map.get(key),
      set: (key: string, value: string) => map.set(key, value),
      remove: (key: string) => map.delete(key),
    };
  }),
}));

const mockUseUserGroups = jest.fn();
jest.mock("@/hooks/useUserGroups", () => ({
  useUserGroups: mockUseUserGroups,
}));

// Lazily required, same Babel CJS-hoisting reason as every other hook test
// in this repo (see __tests__/useUserGroups.test.tsx).
function loadUseActiveGroup() {
  return require("@/hooks/useActiveGroup").useActiveGroup;
}

function loadPreferencesStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

// This hook subscribes to the real (module-singleton) usePreferencesStore,
// so -- per this repo's documented RNTL gotcha -- every renderHook() here
// MUST be paired with an awaited unmount(). Without it, the previous test's
// still-mounted hook instance stays subscribed to the store; the next
// test's beforeEach `setState(...)` call then re-renders that leaked tree
// OUTSIDE of `act()`, which corrupts the test renderer's internal state for
// every subsequent test in this file (observed as `result.current` being
// `null` immediately after a later, otherwise-correct `renderHook()` call).
describe("useActiveGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ activeGroupId: null });
  });

  it("falls back to the first group when no active group id has ever been stored", async () => {
    mockUseUserGroups.mockReturnValue({
      data: [{ group_id: "g1" }, { group_id: "g2" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBe("g1");
    await unmount();
  });

  it("uses the stored active group id when it still refers to a group the user belongs to", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ activeGroupId: "g2" });
    mockUseUserGroups.mockReturnValue({
      data: [{ group_id: "g1" }, { group_id: "g2" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBe("g2");
    await unmount();
  });

  it("falls back to the first group when the stored active group id has gone stale (e.g. the user left that group)", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ activeGroupId: "left-this-group" });
    mockUseUserGroups.mockReturnValue({
      data: [{ group_id: "g1" }, { group_id: "g2" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBe("g1");
    await unmount();
  });

  it("falls back to the first group when the stored active group id refers to a hard-deleted group (no longer in the user's membership list at all)", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ activeGroupId: "hard-deleted-group" });
    mockUseUserGroups.mockReturnValue({
      data: [{ group_id: "g1" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBe("g1");
    await unmount();
  });

  it("returns undefined when the user has no group memberships at all, stored id or not", async () => {
    const usePreferencesStore = loadPreferencesStore();
    usePreferencesStore.setState({ activeGroupId: "some-stale-id" });
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBeUndefined();
    await unmount();
  });

  it("returns undefined while the underlying groups query is still loading", async () => {
    mockUseUserGroups.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null });
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.activeGroupId).toBeUndefined();
    await unmount();
  });

  it("setActiveGroup persists the chosen group id to the preferences store, and the same hook instance re-resolves to it", async () => {
    mockUseUserGroups.mockReturnValue({
      data: [{ group_id: "g1" }, { group_id: "g2" }],
      isLoading: false,
      isError: false,
      error: null,
    });
    const useActiveGroup = loadUseActiveGroup();
    const usePreferencesStore = loadPreferencesStore();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));
    expect(result.current.activeGroupId).toBe("g1");

    await act(async () => {
      result.current.setActiveGroup("g2");
    });

    expect(usePreferencesStore.getState().activeGroupId).toBe("g2");
    expect(result.current.activeGroupId).toBe("g2");
    await unmount();
  });

  it("exposes the underlying groupsQuery so callers can branch on isLoading/isError themselves", async () => {
    const fakeQuery = {
      data: [{ group_id: "g1" }],
      isLoading: false,
      isError: false,
      error: null,
    };
    mockUseUserGroups.mockReturnValue(fakeQuery);
    const useActiveGroup = loadUseActiveGroup();

    const { result, unmount } = await renderHook(() => useActiveGroup("u1"));

    expect(result.current.groupsQuery).toBe(fakeQuery);
    await unmount();
  });

  it("passes the given userId through to useUserGroups", async () => {
    mockUseUserGroups.mockReturnValue({ data: [], isLoading: false, isError: false, error: null });
    const useActiveGroup = loadUseActiveGroup();

    const { unmount } = await renderHook(() => useActiveGroup("some-user-id"));

    expect(mockUseUserGroups).toHaveBeenCalledWith("some-user-id");
    await unmount();
  });
});
