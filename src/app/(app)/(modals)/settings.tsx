import Constants from "expo-constants";
import { useParallaxScroll } from "@/components/parallaxContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Icon, type IconRole } from "@/components/ui/Icon";
import { Text, TextInput, View } from "react-native";

import { DataSourceAttributions } from "@/components/settings/DataSourceAttributions";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import {
  Button,
  BUTTON_ICON_COLORS,
  BUTTON_ICON_COLOR_DISABLED,
} from "@/components/ui/Button";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { GLASS_INPUT_CLASSNAME } from "@/components/ui/Glass";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useCurrentUserEmail } from "@/hooks/useCurrentUserEmail";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { signOut } from "@/lib/auth";
import { openLegalUrl } from "@/lib/legalLinks";
import { showToast } from "@/lib/toast";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Layout (grouped, legacy-inspired): "Aktueller Nutzer" header, then one glass
 * card per section (Konto, Gruppe, App, Rechtliches), the Datenquellen footer
 * with TMDB/Trakt logos and a full-width glass Abmelden button. The calm dark
 * background comes from the (modals) layout (contentStyle), not from here.
 *
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
 */

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
  icon: IconRole;
}

function legalSections(): LegalSection[] {
  const extra = Constants.expoConfig?.extra as
    { privacyPolicyUrl?: string; termsOfServiceUrl?: string } | undefined;

  return [
    {
      key: "privacy-policy",
      label: "Datenschutzerklärung",
      url: extra?.privacyPolicyUrl,
      icon: "document",
    },
    {
      key: "terms-of-service",
      label: "Nutzungsbedingungen",
      url: extra?.termsOfServiceUrl,
      icon: "document",
    },
  ];
}

export default function SettingsScreen() {
  const parallaxScroll = useParallaxScroll();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const email = useCurrentUserEmail();
  const ownProfileQuery = useOwnProfile(currentUserId);
  const updateDisplayName = useUpdateDisplayName();

  // `null` = untouched, show the stored name; string = user's edit in progress.
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const displayNameValue =
    displayNameDraft ?? ownProfileQuery.data?.display_name ?? "";

  const storedDisplayName = ownProfileQuery.data?.display_name ?? "";
  const displayNameTrimmed = displayNameValue.trim();
  const displayNameChanged =
    displayNameTrimmed.length > 0 && displayNameTrimmed !== storedDisplayName;

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
      showToast("Anzeigename gespeichert", { variant: "success" });
    } catch {
      setDisplayNameError("Anzeigename konnte nicht gespeichert werden.");
      showToast("Anzeigename konnte nicht gespeichert werden.", {
        variant: "error",
      });
    }
  }

  const selectedStreamingProviderIds = usePreferencesStore(
    (s) => s.selectedStreamingProviderIds,
  );
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

  const displayName = ownProfileQuery.data?.display_name ?? "";
  const streamingCount = selectedStreamingProviderIds.length;

  function go(route: string) {
    router.push(route as never);
  }

  return (
    <View className="flex-1" testID="settings-screen">
      <KeyboardAwareScrollView
        {...parallaxScroll}
        contentContainerClassName="gap-5 px-4 pb-8 pt-4"
      >
        <View testID="settings-account-info" className="px-1">
          <Text className="text-xs uppercase tracking-widest text-text-secondary">
            Aktueller Nutzer
          </Text>
          <Text
            testID="settings-current-user"
            className="font-display-bold text-xl text-accent-light"
          >
            {displayName}
          </Text>
          <Text
            testID="settings-user-email"
            className="text-sm text-text-secondary"
          >
            {email ?? ""}
          </Text>
        </View>

        <SettingsGroup testID="settings-group-account" title="Konto">
          <View
            testID="settings-display-name-editor"
            className="gap-2 px-4 py-3"
          >
            <Text className="text-sm text-text-secondary">Anzeigename</Text>
            <View
              testID="settings-display-name-row"
              className="flex-row items-center gap-3"
            >
              <TextInput
                testID="settings-user-display-name"
                value={displayNameValue}
                onChangeText={setDisplayNameDraft}
                autoCapitalize="words"
                placeholder="Anzeigename"
                placeholderTextColor="#888888"
                className={`flex-1 ${GLASS_INPUT_CLASSNAME}`}
              />
              <Button
                testID="settings-display-name-save"
                variant="primary"
                iconOnly
                accessibilityLabel="Anzeigename speichern"
                accessibilityRole="button"
                disabled={!displayNameChanged}
                loading={updateDisplayName.isPending}
                onPress={handleSaveDisplayName}
              >
                <Icon
                  name="save"
                  size="M"
                  color={
                    displayNameChanged
                      ? BUTTON_ICON_COLORS.primary
                      : BUTTON_ICON_COLOR_DISABLED
                  }
                />
              </Button>
            </View>
            {displayNameError ? (
              <Text
                className="text-sm text-danger"
                testID="settings-display-name-error"
              >
                {displayNameError}
              </Text>
            ) : null}
          </View>
          <SettingsRow
            testID="settings-section-delete-account"
            icon="delete"
            label="Konto löschen"
            danger
            onPress={() => go("/settings/delete-account")}
          />
        </SettingsGroup>

        <SettingsGroup testID="settings-group-group" title="Gruppe">
          <SettingsRow
            testID="settings-section-group-settings"
            icon="group"
            label="Gruppe verwalten"
            onPress={() => go("/group-settings")}
          />
        </SettingsGroup>

        <SettingsGroup testID="settings-sections" title="App">
          <SettingsRow
            testID="settings-section-streaming-services"
            icon="streaming"
            label="Meine Streaming-Dienste"
            value={
              streamingCount > 0 ? `${streamingCount} ausgewählt` : undefined
            }
            onPress={() => go("/settings/streaming-services")}
          />
          <SettingsRow
            testID="settings-section-display"
            icon="theme"
            label="Darstellung"
            onPress={() => go("/settings/display")}
          />
          <SettingsRow
            testID="settings-section-notifications"
            icon="notifications"
            label="Benachrichtigungen"
            onPress={() => go("/settings/notifications")}
          />
        </SettingsGroup>

        <SettingsGroup testID="settings-legal-sections" title="Rechtliches">
          {legalSections().map((section) => (
            <SettingsRow
              key={section.key}
              testID={`settings-section-${section.key}`}
              icon={section.icon}
              label={section.label}
              onPress={() => openLegalUrl(section.url)}
            />
          ))}
        </SettingsGroup>

        <DataSourceAttributions />

        <Button
          testID="settings-sign-out-button"
          variant="secondary"
          className="w-full"
          label="Abmelden"
          icon="logout"
          onPress={handleSignOut}
        />

        <Text
          testID="settings-app-version"
          className="text-center text-xs text-text-secondary"
        >
          {`WatchCrew v${Constants.expoConfig?.version ?? "?"}`}
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}
