// M10 (Realtime foreground sync, ADR 0006): the tiny, NOT-persisted Zustand
// store the three tabs (Watchlist/Tagebuch/Tracker) use to announce "I'm
// currently the visible screen for group X" (via `useFocusEffect`) and
// unannounce it on blur. src/hooks/useGroupRealtimeSync.ts reads this
// (via `.getState()`, outside React) to decide silent-update vs. toast.
//
// Deliberately NOT wired through src/stores/usePreferencesStore.ts's
// persist() middleware -- this is transient "what's on screen right now"
// state, not a user preference that should survive an app restart (and
// persisting it would also risk a stale group id lingering across app
// launches with no screen actually mounted to clear it). See
// docs/interim-decisions.md "M10 — Fokus-Tracking-Mechanismus".

import { useFocusedGroupScreen } from "@/stores/useFocusedGroupScreen";

describe("useFocusedGroupScreen", () => {
  afterEach(() => {
    useFocusedGroupScreen.setState({ focusedGroupId: null });
  });

  it("starts with no focused group", () => {
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBeNull();
  });

  it("records the focused group id via setFocusedGroupId", () => {
    useFocusedGroupScreen.getState().setFocusedGroupId("group-1");
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBe("group-1");
  });

  it("clears the focused group id back to null on blur", () => {
    useFocusedGroupScreen.getState().setFocusedGroupId("group-1");
    useFocusedGroupScreen.getState().setFocusedGroupId(null);
    expect(useFocusedGroupScreen.getState().focusedGroupId).toBeNull();
  });
});
