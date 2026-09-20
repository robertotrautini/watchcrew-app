import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useCurrentUserEmail } from "@/hooks/useCurrentUserEmail";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { signOut } from "@/lib/auth";
import { CURRENT_CHANGELOG_VERSION } from "@/lib/changelog";
import { showToast } from "@/lib/toast";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * M10 — the real Settings hub, replacing the M9-part-2 interim "⚙️ Gruppe
 * verwalten" shortcut on the Tracker screen (which now points here instead;
 * see src/app/(app)/(tabs)/tracker.tsx). Structural pattern (per this task's
 * brief, loosely informed by the legacy app's own layout): a single list of
 * navigable sections, plus a few flat rows at the bottom (account info,
 * sign-out, app version). No feature-request row (legacy-only, never
 * surfaced in that app's own visible menu either — out of scope here).
 *
 * "Benachrichtigungen" routes to `/settings/notifications`, which this task
 * gives only a minimal placeholder screen (see
 * src/app/(app)/(modals)/settings/notifications.tsx) — the parallel M10
 * push-notifications task owns the real subscription UI there and is
 * expected to replace that stub. Documented as a reconciliation point in
 * docs/interim-decisions.md.
 *
 * "Neue Funktionen verfügbar" hint: the parallel M10 Realtime task's
 * `showToast`/`ToastHost` (src/lib/toast.ts, mounted at the app root) landed
 * during this task's own implementation, so this screen fires a real toast
 * once per mount when the changelog is unseen, ON TOP OF (not instead of)
 * the "Neu" badge on the Changelog row itself — the badge alone was this
 * task's documented fallback for if the toast system hadn't landed yet.
 */

interface SettingsSection {
  key: string;
  label: string;
  route: string;
}

const SECTIONS: SettingsSection[] = [
  { key: "streaming-services", label: "Meine Streaming-Dienste", route: "/settings/streaming-services" },
  { key: "display", label: "Darstellung", route: "/settings/display" },
  { key: "notifications", label: "Benachrichtigungen", route: "/settings/notifications" },
  { key: "group-settings", label: "Gruppe verwalten", route: "/group-settings" },
  { key: "changelog", label: "Changelog", route: "/settings/changelog" },
  { key: "delete-account", label: "Konto löschen", route: "/settings/delete-account" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const email = useCurrentUserEmail();
  const ownProfileQuery = useOwnProfile(currentUserId);

  const selectedStreamingProviderIds = usePreferencesStore((s) => s.selectedStreamingProviderIds);
  const lastSeenChangelogVersion = usePreferencesStore((s) => s.lastSeenChangelogVersion);
  const hasUnseenChangelog = lastSeenChangelogVersion !== CURRENT_CHANGELOG_VERSION;

  // Fires once per mount, not once per render — a plain ref guard, since
  // this effect's own dependency (hasUnseenChangelog) doesn't change while
  // the screen is mounted (it only changes after visiting the Changelog
  // screen, which unmounts this one).
  const hasShownToastRef = useRef(false);
  useEffect(() => {
    if (hasUnseenChangelog && !hasShownToastRef.current) {
      hasShownToastRef.current = true;
      showToast("Neue Funktionen verfügbar");
    }
  }, [hasUnseenChangelog]);

  async function handleSignOut() {
    await signOut();
    // `useAuthGate` (src/hooks/useAuthGate.ts) reacts to the SIGNED_OUT
    // Supabase auth event via `onAuthStateChange` -- but only in whichever
    // component instance is actually still mounted and subscribed. This
    // screen sits deep in the (app) stack, several navigations away from
    // the root `index.tsx` that owns the gate; rather than assume that
    // screen is still mounted and will react on its own (the exact kind of
    // auth-gate gap M9 part 2's Group-Settings screen already ran into for
    // a different case -- see its own `ONBOARDING_ROUTE` comment), this
    // explicitly forces navigation back to "/" so `useAuthGate` re-evaluates
    // fresh either way.
    router.replace("/");
  }

  return (
    <View className="flex-1 bg-bg-primary" testID="settings-screen">
      <ScrollView contentContainerClassName="gap-2 px-4 pb-8 pt-4">
        <Text className="mb-2 font-display text-xl text-text-primary">Einstellungen</Text>

        <View testID="settings-sections" className="gap-2">
          {SECTIONS.map((section) => (
            <Pressable
              key={section.key}
              testID={`settings-section-${section.key}`}
              className="flex-row items-center justify-between rounded-lg border border-border-subtle bg-card px-4 py-3"
              onPress={() => router.push(section.route as never)}
            >
              <Text className="text-text-primary">{section.label}</Text>
              <View className="flex-row items-center gap-2">
                {section.key === "streaming-services" && selectedStreamingProviderIds.length > 0 ? (
                  <View
                    testID="settings-streaming-badge-wrapper"
                    className="min-w-[20px] items-center rounded-full bg-accent px-2 py-0.5"
                  >
                    <Text testID="settings-streaming-badge" className="text-xs text-bg-primary">
                      {selectedStreamingProviderIds.length}
                    </Text>
                  </View>
                ) : null}
                {section.key === "changelog" && hasUnseenChangelog ? (
                  <View
                    testID="settings-changelog-badge-wrapper"
                    className="rounded-full bg-accent px-2 py-0.5"
                  >
                    <Text testID="settings-changelog-badge" className="text-xs text-bg-primary">
                      Neu
                    </Text>
                  </View>
                ) : null}
                <Text className="text-text-secondary">{"›"}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View testID="settings-account-info" className="mt-4 gap-1 px-1">
          <Text testID="settings-user-display-name" className="text-text-primary">
            {ownProfileQuery.data?.display_name ?? ""}
          </Text>
          <Text testID="settings-user-email" className="text-text-secondary">
            {email ?? ""}
          </Text>
        </View>

        <Button
          testID="settings-sign-out-button"
          variant="secondary"
          label="Abmelden"
          className="mt-4"
          onPress={handleSignOut}
        />

        <Text testID="settings-app-version" className="mt-6 text-center text-xs text-text-secondary">
          {`WatchCrew v${Constants.expoConfig?.version ?? "?"}`}
        </Text>
      </ScrollView>
    </View>
  );
}
