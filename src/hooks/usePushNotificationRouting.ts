import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { userGroupsQueryOptions } from "@/hooks/useUserGroups";
import { supabase } from "@/lib/supabase";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

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
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    // If the push belongs to a group the user is a member of, make it the
    // persisted active group before navigating (so back-navigation, tabs and
    // modals all land in the group the push was about). Never throws: on any
    // lookup failure the active group is simply left unchanged.
    async function switchActiveGroupIfMember(groupId: string) {
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) {
          return;
        }
        const groups = (await queryClient.ensureQueryData(userGroupsQueryOptions(userId))) as
          | Array<{ group_id: string }>
          | undefined;
        if (groups?.some((g) => g.group_id === groupId)) {
          usePreferencesStore.getState().setActiveGroupId(groupId);
        }
      } catch {
        // leave the active group as-is
      }
    }

    async function navigateFromData(data: unknown) {
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

      if (groupId) {
        await switchActiveGroupIfMember(groupId);
      }

      // `source` marks the route as group context for the detail screen. Every
      // push event (new_entry, first_rating, release_reminder) targets members
      // who have not rated the entry yet, so it is a Watchlist entry for them.
      const hasGroupContext = Boolean(groupId && watchlistEntryId);
      router.push({
        pathname: "/movie/[tmdbId]",
        params: {
          tmdbId: String(tmdbId),
          ...(groupId ? { groupId } : {}),
          ...(watchlistEntryId ? { watchlistEntryId } : {}),
          ...(hasGroupContext ? { source: "watchlist" as const } : {}),
        },
      });
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!isMounted || !response) {
        return;
      }
      // Clear first: navigation is async now (group lookup), and a remount
      // meanwhile must not re-fire the same cold-start navigation.
      Notifications.clearLastNotificationResponse();
      void navigateFromData(response.notification.request.content.data);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void navigateFromData(response.notification.request.content.data);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router, queryClient]);
}
