import { IconButton } from "@/components/ui/IconButton";
import Constants from "expo-constants";
import { useParallaxScroll } from "@/components/parallaxContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { type IconRole } from "@/components/ui/Icon";
import { View } from "react-native";
import { Text, TextInput } from "@/components/ui/Text";

import { DataSourceAttributions } from "@/components/settings/DataSourceAttributions";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import {
  Button,
} from "@/components/ui/Button";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GLASS_INPUT_CLASSNAME, GLASS_INSET_EDGE } from "@/components/ui/Glass";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { SettingsRow } from "@/components/ui/SettingsRow";
import { useGroupQuickSwitch } from "@/hooks/useGroupQuickSwitch";
import { useCurrentUserEmail } from "@/hooks/useCurrentUserEmail";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { useUpdateDisplayName } from "@/hooks/useUpdateDisplayName";
import { signOut } from "@/lib/auth";
import { deleteOwnAccount } from "@/lib/deleteAccount";
import * as Haptics from "expo-haptics";
import { openLegalUrl } from "@/lib/legalLinks";
import { showToast } from "@/lib/toast";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Layout (grouped, legacy-inspired): one glass
 * card per section (Profil, Gruppe, App, Rechtliches), the Datenquellen footer
 * with TMDB/Trakt logos and a full-width glass Abmelden button followed by the danger Konto löschen button. The calm dark
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

const DELETE_CONFIRMATION_PHRASE = "LÖSCHEN";

