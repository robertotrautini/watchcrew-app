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
    }),
    {
      name: "watchcrew-preferences",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
