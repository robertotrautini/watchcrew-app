import { AppState } from "react-native";
import { act, renderHook, waitFor } from "@testing-library/react-native";

const mockGetPermissionsAsync = jest.fn();
jest.mock("expo-notifications", () => ({
  getPermissionsAsync: (...a: unknown[]) => mockGetPermissionsAsync(...a),
}));

let mockAppStateListener: ((s: string) => void) | null = null;
const mockRemove = jest.fn();
jest.spyOn(AppState, "addEventListener").mockImplementation(((_e: string, cb: (s: string) => void) => {
  mockAppStateListener = cb;
  return { remove: mockRemove };
}) as never);

function load() {
  return require("@/hooks/usePushPermissionStatus").usePushPermissionStatus;
}

describe("usePushPermissionStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStateListener = null;
  });

  it("reports 'denied' when the OS permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "denied" });
    const { result } = await renderHook(() => load()());
    await waitFor(() => expect(result.current).toBe("denied"));
  });

  it("reports 'granted' when granted", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    const { result } = await renderHook(() => load()());
    await waitFor(() => expect(result.current).toBe("granted"));
  });

  it("re-checks when the app returns to the foreground (user came back from system settings)", async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: "denied" });
    const { result } = await renderHook(() => load()());
    await waitFor(() => expect(result.current).toBe("denied"));

    mockGetPermissionsAsync.mockResolvedValueOnce({ status: "granted" });
    await act(async () => {
      mockAppStateListener?.("active");
    });
    await waitFor(() => expect(result.current).toBe("granted"));
  });

  it("falls back to 'unknown' if the permission lookup throws", async () => {
    mockGetPermissionsAsync.mockRejectedValue(new Error("nope"));
    const { result } = await renderHook(() => load()());
    await waitFor(() => expect(mockGetPermissionsAsync).toHaveBeenCalled());
    expect(result.current).toBe("unknown");
  });
});
