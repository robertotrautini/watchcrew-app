import { IconButton } from "@/components/ui/IconButton";
import Constants from "expo-constants";
import { useParallaxScroll } from "@/components/parallaxContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/Text";

import { DataSourceAttributions } from "@/components/settings/DataSourceAttributions";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { DisplayNameSheet } from "@/components/settings/DisplayNameSheet";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsLegalGroup } from "@/components/settings/SettingsLegalGroup";
import {
  Button,
} from "@/components/ui/Button";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { Select } from "@/components/ui/Select";
import { ListRow } from "@/components/ui/ListRow";
import { useGroupQuickSwitch } from "@/hooks/useGroupQuickSwitch";
import { useCurrentUserEmail } from "@/hooks/useCurrentUserEmail";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useOwnProfile } from "@/hooks/useOwnProfile";
import { signOut } from "@/lib/auth";
import { usePreferencesStore } from "@/stores/usePreferencesStore";

/**
 * Layout (grouped, legacy-inspired): one surface
 * card per section (Profil, Gruppe, App, Rechtliches), the Datenquellen footer
 * with TMDB/Trakt logos and a full-width surface Abmelden button followed by the danger Konto löschen button. The calm dark
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

export default function SettingsScreen() {
  const parallaxScroll = useParallaxScroll();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const email = useCurrentUserEmail();
  const ownProfileQuery = useOwnProfile(currentUserId);
  const { activeGroupId, groups, selectGroup } = useGroupQuickSwitch();

  const [displaySheetVisible, setDisplaySheetVisible] = useState(false);
  const storedDisplayName = ownProfileQuery.data?.display_name ?? "";

  function openDisplayNameSheet() {
    setDisplaySheetVisible(true);
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

  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

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
          <ListRow
            testID="settings-display-name-row"
            label="Anzeigename"
            value={displayName}
            valueTestID="settings-current-user"
            trailing={
              <IconButton
                testID="settings-display-name-edit-button"
                icon="edit"
                variant="neutral"
                size={44}
                accessibilityLabel="Anzeigename bearbeiten"
                onPress={openDisplayNameSheet}
              />
            }
          />
          <ListRow testID="settings-user-email-row" label="E-Mail" value={email ?? ""} valueTestID="settings-user-email" />
        </SettingsGroup>

        <SettingsGroup testID="settings-active-group" title="Aktuelle Gruppe" grouped={false}>
          <Select
            testID="settings-active-group-select"
            accessibilityLabel="Aktuelle Gruppe"
            placeholder="Keine Gruppe"
            value={activeGroupId ?? null}
            options={groups.map((g) => ({ value: g.id, label: g.name }))}
            onChange={selectGroup}
          />
        </SettingsGroup>

        <SettingsGroup testID="settings-group-group" title="Gruppe">
          <ListRow
            chevron
            testID="settings-section-group-settings"
            icon="group"
            label="Gruppe verwalten"
            onPress={() => go("/group-settings")}
          />
        </SettingsGroup>

        <SettingsGroup testID="settings-sections" title="App">
          <ListRow
            chevron
            testID="settings-section-streaming-services"
            icon="streaming"
            label="Meine Streaming-Dienste"
            value={
              streamingCount > 0 ? `${streamingCount} ausgewählt` : undefined
            }
            onPress={() => go("/settings/streaming-services")}
          />
          <ListRow
            chevron
            testID="settings-section-display"
            icon="theme"
            label="Darstellung"
            onPress={() => go("/settings/display")}
          />
          <ListRow
            chevron
            testID="settings-section-notifications"
            icon="notifications"
            label="Benachrichtigungen"
            onPress={() => go("/settings/notifications")}
          />
        </SettingsGroup>

        <SettingsLegalGroup />

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
          onPress={() => setDeleteDialogVisible(true)}
        />

        <Text
          testID="settings-app-version"
          className="text-center text-xs text-text-secondary"
        >
          {`WatchCrew v${Constants.expoConfig?.version ?? "?"}`}
        </Text>
      </KeyboardAwareScrollView>

      <DisplayNameSheet
        visible={displaySheetVisible}
        onClose={() => setDisplaySheetVisible(false)}
        storedDisplayName={storedDisplayName}
      />

      <DeleteAccountDialog
        visible={deleteDialogVisible}
        onCancel={() => setDeleteDialogVisible(false)}
      />
    </View>
  );
}
