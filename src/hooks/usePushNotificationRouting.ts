import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

// M10 (part): handles navigation when the user taps a push notification --
// requirement 3's deep-link contract (groupId + tmdbId/watchlistEntryId) is
// only useful if tapping the notification actually navigates somewhere.
//
// Two paths, both required (per the task brief, the cold-start path is
// flagged in the legacy bugfix history as commonly broken, so it's handled
// explicitly rather than assumed to be covered by the live listener alone):
//   1. the app is already running (foreground, background, or backgrounded)
//      -> `addNotificationResponseReceivedListener` fires live.
//   2. COLD START: the app process was launched BY the notification tap
//      itself -> `getLastNotificationResponseAsync()` is the only way to
//      observe that after the fact; the live listener above never fires for
//      this case; `clearLastNotificationResponse()` is called after
//      processing it once so remounting this hook later (e.g. navigating
//      away from and back into the (app) group) doesn't re-fire the same
//      stale cold-start navigation again.
//
// Mounted in `(app)/_layout.tsx`, NOT the root layout -- `useAuthGate()`
// (src/hooks/useAuthGate.ts) has already redirected into this route tree by
// the time `(app)/_layout.tsx` mounts, so `router.push` to
// `/movie/[tmdbId]` here can never race the initial auth-gate redirect the
// way it would from the root layout.
export function usePushNotificationRouting(): void {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    function navigateFromData(data: unknown) {
      if (typeof data !== "object" || data === null) {
        return;
      }
      const { tmdbId, groupId, watchlistEntryId } = data as {
        tmdbId?: number | string;
        groupId?: string;
        watchlistEntryId?: string;
      };

      if (tmdbId === undefined || tmdbId === null) {
        // Per requirement 3, tmdbId (or watchlistEntryId) is always present
        // in a real push payload -- a notification missing both isn't one
        // this app sent, so there is nowhere sensible to navigate.
        return;
      }

      router.push({
        pathname: "/movie/[tmdbId]",
        params: {
          tmdbId: String(tmdbId),
          ...(groupId ? { groupId } : {}),
          ...(watchlistEntryId ? { watchlistEntryId } : {}),
        },
      });
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) {
        return;
      }
      navigateFromData(response.notification.request.content.data);
      Notifications.clearLastNotificationResponse();
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromData(response.notification.request.content.data);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);
}
