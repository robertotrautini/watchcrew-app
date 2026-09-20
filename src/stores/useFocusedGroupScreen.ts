import { create } from "zustand";

/**
 * M10 (Realtime foreground sync, ADR 0006): tracks which Watch-Group the
 * user is CURRENTLY looking at, on one of the three screens whose data
 * comes from `useGroupWatchlist`'s `["watchlist", groupId]` query
 * (Watchlist/Tagebuch/Tracker — see src/hooks/useGroupWatchlist.ts). Those
 * three screens call `setFocusedGroupId(activeGroupId)` on focus (via
 * expo-router's `useFocusEffect`) and `setFocusedGroupId(null)` on blur.
 *
 * `src/hooks/useGroupRealtimeSync.ts` reads this via `.getState()` (a
 * vanilla Zustand read, outside any React render) at the moment a Realtime
 * change event arrives, to decide "is the user already looking at this,
 * i.e. silent cache-refresh is enough" vs. "show a toast".
 *
 * Deliberately a separate, NOT-persisted store from
 * src/stores/usePreferencesStore.ts — this is transient UI state (what's on
 * screen right now), not a preference that should survive an app restart.
 */
export interface FocusedGroupScreenState {
  focusedGroupId: string | null;
  setFocusedGroupId: (groupId: string | null) => void;
}

export const useFocusedGroupScreen = create<FocusedGroupScreenState>((set) => ({
  focusedGroupId: null,
  setFocusedGroupId: (groupId) => set({ focusedGroupId: groupId }),
}));
