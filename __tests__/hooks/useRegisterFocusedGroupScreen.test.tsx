// M10 (Realtime foreground sync, ADR 0006): src/hooks/useRegisterFocusedGroupScreen.ts
// -- the small shared hook the three tabs (Watchlist/Tagebuch/Tracker) call
// to announce "I'm the currently-focused screen for group X" via
// expo-router's `useFocusEffect`, backing src/stores/useFocusedGroupScreen.ts.
//
// `useFocusEffect` itself is mocked to the simplest faithful approximation
// this environment allows: run the effect once on mount, run its cleanup
// once on unmount -- exactly the two lifecycle moments this hook's own
// contract (register on focus, unregister on blur) cares about. Real
// navigation re-focus/re-blur cycling (tab-switch-and-back without
// unmounting) is NOT exercised by these tests -- see the task's note that
// visual/live navigation behavior can't be verified headlessly here.

import { renderHook } from "@testing-library/react-native";

jest.mock("expo-router", () => require("../helpers/mockRouter").createExpoRouterMock());

import { useFocusedGroupScreen } from "@/stores/useFocusedGroupScreen";
import { useRegisterFocusedGroupScreen } from "@/hooks/useRegisterFocusedGroupScreen";

describe("useRegisterFocusedGroupScreen", () => {
  afterEach(() => {
    useFocusedGroupScreen.setState({ focusedGroupId: null });
  });

  it("registers the given group id as focused on mount", async () => {
    await renderHook(() => useRegisterFocusedGroupScreen("group-1"));
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBe("group-1");
  });

  it("registers null when no group id is given yet (e.g. still loading)", async () => {
    await renderHook(() => useRegisterFocusedGroupScreen(undefined));
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBeNull();
  });

  it("unregisters (back to null) on unmount", async () => {
    const { unmount } = await renderHook(() => useRegisterFocusedGroupScreen("group-1"));
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBe("group-1");

    await unmount();

    expect(useFocusedGroupScreen.getState().focusedGroupId).toBeNull();
  });
});
