import { useRouter } from "expo-router";
import { useEffect } from "react";

import { CURRENT_CHANGELOG_VERSION } from "@/lib/changelog";
import { showToast } from "@/lib/toast";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/** Feature inventory 2.8: toast appears 1.5s after app start ... */
const CHANGELOG_TOAST_DELAY_MS = 1500;
/** ... and disappears after 6s. */
const CHANGELOG_TOAST_DURATION_MS = 6000;

/**
 * Startup "Neue Features" toast (feature inventory 2.8). Shown once per app
 * start (mounted in `(app)/_layout.tsx`) when the persisted
 * `lastSeenChangelogVersion` differs from `CURRENT_CHANGELOG_VERSION`. Does
 * NOT mark the version as seen -- only opening the changelog screen does (the
 * toast tap navigates there), so the toast and the settings badge keep
 * appearing until the changelog was actually opened.
 */
export function useChangelogStartupToast(): void {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      const lastSeen = usePreferencesStore.getState().lastSeenChangelogVersion;
      if (lastSeen === CURRENT_CHANGELOG_VERSION) {
        return;
      }
      showToast("Neue Features – Tippe, um das Changelog zu öffnen", {
        durationMs: CHANGELOG_TOAST_DURATION_MS,
        onPress: () => router.push("/settings/changelog"),
      });
    }, CHANGELOG_TOAST_DELAY_MS);

    return () => clearTimeout(timer);
    // Once per app start: the router reference is stable enough; re-running
    // on identity changes would restart the delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
