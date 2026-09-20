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
  /**
   * M10 Settings hub: the TMDB provider ids the user picked under
   * "Meine Streaming-Dienste" (`src/app/(app)/(modals)/settings/streaming-services.tsx`).
   * A genuine PER-DEVICE UI preference, matching the legacy app's own
   * per-device localStorage behavior for this exact feature -- deliberately
   * NOT a Supabase-backed per-user setting (see docs/interim-decisions.md,
   * "M10 — Settings hub").
   */
  selectedStreamingProviderIds: number[];
  setSelectedStreamingProviderIds: (ids: number[]) => void;
  /**
   * M10 Settings hub: "Filmtitel in Grid anzeigen" toggle
   * (`src/app/(app)/(modals)/settings/display.tsx`). Controls whether the
   * Watchlist/Tagebuch grid view modes render the movie title alongside the
   * poster. Defaults to `true` to match the pre-M10 behavior (titles were
   * always shown in Watchlist's grid mode; Tagebuch's grid mode never showed
   * them at all -- see docs/interim-decisions.md for how that asymmetry was
   * resolved).
   */
  showTitlesInGrid: boolean;
  setShowTitlesInGrid: (value: boolean) => void;
  /**
   * M10 Settings hub: the last changelog version the user has actually
   * opened the Changelog screen for (`src/app/(app)/(modals)/settings/changelog.tsx`).
   * `null` means the user has never opened it. Compared against the
   * hardcoded `CURRENT_CHANGELOG_VERSION` constant to decide whether to
   * surface a "Neue Funktionen verfügbar" hint on the Settings hub.
   */
  lastSeenChangelogVersion: string | null;
  setLastSeenChangelogVersion: (version: string) => void;
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
      selectedStreamingProviderIds: [],
      setSelectedStreamingProviderIds: (ids) => set({ selectedStreamingProviderIds: ids }),
      showTitlesInGrid: true,
      setShowTitlesInGrid: (value) => set({ showTitlesInGrid: value }),
      lastSeenChangelogVersion: null,
      setLastSeenChangelogVersion: (version) => set({ lastSeenChangelogVersion: version }),
    }),
    {
      name: "watchcrew-preferences",
      storage: createJSONStorage(() => mmkvStorage),
    },
  ),
);
