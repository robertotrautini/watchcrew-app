import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";

import { upsertPushToken } from "@/lib/pushTokens";

// M10 (part): registers this device for Expo push notifications once a user
// is signed in, and persists the resulting token (src/lib/pushTokens.ts's
// `upsertPushToken`) -- requirement 5 ("Expo push token registration").
//
// Deliberately does NOT call `Notifications.setNotificationHandler()`
// anywhere in this file -- foreground display behavior (the "silent
// update"/"in-app toast" halves of ADR 0006's three-way push behavior) is
// the PARALLEL Realtime task's responsibility
// (src/hooks/useGroupRealtimeSync.ts), driven by Supabase Realtime, not by
// how an incoming push is displayed. Leaving no handler registered means
// Expo's own default applies (no system alert shown for a foreground-
// received push) -- which happens to already match "foreground is handled
// by Realtime, not by a push banner", but this is a coordination point the
// parallel task should explicitly confirm, not an assumption baked in here.
//
// KNOWN GAP (see docs/interim-decisions.md "M10 — Push-Registrierung: kein
// EAS-Projekt konfiguriert"): `Notifications.getExpoPushTokenAsync()`
// resolves its `projectId` from `Constants.expoConfig.extra.eas.projectId`
// when none is passed explicitly -- this repo has no `eas.json` and no
// `extra.eas.projectId` in app.config.ts yet (same "EAS Dev Client wird
// nötig" infra gap already flagged for M4, never an autonomous decision to
// paper over with a fake id here). Until a real EAS project exists, this
// call is expected to reject on a real device/dev-client build; the
// try/catch below means that failure is swallowed (logged, not thrown) so
// it can't crash app startup, but real push token registration will not
// actually work until that project is set up.
export function usePushRegistration(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) {
      return;
    }
    // Captured as its own `const` so TypeScript's narrowing above (`userId`
    // is `string`, not `string | undefined`) survives into the nested
    // `register` function below -- narrowing a closed-over parameter does
    // not otherwise carry across a function-declaration boundary.
    const uid = userId;

    let cancelled = false;

    async function register() {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          return;
        }

        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        if (cancelled) {
          return;
        }

        const { error } = await upsertPushToken({
          userId: uid,
          expoPushToken: tokenResponse.data,
        });
        if (error) {
          console.warn("usePushRegistration: failed to persist Expo push token", error);
        }
      } catch (err) {
        console.warn("usePushRegistration: registration failed", err);
      }
    }

    void register();

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
