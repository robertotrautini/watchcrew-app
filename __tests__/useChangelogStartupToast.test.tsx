// Inventory 2.8: ~1.5s after app start, a "Neue Features" toast (6s, tap opens
// the changelog) when the stored changelog version differs from the current.

import { act, renderHook } from "@testing-library/react-native";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockShowToast = jest.fn();
jest.mock("@/lib/toast", () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

function loadStore() {
  return require("@/stores/usePreferencesStore").usePreferencesStore;
}
function loadHook() {
  return require("@/hooks/useChangelogStartupToast").useChangelogStartupToast;
}
function currentVersion(): string {
  return require("@/lib/changelog").CURRENT_CHANGELOG_VERSION;
}

describe("useChangelogStartupToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows the toast 1.5s after mount when the changelog version is unseen", async () => {
    loadStore().setState({ lastSeenChangelogVersion: null });
    await renderHook(() => loadHook()());

    await act(async () => {
      jest.advanceTimersByTime(1499);
    });
    expect(mockShowToast).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      "Neue Features – Tippe, um das Changelog zu öffnen",
      expect.objectContaining({ durationMs: 6000, onPress: expect.any(Function) }),
    );
  });

  it("tapping the toast opens the changelog screen", async () => {
    loadStore().setState({ lastSeenChangelogVersion: "0.0.1" });
    await renderHook(() => loadHook()());
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    mockShowToast.mock.calls[0][1].onPress();

    expect(mockPush).toHaveBeenCalledWith("/settings/changelog");
  });

  it("does nothing when the current version was already seen", async () => {
    loadStore().setState({ lastSeenChangelogVersion: currentVersion() });
    await renderHook(() => loadHook()());

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("does not show the toast if unmounted before the delay", async () => {
    loadStore().setState({ lastSeenChangelogVersion: null });
    const { unmount } = await renderHook(() => loadHook()());
    await unmount();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("does not mark the version as seen by itself (only opening the changelog does)", async () => {
    loadStore().setState({ lastSeenChangelogVersion: null });
    await renderHook(() => loadHook()());
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(loadStore().getState().lastSeenChangelogVersion).toBeNull();
  });
});
