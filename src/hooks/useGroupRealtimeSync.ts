import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState } from "react-native";

import type { GroupWatchlistData } from "@/hooks/useGroupWatchlist";
import {
  classifyRatingsChange,
  classifyWatchlistEntriesChange,
  extractWatchlistEntryId,
  REALTIME_TOAST_COPY,
  type RealtimeChangeKind,
} from "@/lib/realtimeSync";
import { supabase } from "@/lib/supabase";
import { showToast } from "@/lib/toast";
import { useFocusedGroupScreen } from "@/stores/useFocusedGroupScreen";

/**
 * M10 (Realtime foreground sync) — implements the two client-side branches
 * of ADR 0006's three-way behavior table for the active group's
 * `watchlist_entries`/`ratings` data (the third branch, background/closed ->
 * real push, is entirely the parallel Push-infrastructure task's job; this
 * hook does nothing at all in that case, on purpose):
 *
 *   | Recipient state                                   | Behavior         |
 *   |----------------------------------------------------|-----------------|
 *   | foreground AND on the affected screen               | silent update   |
 *   | foreground, on a DIFFERENT screen                    | in-app toast    |
 *   | background/closed                                    | (not this hook) |
 *
 * "The affected screen" = one of Watchlist/Tagebuch/Tracker showing this
 * SAME group (all three read the same `["watchlist", groupId]` query, see
 * useGroupWatchlist.ts) — tracked via src/stores/useFocusedGroupScreen.ts,
 * which those three screens update on focus/blur via expo-router's
 * `useFocusEffect`.
 *
 * Filtering approach per table (see src/lib/realtimeSync.ts's module
 * comment for the full reasoning):
 *  - `watchlist_entries` has its own `group_id` column, so the Realtime
 *    subscription itself is server-side filtered: `group_id=eq.<groupId>`.
 *  - `ratings` has NO `group_id` column (see the M1 schema) — a `ratings`
 *    row only carries `watchlist_entry_id`. Realtime's `filter` option only
 *    supports a fixed column-comparison string, not a join, so there is no
 *    way to filter this subscription to "ratings belonging to group X" at
 *    the server. Instead this hook subscribes to ALL `ratings` changes
 *    (every group, every user of the app) and checks membership
 *    CLIENT-SIDE: does the changed row's `watchlist_entry_id` appear in the
 *    already-fetched `["watchlist", groupId]` cache for the active group?
 *    If the cache isn't populated yet (screen hasn't finished its first
 *    fetch), the event is dropped rather than guessed at — a normal app
 *    session always fetches the watchlist before rendering any of the
 *    three tabs, so this window is effectively just "before first paint".
 *    An alternative (a `watchlist_entry_id=in.(id1,id2,...)` filter, which
 *    Realtime DOES support) was considered and rejected: it would need the
 *    channel's filter re-created every time the group's entry list changes
 *    (a new movie added/removed), which is significantly more moving parts
 *    for a small, chatty group app where an unfiltered `ratings` stream is
 *    cheap. See docs/interim-decisions.md "M10 — Realtime-Filterung für
 *    `ratings`".
 */
export function useGroupRealtimeSync(groupId: string | undefined): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) {
      return;
    }

    function handleRelevantChange(kind: RealtimeChangeKind) {
      queryClient.invalidateQueries({ queryKey: ["watchlist", groupId] });

      const isOnAffectedScreen = useFocusedGroupScreen.getState().focusedGroupId === groupId;
      const isAppForeground = AppState.currentState === "active";
      const toastMessage = REALTIME_TOAST_COPY[kind];

      if (!isOnAffectedScreen && isAppForeground && toastMessage) {
        showToast(toastMessage);
      }
      // Background/closed: intentionally nothing further happens here —
      // that's the parallel Push-infrastructure task's delivery path.
    }

    const channel = supabase
      .channel(`group-realtime-sync-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "watchlist_entries", filter: `group_id=eq.${groupId}` },
        (payload) => handleRelevantChange(classifyWatchlistEntriesChange(payload)),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        (payload) => {
          const watchlistEntryId = extractWatchlistEntryId(payload);
          const cached = queryClient.getQueryData<GroupWatchlistData>(["watchlist", groupId]);
          const belongsToActiveGroup =
            watchlistEntryId != null && (cached?.entries ?? []).some((entry) => entry.id === watchlistEntryId);
          if (!belongsToActiveGroup) {
            return;
          }
          handleRelevantChange(classifyRatingsChange(payload));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}
