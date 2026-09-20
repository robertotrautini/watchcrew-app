import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { useFocusedGroupScreen } from "@/stores/useFocusedGroupScreen";

/**
 * M10 (Realtime foreground sync, ADR 0006): registers the CALLING screen as
 * "the screen currently showing this group's watchlist data" while it's
 * focused, and unregisters (back to `null`) on blur/unmount. Called by each
 * of the three tabs that share `useGroupWatchlist`'s data
 * (Watchlist/Tagebuch/Tracker — see src/hooks/useGroupWatchlist.ts), right
 * alongside their own `useGroupRealtimeSync(activeGroupId)` call.
 *
 * `src/hooks/useGroupRealtimeSync.ts` reads the resulting store value (via
 * `.getState()`, outside React) to decide "is the user already looking at
 * this, i.e. silent cache-refresh is enough" vs. "show a toast" — see
 * src/stores/useFocusedGroupScreen.ts's own module comment for the full
 * reasoning.
 */
export function useRegisterFocusedGroupScreen(groupId: string | undefined): void {
  const setFocusedGroupId = useFocusedGroupScreen((state) => state.setFocusedGroupId);

  useFocusEffect(
    useCallback(() => {
      setFocusedGroupId(groupId ?? null);
      return () => {
        setFocusedGroupId(null);
      };
    }, [groupId, setFocusedGroupId]),
  );
}