export default function SettingsScreen() {
  const parallaxScroll = useParallaxScroll();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const email = useCurrentUserEmail();
  const ownProfileQuery = useOwnProfile(currentUserId);
  const updateDisplayName = useUpdateDisplayName();
  const { activeGroupId, groups, selectGroup } = useGroupQuickSwitch();

  const [displaySheetVisible, setDisplaySheetVisible] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);

  const storedDisplayName = ownProfileQuery.data?.display_name ?? "";
  const displayNameTrimmed = displayNameDraft.trim();
  const displayNameChanged =
    displayNameTrimmed.length > 0 && displayNameTrimmed !== storedDisplayName;

  function openDisplayNameSheet() {
    setDisplayNameDraft(storedDisplayName);
    setDisplayNameError(null);
    setDisplaySheetVisible(true);
  }

  async function handleSaveDisplayName() {
    if (displayNameTrimmed.length === 0) {
      setDisplayNameError("Bitte gib einen Anzeigenamen ein.");
      return;
    }
    setDisplayNameError(null);
    try {
      await updateDisplayName.mutateAsync(displayNameTrimmed);
      setDisplaySheetVisible(false);
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
    // Navigate to login FIRST, then end the session. signOut() clears the
    // query cache and resets the group theme; doing that while this modal
    // stack is still mounted makes react-native-screens update the header of
    // a screen that is being popped and crashes Android ("ScreenStackFragment
    // added into a non-stack container"). The (auth) group has no guard, and
    // `useAuthGate` re-evaluates on the next visit to "/".
    router.replace("/(auth)/login");
    await signOut();
  }

  // "Konto löschen": ConfirmDialog with typed confirmation phrase.
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );
  const isDeleteConfirmed = deleteConfirmationInput === DELETE_CONFIRMATION_PHRASE;

  function openDeleteDialog() {
    setDeleteConfirmationInput("");
    setDeleteErrorMessage(null);
    setDeleteDialogVisible(true);
  }

  async function handleConfirmDeleteAccount() {
    if (!isDeleteConfirmed || isDeletingAccount) {
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDeletingAccount(true);
    setDeleteErrorMessage(null);

    const { error } = await deleteOwnAccount();
    if (error) {
      setIsDeletingAccount(false);
      setDeleteErrorMessage(error.message);
      return;
    }

    // Navigate FIRST, then end the session (see handleSignOut above).
    router.replace("/(auth)/login");
    await signOut();
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
        <SettingsGroup testID="settings-account-info" title="Profil">
          <View
            testID="settings-display-name-row"
            className="min-h-12 flex-row items-center gap-3 px-4 py-2"
          >
            <View className="flex-1 gap-0.5">
              <Text className="text-sm text-text-secondary">Anzeigename</Text>
              <Text
                testID="settings-current-user"
                className="text-base text-text-primary"
              >
                {displayName}
              </Text>
            </View>
            <IconButton
              testID="settings-display-name-edit-button"
              icon="edit"
              variant="neutral"
              size={44}
              accessibilityLabel="Anzeigename bearbeiten"
              onPress={openDisplayNameSheet}
            />
          </View>
          <View className="px-4 py-3">
            <Text
              testID="settings-user-email"
              className="text-sm text-text-secondary"
            >
              {email ?? ""}
            </Text>
          </View>
          <View testID="settings-active-group" className="gap-2 px-4 py-3">
            <Text className="text-sm text-text-secondary">Aktuelle Gruppe</Text>
            <Select
              testID="settings-active-group-select"
              accessibilityLabel="Aktuelle Gruppe"
              placeholder="Keine Gruppe"
              value={activeGroupId ?? null}
              options={groups.map((g) => ({ value: g.id, label: g.name }))}
              onChange={selectGroup}
            />
          </View>
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

        <Button
          testID="settings-section-delete-account"
          variant="danger"
          className="w-full"
          label="Konto löschen"
          icon="delete"
          onPress={openDeleteDialog}
        />

        <Text
          testID="settings-app-version"
          className="text-center text-xs text-text-secondary"
        >
          {`WatchCrew v${Constants.expoConfig?.version ?? "?"}`}
        </Text>
      </KeyboardAwareScrollView>

      <Sheet
        visible={displaySheetVisible}
        onClose={() => setDisplaySheetVisible(false)}
        title="Anzeigename bearbeiten"
      >
        <View testID="settings-display-name-sheet" className="gap-3">
          <Text className="text-sm text-text-secondary">Anzeigename</Text>
          <TextInput
            testID="settings-display-name-input"
            value={displayNameDraft}
            onChangeText={setDisplayNameDraft}
            autoCapitalize="words"
            placeholder="Anzeigename"
            placeholderTextColor="#888888"
            className={GLASS_INPUT_CLASSNAME}
          />
          {displayNameError ? (
            <Text
              className="text-sm text-danger"
              testID="settings-display-name-error"
            >
              {displayNameError}
            </Text>
          ) : null}
          <View className="flex-row gap-3">
            <Button
              testID="settings-display-name-cancel-button"
              label="Abbrechen"
              icon="close"
              variant="secondary"
              className="flex-1"
              onPress={() => setDisplaySheetVisible(false)}
            />
            <Button
              testID="settings-display-name-confirm-button"
              label="Speichern"
              icon="save"
              className="flex-1"
              disabled={!displayNameChanged}
              loading={updateDisplayName.isPending}
              onPress={handleSaveDisplayName}
            />
          </View>
        </View>
      </Sheet>

      <ConfirmDialog
        visible={deleteDialogVisible}
        testID="delete-account"
        title="Konto endgültig löschen"
        confirmLabel="Endgültig löschen"
        confirmDisabled={!isDeleteConfirmed}
        loading={isDeletingAccount}
        onCancel={() => setDeleteDialogVisible(false)}
        onConfirm={handleConfirmDeleteAccount}
      >
        <View className="gap-3">
          <Text className="text-text-secondary">
            Dein Konto sowie alle deine Gruppenmitgliedschaften, Bewertungen und
            Zahlungsdaten werden endgültig gelöscht. Dieser Vorgang kann nicht
            rückgängig gemacht werden.
          </Text>
          <Text className="text-text-secondary">
            Gib zur Bestätigung &quot;{DELETE_CONFIRMATION_PHRASE}&quot; ein.
          </Text>
          <TextInput
            testID="delete-account-confirm-input"
            className={`rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
            autoCapitalize="characters"
            autoCorrect={false}
            value={deleteConfirmationInput}
            onChangeText={setDeleteConfirmationInput}
          />
          {deleteErrorMessage ? (
            <Text testID="delete-account-error" className="text-danger">
              Konto konnte nicht gelöscht werden: {deleteErrorMessage}
            </Text>
          ) : null}
        </View>
      </ConfirmDialog>
    </View>
  );
}
