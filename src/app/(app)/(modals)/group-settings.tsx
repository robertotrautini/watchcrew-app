import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Button } from "@/components/ui/Button";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupDetails, useGroupNames } from "@/hooks/useGroupDetails";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import {
  useLeaveGroup,
  useRegenerateInviteToken,
  useRemoveMember,
  useRenameGroup,
  useSetInviteEnabled,
} from "@/hooks/useGroupSettings";
import { groupDisplayLabel, memberDisplayLabel } from "@/lib/diaryDisplay";
import { resolveGroupTheme } from "@/lib/groupTheme";

/**
 * Group-Settings screen (M9 part 2) -- member list, rename, invite-link
 * management, remove member, leave-with-retention-warning, plus the group
 * switcher that (together with `useActiveGroup`, src/hooks/useActiveGroup.ts)
 * replaces the M5-M8 "first group = active group" interim simplification.
 *
 * Fresh territory not covered by docs/feature-inventory.md (per this
 * task's brief) -- every UI/copy/routing detail below not already fixed by
 * an ADR is a reversible implementation-detail call, logged in
 * docs/interim-decisions.md under "M9 Teil 2" rather than stopped on:
 *  - Deep-link format for the shareable invite link: `watchcrew://join/<token>`
 *    (custom scheme; ADR 0003/M3 left Universal Links as a deferred TODO,
 *    no established format to match instead).
 *  - Invite-link "Neu generieren" goes through the `regenerate_invite_token`
 *    SECURITY DEFINER RPC (src/lib/groups.ts's `regenerateInviteToken`),
 *    not a plain client UPDATE with a client-generated uuid.
 *  - Confirmation pattern for both "Entfernen" (kick) and "Gruppe
 *    verlassen": INLINE confirmation (swap the button row for a "wirklich?"
 *    + Abbrechen/confirm row), matching the Tracker screen's M8
 *    "Wirklich löschen?" precedent -- not a `Sheet`, which this codebase
 *    reserves for pickers/dialogs with their own content, not plain
 *    yes/no confirmations.
 *  - Group switcher needs every one of the user's groups' real NAMEs (not
 *    just the active one's) -- `useUserGroups()` alone can't supply that
 *    (see `useGroupNames`'s own module comment), so this screen loads a
 *    second, small batched query for it.
 */

const INVITE_LINK_SCHEME = "watchcrew://join/";

const LEAVE_COPY_LAST_MEMBER =
  "Du bist das letzte Mitglied. Die Gruppe wird für 2 Wochen aufbewahrt, danach endgültig gelöscht. Du kannst über die Gruppen-ID wieder beitreten.";
const LEAVE_COPY_AS_OWNER =
  "Möchtest du die Gruppe wirklich verlassen? Die Owner-Rolle geht automatisch an ein anderes Mitglied über.";
const LEAVE_COPY_AS_MEMBER = "Möchtest du die Gruppe wirklich verlassen?";

// Same target string src/app/index.tsx's useAuthGate 'onboarding' redirect
// uses, and the same reasoning as M9 part 1's create-or-join-group.tsx
// `APP_HOME_ROUTE` comment: `useAuthGate` only re-evaluates on a genuine
// Supabase auth event, not on a plain `watch_group_members` row deletion
// with the same session still active -- leaving your only/last group would
// otherwise strand you here with zero groups and no gate re-check. This
// screen navigates there explicitly instead of relying on the gate.
const ONBOARDING_ROUTE = "/(onboarding)/create-or-join-group";

