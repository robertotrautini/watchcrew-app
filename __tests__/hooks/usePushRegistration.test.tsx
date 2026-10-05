// M10 (part): tests for src/hooks/usePushRegistration.ts -- permission
// request flow, token persistence, and the "no userId yet" / "permission
// denied" no-op branches. `expo-notifications` and
// src/lib/pushTokens.ts are both mocked; no real native module or Supabase
// call is ever involved.

import { renderHook, waitFor } from "@testing-library/react-native";

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock("expo-notifications", () => ({
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  AndroidImportance: { DEFAULT: 3 },
}));

const mockUpsertPushToken = jest.fn();
jest.mock("@/lib/pushTokens", () => ({
  upsertPushToken: mockUpsertPushToken,
}));

// Lazily required, same Babel-CJS-hoisting-dodge convention as
// __tests__/hooks/useCurrentUserId.test.tsx.
function loadUsePushRegistration() {
  return require("@/hooks/usePushRegistration").usePushRegistration;
}

describe("usePushRegistration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissionsAsync.mockResolvedValue({ status: "granted" });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: "ExponentPushToken[abc]" });
    mockUpsertPushToken.mockResolvedValue({ data: {}, error: null });
  });

  it("does nothing when userId is undefined", async () => {
    const usePushRegistration = loadUsePushRegistration();

    await renderHook(() => usePushRegistration(undefined));

    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    expect(mockUpsertPushToken).not.toHaveBeenCalled();
  });

  it("registers and persists the token when permission is already granted", async () => {
    const usePushRegistration = loadUsePushRegistration();

    await renderHook(() => usePushRegistration("user-1"));

    await waitFor(() => expect(mockUpsertPushToken).toHaveBeenCalled());

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockUpsertPushToken).toHaveBeenCalledWith({
      userId: "user-1",
      expoPushToken: "ExponentPushToken[abc]",
    });
  });

  it("requests permission when not already granted, and proceeds if the user then grants it", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "granted" });
    const usePushRegistration = loadUsePushRegistration();

    await renderHook(() => usePushRegistration("user-1"));

    await waitFor(() => expect(mockUpsertPushToken).toHaveBeenCalled());
    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
  });

  it("does not fetch a token or persist anything when permission is denied", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: "undetermined" });
    mockRequestPermissionsAsync.mockResolvedValue({ status: "denied" });
    const usePushRegistration = loadUsePushRegistration();

    await renderHook(() => usePushRegistration("user-1"));

    await waitFor(() => expect(mockRequestPermissionsAsync).toHaveBeenCalled());
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockUpsertPushToken).not.toHaveBeenCalled();
  });

  it("swallows a getExpoPushTokenAsync rejection instead of throwing (e.g. no EAS projectId configured)", async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error("No projectId found"));
    const usePushRegistration = loadUsePushRegistration();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await renderHook(() => usePushRegistration("user-1"));

    await waitFor(() => expect(mockGetExpoPushTokenAsync).toHaveBeenCalled());
    expect(mockUpsertPushToken).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("logs a warning (does not throw) when persisting the token fails", async () => {
    mockUpsertPushToken.mockResolvedValue({ data: null, error: { message: "boom" } });
    const usePushRegistration = loadUsePushRegistration();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await renderHook(() => usePushRegistration("user-1"));

    await waitFor(() => expect(mockUpsertPushToken).toHaveBeenCalled());
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });
});
