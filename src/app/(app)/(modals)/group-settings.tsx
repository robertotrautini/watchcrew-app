import { Stack } from "expo-router";
import { View } from "react-native";

import { useParallaxScroll } from "@/components/parallaxContext";
import { CreateGroupSheet } from "@/components/settings/CreateGroupSheet";
import { GroupInviteSection } from "@/components/settings/GroupInviteSection";
import { GroupMembersSection } from "@/components/settings/GroupMembersSection";
import { GroupNameSection } from "@/components/settings/GroupNameSection";
import { GroupSwitcherSection } from "@/components/settings/GroupSwitcherSection";
import { GroupThemeSection } from "@/components/settings/GroupThemeSection";
import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { Text } from "@/components/ui/Text";
import { useGroupSettingsScreen } from "@/hooks/useGroupSettingsScreen";

/**
 * Group-Settings screen (M9 part 2) -- member list, rename, invite-link
 * management, remove member, leave-with-retention-warning, plus the group
 * switcher that (together with `useActiveGroup`, src/hooks/useActiveGroup.ts)
 * replaces the M5-M8 "first group = active group" interim simplification.
 *
 * State and handlers live in `useGroupSettingsScreen`; the sections are the
 * `Group*Section` components in src/components/settings/. Design calls not
 * fixed by an ADR are logged in docs/interim-decisions.md under "M9 Teil 2"
 * (deep-link format `watchcrew://join/<token>`, regenerate via RPC, shared
 * `ConfirmDialog` for destructive actions, batched group-name query).
 */
export default function GroupSettingsScreen() {
  const parallaxScroll = useParallaxScroll();
  const s = useGroupSettingsScreen();

  if (s.isLoading) {
    return (
      <View className="flex-1" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <LoadingArea testID="group-settings-loading" />
      </View>
    );
  }

  if (s.isError) {
    return (
      <View className="flex-1 items-center justify-center px-4" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <Text testID="group-settings-error" className="text-center text-danger">
          Die Gruppeneinstellungen konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  if (!s.activeGroupId) {
    return (
      <View className="flex-1 items-center justify-center px-4" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <EmptyState testID="group-settings-no-group" icon="group" title="Keine aktive Gruppe gefunden" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <KeyboardAwareScrollView
        {...parallaxScroll}
        className="flex-1"
        contentContainerClassName="gap-6 px-4 py-6"
        testID="group-settings-screen"
      >
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />

        <GroupSwitcherSection
          activeGroupId={s.activeGroupId}
          groups={s.groups}
          groupNameById={s.groupNameById}
          onChange={s.setActiveGroup}
          onOpenChange={s.setSwitchOpen}
          onCreatePress={() => s.setCreateVisible(true)}
        />

        {s.isOwner ? (
          <GroupNameSection
            value={s.nameInput}
            onChangeText={s.setNameInput}
            canSave={s.nameChanged}
            saving={s.renameMutation.isPending}
            error={s.renameMutation.isError ? s.renameMutation.error : null}
            blocked={s.switchOpen}
            onSave={s.handleRenameSave}
          />
        ) : null}

        {s.isOwner ? (
          <GroupThemeSection
            selected={s.selectedThemeName}
            selectedAccent={s.themeColors.accent}
            pending={s.setThemeMutation.isPending}
            error={s.setThemeMutation.isError ? s.setThemeMutation.error : null}
            onSelect={s.handleThemeSelect}
          />
        ) : null}

        {s.isOwner ? (
          <GroupInviteSection
            inviteLink={s.inviteLink}
            inviteEnabled={s.inviteEnabled}
            regenerating={s.regenerateMutation.isPending}
            onRegeneratePress={() => s.setRegenerateConfirmVisible(true)}
            onToggleEnabled={s.handleToggleInviteEnabled}
          />
        ) : null}

        <GroupMembersSection
          members={s.members}
          currentUserId={s.currentUserId}
          isOwner={s.isOwner}
          onRemovePress={s.setRemoveTargetUserId}
        />

        <View className="gap-2" testID="group-settings-leave-section">
          <Button
            testID="group-settings-leave-button"
            label="Gruppe verlassen"
            icon="leave"
            variant="danger"
            onPress={() => s.setLeaveConfirmVisible(true)}
          />
        </View>
      </KeyboardAwareScrollView>
      <ConfirmDialog
        visible={s.removeTargetUserId != null}
        testID={`group-settings-member-${s.removeTargetUserId ?? "none"}-remove`}
        title="Mitglied entfernen?"
        description={`${s.removeTargetName} verliert den Zugriff auf die Gruppe. Bewertungen bleiben erhalten.`}
        confirmLabel="Entfernen"
        confirmIcon="removeMember"
        loading={s.removeMemberMutation.isPending}
        onCancel={() => s.setRemoveTargetUserId(null)}
        onConfirm={() => s.removeTargetUserId && s.handleConfirmRemoveMember(s.removeTargetUserId)}
      />
      <ConfirmDialog
        visible={s.regenerateConfirmVisible}
        testID="group-settings-invite-regenerate"
        title="Einladungslink neu generieren?"
        description="Der bisherige Einladungslink wird ungültig. Wer ihn noch hat, kann der Gruppe nicht mehr beitreten."
        confirmLabel="Neu generieren"
        confirmIcon="regenerate"
        loading={s.regenerateMutation.isPending}
        onCancel={() => s.setRegenerateConfirmVisible(false)}
        onConfirm={s.handleConfirmRegenerate}
      />
      <ConfirmDialog
        visible={s.leaveConfirmVisible}
        testID="group-settings-leave"
        title="Gruppe verlassen?"
        description={s.leaveDescription}
        confirmLabel="Verlassen"
        confirmIcon="leave"
        loading={s.leaveGroupMutation.isPending}
        onCancel={() => s.setLeaveConfirmVisible(false)}
        onConfirm={s.handleConfirmLeave}
      />
      <CreateGroupSheet
        visible={s.createVisible}
        loading={s.createGroupMutation.isPending}
        onCancel={() => s.setCreateVisible(false)}
        onCreate={s.handleCreateGroup}
      />
      <SettingsBackBar />
    </View>
  );
}
