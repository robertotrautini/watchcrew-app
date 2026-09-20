import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { mmkvStorage } from "@/lib/mmkvStorage";

/**
 * The tab the user was last on in the main (app)/(tabs) navigator.
 * `null` means no preference has been recorded yet (e.g. first launch).
 *
 * This is a genuine UI/client preference, not server data — it is safe to
 * persist to disk under this project's server-state-never-persisted rule.
 */
export type LastActiveTab = "tracker" | "watchlist" | "tagebuch" | null;

/**
 * The view mode the Watchlist tab is currently displayed in. This is a
 * shared/global preference (not per-group, not per-user-in-a-group) — it is
 * the same across every watch group the user is a member of.
 */
export type WatchlistViewMode = "cards" | "grid" | "list";

/**
 * The view mode the Tagebuch (diary) tab is currently displayed in. Same
 * shared/global-not-per-group convention as `WatchlistViewMode` above.
 */
export type DiaryViewMode = "cards" | "grid" | "list";

interface PreferencesState {
  lastActiveTab: LastActiveTab;
  setLastActiveTab: (tab: LastActiveTab) => void;
  watchlistViewMode: WatchlistViewMode;
  setWatchlistViewMode: (mode: WatchlistViewMode) => void;
  diaryViewMode: DiaryViewMode;
  setDiaryViewMode: (mode: DiaryViewMode) => void;
  /**
   * The Watch-Group id the user last explicitly picked as "active" (M9 part 2
   * Group-Settings switcher). `null` means no explicit choice has been made
   * yet (e.g. first launch, or before M9 part 2 existed). This is a genuine
   * client preference, not a cache of server data — `src/hooks/useActiveGroup.ts`
   * is the one place that reads it AND validates it against the user's real,
   * current group memberships (a stored id can go stale if the user left
   * that group, or it was hard-deleted by the 2-week retention job), falling
   * back to the first group from `useUserGroups()` whenever it's null or
   * stale. Screens should always go through that hook, never read this field
   * directly.
   */
  activeGroupId: string | null;
  setActiveGroupId: (groupId: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      lastActiveTab: null,
      setLastActiveTab: (tab) => set({ lastActiveTab: tab }),
      watchlistViewMode: "cards",
      setWatchlistViewMode: (mode) => set({ watchlistViewMode: mode }),
      diaryViewMode: "cards",
      setDiaryViewMode: (mode) => set({ diaryViewMode: mode }),
      activeGroupId: null,
      setActiveGroupId: (groupId) => set({ activeGroupId: groupId }),
    }),
    {
      name: "watchcrew-preferences",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
