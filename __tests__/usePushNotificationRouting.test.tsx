// M10 (part): tests for src/hooks/usePushNotificationRouting.ts -- both the
// live-listener tap path and, critically, the COLD-START path
// (`getLastNotificationResponseAsync`), which the task brief flags as the
// commonly-broken case in the legacy bugfix history. `expo-notifications`
// and `expo-router` are both mocked; no real native module/navigator
// involved.

import { renderHook, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockUseRouter = jest.fn(() => ({ push: mockPush }));
jest.mock("expo-router", () => ({
  useRouter: mockUseRouter,
}));

const mockGetLastNotificationResponseAsync = jest.fn();
const mockClearLastNotificationResponse = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockRemove = jest.fn();

jest.mock("expo-notifications", () => ({
  getLastNotificationResponseAsync: mockGetLastNotificationResponseAsync,
  clearLastNotificationResponse: mockClearLastNotificationResponse,
  addNotificationResponseReceivedListener: mockAddNotificationResponseReceivedListener,
}));

const mockEnsureQueryData = jest.fn();
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ ensureQueryData: mockEnsureQueryData }),
}));

const mockGetSession = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

jest.mock("@/lib/groups", () => ({ getUserGroups: jest.fn() }));

function loadStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}

function loadHook() {
  return require("@/hooks/usePushNotificationRouting").usePushNotificationRouting;
}

function fakeResponse(data: Record<string, unknown>) {
  return { notification: { request: { content: { data } } } };
}

describe("usePushNotificationRouting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLastNotificationResponseAsync.mockResolvedValue(null);
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: mockRemove });
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockEnsureQueryData.mockResolvedValue([{ group_id: "g1" }, { group_id: "g2" }]);
    loadStore().setState({ activeGroupId: "g1" });
  });

  describe("cold start (getLastNotificationResponseAsync)", () => {
    it("navigates to the movie-detail route with tmdbId/groupId/watchlistEntryId when a cold-start response exists", async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(
        fakeResponse({ tmdbId: 603, groupId: "g1", watchlistEntryId: "e1" }),
      );
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: "603", groupId: "g1", watchlistEntryId: "e1", source: "watchlist" },
      });
    });

    it("clears the last notification response after processing it (prevents re-firing on remount)", async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(fakeResponse({ tmdbId: 603 }));
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      await waitFor(() => expect(mockClearLastNotificationResponse).toHaveBeenCalled());
    });

    it("does not navigate when there is no cold-start response", async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(null);
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      await waitFor(() => expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("does not navigate when the payload has no tmdbId at all", async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(fakeResponse({ groupId: "g1" }));
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      await waitFor(() => expect(mockGetLastNotificationResponseAsync).toHaveBeenCalled());
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("live tap (addNotificationResponseReceivedListener)", () => {
    it("navigates when a live notification response arrives while the app is running", async () => {
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
      listener(fakeResponse({ tmdbId: 604, groupId: "g2" }));

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: "604", groupId: "g2" },
      });
    });

    it("unsubscribes the listener on unmount", async () => {
      const usePushNotificationRouting = loadHook();

      const { unmount } = await renderHook(() => usePushNotificationRouting());
      await unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  it("omits groupId/watchlistEntryId from the push params entirely when absent, rather than passing them as undefined", async () => {
    const usePushNotificationRouting = loadHook();

    await renderHook(() => usePushNotificationRouting());
    const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    listener(fakeResponse({ tmdbId: 605 }));

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/movie/[tmdbId]",
      params: { tmdbId: "605" },
    });
  });

  describe("active group switching", () => {
    const payload = { tmdbId: 700, groupId: "g2", watchlistEntryId: "e9" };

    it("sets the persisted active group from the payload before navigating when the user is a member", async () => {
      const usePushNotificationRouting = loadHook();
      await renderHook(() => usePushNotificationRouting());
      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];

      listener(fakeResponse(payload));

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(loadStore().getState().activeGroupId).toBe("g2");
      expect(mockPush).toHaveBeenCalledWith({
        pathname: "/movie/[tmdbId]",
        params: { tmdbId: "700", groupId: "g2", watchlistEntryId: "e9", source: "watchlist" },
      });
    });

    it("leaves the active group unchanged when the user is not a member of the payload group", async () => {
      mockEnsureQueryData.mockResolvedValue([{ group_id: "g1" }]);
      const usePushNotificationRouting = loadHook();
      await renderHook(() => usePushNotificationRouting());
      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];

      listener(fakeResponse(payload));

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(loadStore().getState().activeGroupId).toBe("g1");
    });

    it("still navigates when the group lookup fails", async () => {
      mockEnsureQueryData.mockRejectedValue(new Error("offline"));
      const usePushNotificationRouting = loadHook();
      await renderHook(() => usePushNotificationRouting());
      const listener = mockAddNotificationResponseReceivedListener.mock.calls[0][0];

      listener(fakeResponse(payload));

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(loadStore().getState().activeGroupId).toBe("g1");
    });

    it("switches the active group on the cold-start path too", async () => {
      mockGetLastNotificationResponseAsync.mockResolvedValue(fakeResponse(payload));
      const usePushNotificationRouting = loadHook();

      await renderHook(() => usePushNotificationRouting());

      await waitFor(() => expect(mockPush).toHaveBeenCalled());
      expect(loadStore().getState().activeGroupId).toBe("g2");
    });
  });
});
