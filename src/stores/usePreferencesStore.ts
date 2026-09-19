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

interface PreferencesState {
  lastActiveTab: LastActiveTab;
  setLastActiveTab: (tab: LastActiveTab) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      lastActiveTab: null,
      setLastActiveTab: (tab) => set({ lastActiveTab: tab }),
    }),
    {
      name: "watchcrew-preferences",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