export default function GroupSettingsScreen() {
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { activeGroupId, setActiveGroup, groupsQuery } = useActiveGroup(currentUserId);

  const groupDetailsQuery = useGroupDetails(activeGroupId);
  const groupMembersQuery = useGroupMembers(activeGroupId);

  const allGroupIds = useMemo(
    () => (groupsQuery.data ?? []).map((membership) => membership.group_id),
    [groupsQuery.data],
  );
  const groupNamesQuery = useGroupNames(allGroupIds);
  const groupNameById = useMemo(() => {
    const names = new Map<string, string>();
    for (const group of groupNamesQuery.data ?? []) {
      names.set(group.id, group.name);
    }
    return names;
  }, [groupNamesQuery.data]);

  const renameMutation = useRenameGroup();
  const setInviteEnabledMutation = useSetInviteEnabled();
  const regenerateMutation = useRegenerateInviteToken();
  const removeMemberMutation = useRemoveMember();
  const leaveGroupMutation = useLeaveGroup();

  const [nameInput, setNameInput] = useState("");
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);

  // Keeps the editable name field in sync with the loaded/currently-active
  // group's name -- re-syncs whenever the group SWITCHES or the server
  // value changes (e.g. after a successful rename's cache invalidation).
  // Deliberately simple (no separate "dirty" tracking): this field is only
  // ever shown to the OWNER, immediately pre-filled, and a save always
  // sends the field's current text -- there's no scenario here where a
  // background refetch should silently overwrite genuinely unsaved input
  // from a second device, which this project doesn't need to handle yet.
  useEffect(() => {
    if (groupDetailsQuery.data?.name != null) {
      setNameInput(groupDetailsQuery.data.name);
    }
  }, [groupDetailsQuery.data?.name, activeGroupId]);

  useEffect(() => {
    setRemoveTargetUserId(null);
    setLeaveConfirmVisible(false);
  }, [activeGroupId]);

  const currentMembership = groupMembersQuery.data?.find((member) => member.user_id === currentUserId);
  const isOwner = currentMembership?.role === "owner";
  const memberCount = groupMembersQuery.data?.length ?? 0;
  const isLastMember = memberCount === 1;

  const inviteToken = groupDetailsQuery.data?.invite_token;
  const inviteEnabled = groupDetailsQuery.data?.invite_enabled ?? false;
  const inviteLink = inviteToken ? `${INVITE_LINK_SCHEME}${inviteToken}` : "";

  const themeColors = resolveGroupTheme(groupDetailsQuery.data?.color_theme).colors;

  const isLoading = groupsQuery.isLoading || groupDetailsQuery.isLoading || groupMembersQuery.isLoading;
  const isError = groupsQuery.isError || groupDetailsQuery.isError || groupMembersQuery.isError;

  function handleRenameSave() {
    const trimmed = nameInput.trim();
    if (!activeGroupId || trimmed.length === 0) {
      return;
    }
    renameMutation.mutate({ groupId: activeGroupId, newName: trimmed });
  }

  function handleShareInvite() {
    if (!inviteLink) {
      return;
    }
    void Share.share({ message: inviteLink });
  }

  function handleRegenerateInvite() {
    if (!activeGroupId) {
      return;
    }
    regenerateMutation.mutate({ groupId: activeGroupId });
  }

  function handleToggleInviteEnabled() {
    if (!activeGroupId) {
      return;
    }
    setInviteEnabledMutation.mutate({ groupId: activeGroupId, enabled: !inviteEnabled });
  }

  function handleConfirmRemoveMember(userId: string) {
    if (!activeGroupId) {
      return;
    }
    removeMemberMutation.mutate(
      { groupId: activeGroupId, userId },
      { onSuccess: () => setRemoveTargetUserId(null) },
    );
  }

  function handleConfirmLeave() {
    if (!activeGroupId || !currentUserId) {
      return;
    }
    const remainingGroups = (groupsQuery.data ?? []).filter(
      (membership) => membership.group_id !== activeGroupId,
    );

    leaveGroupMutation.mutate(
      { groupId: activeGroupId, userId: currentUserId },
      {
        onSuccess: () => {
          setLeaveConfirmVisible(false);
          if (remainingGroups.length > 0) {
            setActiveGroup(remainingGroups[0].group_id);
          } else {
            router.replace(ONBOARDING_ROUTE);
          }
        },
      },
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <ActivityIndicator testID="group-settings-loading" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <Text testID="group-settings-error" className="text-center text-danger">
          Die Gruppeneinstellungen konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  if (!activeGroupId) {
    return (
      <View className="flex-1 items-center justify-center bg-bg-primary px-4" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <Text testID="group-settings-no-group" className="text-center text-text-primary">
          Keine aktive Gruppe gefunden.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg-primary"
      contentContainerClassName="gap-6 px-4 py-6"
      testID="group-settings-screen">
      <Stack.Screen options={{ title: "Gruppe verwalten" }} />

      <View className="flex-row items-center gap-3" testID="group-settings-header">
        <Ionicons testID="group-settings-theme-swatch" name="ellipse" size={28} color={themeColors.accent} />
        <Text testID="group-settings-name" className="font-display text-xl text-text-primary">
          {groupDetailsQuery.data?.name}
        </Text>
      </View>

      <View className="gap-2" testID="group-settings-switcher">
        <Text className="text-text-secondary">Deine Gruppen</Text>
        {(groupsQuery.data ?? []).map((membership) => {
          const isActive = membership.group_id === activeGroupId;
          return (
            <Pressable
              key={membership.group_id}
              testID={`group-settings-switch-${membership.group_id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveGroup(membership.group_id)}
              className={`rounded-lg border border-border-subtle px-3 py-2 ${isActive ? "bg-accent" : "bg-card"}`}>
              <Text className={isActive ? "text-bg-primary" : "text-text-primary"}>
                {groupDisplayLabel(membership.group_id, groupNameById.get(membership.group_id))}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isOwner ? (
        <View className="gap-2" testID="group-settings-rename-section">
          <Text className="text-text-secondary">Gruppenname</Text>
          <TextInput
            testID="group-settings-name-input"
            value={nameInput}
            onChangeText={setNameInput}
            className="rounded-lg border border-border-subtle bg-card px-3 py-2 text-text-primary"
          />
          {renameMutation.isError ? (
            <Text testID="group-settings-rename-error" className="text-sm text-danger">
              Umbenennen fehlgeschlagen: {(renameMutation.error as { message?: string })?.message}
            </Text>
          ) : null}
          <Button
            testID="group-settings-rename-save-button"
            label="Speichern"
            disabled={nameInput.trim().length === 0}
            loading={renameMutation.isPending}
            onPress={handleRenameSave}
          />
        </View>
      ) : null}

      {isOwner ? (
        <View className="gap-2" testID="group-settings-invite-section">
          <Text className="text-text-secondary">Einladungslink</Text>
          <Text testID="group-settings-invite-link" className="text-text-primary" selectable>
            {inviteLink}
          </Text>
          <View className="flex-row gap-2">
            <Button
              testID="group-settings-invite-share-button"
              label="Teilen"
              variant="secondary"
              className="flex-1"
              onPress={handleShareInvite}
            />
            <Button
              testID="group-settings-invite-regenerate-button"
              label="Neu generieren"
              variant="secondary"
              className="flex-1"
              loading={regenerateMutation.isPending}
              onPress={handleRegenerateInvite}
            />
          </View>
          <Pressable
            testID="group-settings-invite-toggle"
            accessibilityRole="switch"
            accessibilityState={{ checked: inviteEnabled }}
            onPress={handleToggleInviteEnabled}
            className="rounded-lg border border-border-subtle px-3 py-2">
            <Text className="text-text-primary">
              {inviteEnabled ? "Einladungen aktiv" : "Einladungen deaktiviert"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="gap-2" testID="group-settings-member-list">
        <Text className="text-text-secondary">Mitglieder</Text>
        {(groupMembersQuery.data ?? []).map((member) => {
          const isSelf = member.user_id === currentUserId;
          const isRemoving = removeTargetUserId === member.user_id;
          return (
            <View
              key={member.user_id}
              testID={`group-settings-member-${member.user_id}`}
              className="gap-2 rounded-lg border border-border-subtle bg-card p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-text-primary">
                  {memberDisplayLabel(member.user_id, member.profiles?.display_name)}
                </Text>
                <Text testID={`group-settings-member-role-${member.user_id}`} className="text-text-secondary">
                  {member.role === "owner" ? "Owner" : "Mitglied"}
                </Text>
              </View>

              {isOwner && !isSelf ? (
                isRemoving ? (
                  <View testID={`group-settings-member-${member.user_id}-remove-confirm`} className="gap-2">
                    <Text className="text-text-primary">Mitglied wirklich entfernen?</Text>
                    <View className="flex-row gap-2">
                      <Button
                        testID={`group-settings-member-${member.user_id}-remove-cancel-button`}
                        label="Abbrechen"
                        variant="secondary"
                        className="flex-1"
                        onPress={() => setRemoveTargetUserId(null)}
                      />
                      <Button
                        testID={`group-settings-member-${member.user_id}-remove-confirm-button`}
                        label="Entfernen"
                        variant="danger"
                        className="flex-1"
                        loading={removeMemberMutation.isPending}
                        onPress={() => handleConfirmRemoveMember(member.user_id)}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    testID={`group-settings-member-${member.user_id}-remove-button`}
                    label="Entfernen"
                    variant="danger"
                    onPress={() => setRemoveTargetUserId(member.user_id)}
                  />
                )
              ) : null}
            </View>
          );
        })}
      </View>

      <View className="gap-2" testID="group-settings-leave-section">
        {leaveConfirmVisible ? (
          <View testID="group-settings-leave-confirm" className="gap-2">
            <Text testID="group-settings-leave-confirm-copy" className="text-text-primary">
              {isLastMember ? LEAVE_COPY_LAST_MEMBER : isOwner ? LEAVE_COPY_AS_OWNER : LEAVE_COPY_AS_MEMBER}
            </Text>
            <View className="flex-row gap-2">
              <Button
                testID="group-settings-leave-cancel-button"
                label="Abbrechen"
                variant="secondary"
                className="flex-1"
                onPress={() => setLeaveConfirmVisible(false)}
              />
              <Button
                testID="group-settings-leave-confirm-button"
                label="Verlassen"
                variant="danger"
                className="flex-1"
                loading={leaveGroupMutation.isPending}
                onPress={handleConfirmLeave}
              />
            </View>
          </View>
        ) : (
          <Button
            testID="group-settings-leave-button"
            label="Gruppe verlassen"
            variant="danger"
            onPress={() => setLeaveConfirmVisible(true)}
          />
        )}
      </View>
    </ScrollView>
  );
}
