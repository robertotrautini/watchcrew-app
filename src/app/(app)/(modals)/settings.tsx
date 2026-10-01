import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { useCurrentUserEmail } from "@/hooks/useCurrentUserEmail";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { signOut } from "@/lib/auth";
import { CURRENT_CHANGELOG_VERSION } from "@/lib/changelog";
import { openLegalUrl } from "@/lib/legalLinks";
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
 * "Benachrichtigungen" routes to `/settings/notifications`. This task
 * originally gave that route only a minimal placeholder screen (see
 * src/app/(app)/(modals)/settings/notifications.tsx's own module comment);
 * that placeholder has since been replaced by the real per-group push
 * opt-in screen (M10 reconciliation, see docs/interim-decisions.md — the
 * hub row and route themselves needed no change).
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

/**
 * M11 part 2, Job 3 (ADR 0011) — legal document rows. Not a `route`
 * (these don't navigate to an in-app screen) -- pressing one either opens
 * the configured URL in the system browser (simplest reliable approach,
 * per this task's brief -- no in-app WebView) or, while iubenda hasn't been
 * set up yet and the config still holds the placeholder default (see
 * src/lib/legalLinks.ts), shows a "Wird bald ergänzt" toast instead of a
 * broken link.
 */
interface LegalSection {
  key: string;
  label: string;
  url: string | undefined;
}

function legalSections(): LegalSection[] {
  const extra = Constants.expoConfig?.extra as
    | { privacyPolicyUrl?: string; termsOfServiceUrl?: string }
    | undefined;

  return [
    { key: "privacy-policy", label: "Datenschutzerklärung", url: extra?.privacyPolicyUrl },
    { key: "terms-of-service", label: "Nutzungsbedingungen", url: extra?.termsOfServiceUrl },
  ];
}

/**
 * Inventory 2.7 -- data-source attributions (TMDB/Trakt/JustWatch terms).
 * Text only (logo assets need a separate user decision). KinoCheck is
 * deliberately absent: the app does not use it (trailers come from
 * TMDB -> YouTube, similar movies from Trakt).
 */
interface AttributionEntry {
  key: string;
  text: string;
  linkLabel: string;
  url: string;
}

const ATTRIBUTIONS: AttributionEntry[] = [
  {
    key: "tmdb",
    text: "Dieses Produkt verwendet die TMDB-API, wird von TMDB aber weder unterstützt noch zertifiziert.",
    linkLabel: "themoviedb.org",
    url: "https://www.themoviedb.org",
  },
  {
    key: "trakt",
    text: "Ähnliche Filme werden von Trakt bereitgestellt.",
    linkLabel: "trakt.tv",
    url: "https://trakt.tv",
  },
  {
    key: "justwatch",
    text: "Streaming-Daten: JustWatch via TMDB",
    linkLabel: "justwatch.com",
    url: "https://www.justwatch.com",
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const email = useCurrentUserEmail();
  const ownProfileQuery = useOwnProfile(currentUserId);
  const updateDisplayName = useUpdateDisplayName();

  // `null` = untouched, show the stored name; string = user's edit in progress.
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const displayNameValue = displayNameDraft ?? ownProfileQuery.data?.display_name ?? "";

  async function handleSaveDisplayName() {
    const trimmed = displayNameValue.trim();
    if (trimmed.length === 0) {
      setDisplayNameError("Bitte gib einen Anzeigenamen ein.");
      return;
    }
    setDisplayNameError(null);
    try {
      await updateDisplayName.mutateAsync(trimmed);
      setDisplayNameDraft(null);
      showToast("Anzeigename gespeichert");
    } catch {
      setDisplayNameError("Anzeigename konnte nicht gespeichert werden.");
    }
  }

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
    <View className="flex-1" testID="settings-screen">
      <ScrollView contentContainerClassName="gap-2 px-4 pb-8 pt-4">

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

        <View testID="settings-legal-sections" className="gap-2">
          {legalSections().map((section) => (
            <Pressable
              key={section.key}
              testID={`settings-section-${section.key}`}
              className="flex-row items-center justify-between rounded-lg border border-border-subtle bg-card px-4 py-3"
              onPress={() => openLegalUrl(section.url)}
            >
              <Text className="text-text-primary">{section.label}</Text>
              <Text className="text-text-secondary">{"›"}</Text>
            </Pressable>
          ))}
        </View>

        <View testID="settings-attributions" className="mt-4 gap-2">
          <Text className="px-1 text-sm text-text-secondary">Datenquellen</Text>
          {ATTRIBUTIONS.map((entry) => (
            <Pressable
              key={entry.key}
              testID={`settings-attribution-${entry.key}`}
              accessibilityRole="link"
              className="gap-1 rounded-lg border border-border-subtle bg-card px-4 py-3"
              onPress={() => void Linking.openURL(entry.url)}
            >
              <Text testID={`settings-attribution-${entry.key}-text`} className="text-sm text-text-primary">
                {entry.text}
              </Text>
              <Text className="text-xs text-accent">{entry.linkLabel}</Text>
            </Pressable>
          ))}
        </View>

        <View testID="settings-account-info" className="mt-4 gap-1 px-1">
          <Text className="text-sm text-text-secondary">Anzeigename</Text>
          <TextInput
            testID="settings-user-display-name"
            value={displayNameValue}
            onChangeText={setDisplayNameDraft}
            autoCapitalize="words"
            placeholder="Anzeigename"
            placeholderTextColor="#888888"
            className="rounded-lg border border-border-subtle bg-card px-3 py-3 text-base text-text-primary"
          />
          {displayNameError ? (
            <Text className="text-sm text-danger" testID="settings-display-name-error">
              {displayNameError}
            </Text>
          ) : null}
          <Button
            testID="settings-display-name-save"
            variant="secondary"
            label="Speichern"
            loading={updateDisplayName.isPending}
            onPress={handleSaveDisplayName}
          />
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
