import { IconButton } from "@/components/ui/IconButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingArea } from "@/components/ui/LoadingArea";
import { useParallaxScroll } from "@/components/parallaxContext";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { Pressable, Share, View } from "react-native";
import { Text, TextInput } from "@/components/ui/Text";
import { Icon } from "@/components/ui/Icon";
import { CreateGroupSheet } from "@/components/settings/CreateGroupSheet";
import { Select } from "@/components/ui/Select";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";

import { Button } from "@/components/ui/Button";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupDetails, useGroupNames } from "@/hooks/useGroupDetails";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import {
  useCreateGroup,
  useLeaveGroup,
  useRegenerateInviteToken,
  useRemoveMember,
  useRenameGroup,
  useSetGroupTheme,
  useSetInviteEnabled,
} from "@/hooks/useGroupSettings";
import { groupDisplayLabel, memberDisplayLabel } from "@/lib/diaryDisplay";
import {
  GROUP_THEME_LABELS,
  GROUP_THEME_OPTIONS,
  resolveGroupTheme,
  type GroupThemeName,
} from "@/lib/groupTheme";
import { GLASS_INSET_EDGE, GLASS_TILE_CLASSNAME } from "@/components/ui/Glass";

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
 *  - Confirmation pattern for "Entfernen" (kick), "Gruppe verlassen" and
 *    "Neu generieren": the shared `ConfirmDialog` (docs/style-guide.md
 *    "Destruktive Aktionen: immer ConfirmDialog").
 *  - Group switcher needs every one of the user's groups' real NAMEs (not
 *    just the active one's) -- `useUserGroups()` alone can't supply that
 *    (see `useGroupNames`'s own module comment), so this screen loads a
 *    second, small batched query for it.
 */

const INVITE_LINK_SCHEME = "watchcrew://join/";

const LEAVE_COPY_LAST_MEMBER =
  "Du bist das einzige Mitglied. Die Gruppe wird nach 14 Tagen endgültig gelöscht, außer jemand tritt über den Einladungslink wieder bei.";
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
  const parallaxScroll = useParallaxScroll();
  const router = useRouter();
  const currentUserId = useCurrentUserId();
  const { activeGroupId, setActiveGroup, groupsQuery } =
    useActiveGroup(currentUserId);

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
  const setThemeMutation = useSetGroupTheme();
  const setInviteEnabledMutation = useSetInviteEnabled();
  const regenerateMutation = useRegenerateInviteToken();
  const removeMemberMutation = useRemoveMember();
  const leaveGroupMutation = useLeaveGroup();
  const createGroupMutation = useCreateGroup();
  const [createVisible, setCreateVisible] = useState(false);
  const [createSheetKey, setCreateSheetKey] = useState(0);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(
    null,
  );
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [regenerateConfirmVisible, setRegenerateConfirmVisible] =
    useState(false);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- name sync from server value must stay effect-timed
      setNameInput(groupDetailsQuery.data.name);
    }
  }, [groupDetailsQuery.data?.name, activeGroupId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on group switch must stay effect-timed
    setRemoveTargetUserId(null);
    setLeaveConfirmVisible(false);
    setRegenerateConfirmVisible(false);
  }, [activeGroupId]);

  const currentMembership = groupMembersQuery.data?.find(
    (member) => member.user_id === currentUserId,
  );
  const isOwner = currentMembership?.role === "owner";
  const removeTarget = groupMembersQuery.data?.find(
    (member) => member.user_id === removeTargetUserId,
  );
  const removeTargetName = removeTarget
    ? memberDisplayLabel(
        removeTarget.user_id,
        removeTarget.profiles?.display_name,
      )
    : "Das Mitglied";
  const memberCount = groupMembersQuery.data?.length ?? 0;
  const isLastMember = memberCount === 1;
  // Mirrors handle_owner_succession: oldest joined_at, user_id as tiebreak.
  const successor = (groupMembersQuery.data ?? [])
    .filter((member) => member.user_id !== currentUserId)
    .sort(
      (a, b) =>
        new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime() ||
        a.user_id.localeCompare(b.user_id),
    )[0];
  const leaveOwnerCopy = `Du bist Owner. Die Owner-Rolle geht an ${
    successor
      ? memberDisplayLabel(successor.user_id, successor.profiles?.display_name)
      : "ein anderes Mitglied"
  } über.`;

  const inviteToken = groupDetailsQuery.data?.invite_token;
  const inviteEnabled = groupDetailsQuery.data?.invite_enabled ?? false;
  const inviteLink = inviteToken ? `${INVITE_LINK_SCHEME}${inviteToken}` : "";

  const themeColors = resolveGroupTheme(
    groupDetailsQuery.data?.color_theme,
  ).colors;

  const isLoading =
    groupsQuery.isLoading ||
    groupDetailsQuery.isLoading ||
    groupMembersQuery.isLoading;
  const isError =
    groupsQuery.isError ||
    groupDetailsQuery.isError ||
    groupMembersQuery.isError;

  const currentTheme = groupDetailsQuery.data?.color_theme;
  const selectedThemeName: GroupThemeName =
    resolveGroupTheme(currentTheme).name;

  function handleThemeSelect(theme: GroupThemeName) {
    if (!activeGroupId || theme === selectedThemeName) {
      return;
    }
    setThemeMutation.mutate({ groupId: activeGroupId, theme });
  }

  const nameChanged =
    nameInput.trim().length > 0 &&
    nameInput.trim() !== (groupDetailsQuery.data?.name ?? "");

  function handleRenameSave() {
    const trimmed = nameInput.trim();
    if (!activeGroupId || trimmed.length === 0) {
      return;
    }
    renameMutation.mutate({ groupId: activeGroupId, newName: trimmed });
  }

  function handleCreateGroup(params: { name: string; theme: GroupThemeName }) {
    createGroupMutation.mutate(params, {
      onSuccess: (result) => {
        setCreateVisible(false);
        setCreateSheetKey((key) => key + 1); // fresh draft next time
        if (result?.groupId) {
          setActiveGroup(result.groupId);
        }
      },
    });
  }

  function handleShareInvite() {
    if (!inviteLink) {
      return;
    }
    void Share.share({ message: inviteLink });
  }

  function handleConfirmRegenerate() {
    if (!activeGroupId) {
      return;
    }
    regenerateMutation.mutate(
      { groupId: activeGroupId },
      { onSuccess: () => setRegenerateConfirmVisible(false) },
    );
  }

  function handleToggleInviteEnabled() {
    if (!activeGroupId) {
      return;
    }
    setInviteEnabledMutation.mutate({
      groupId: activeGroupId,
      enabled: !inviteEnabled,
    });
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
      <View className="flex-1" testID="group-settings-screen">
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <LoadingArea testID="group-settings-loading" />
      </View>
    );
  }

  if (isError) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        testID="group-settings-screen"
      >
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <Text testID="group-settings-error" className="text-center text-danger">
          Die Gruppeneinstellungen konnten nicht geladen werden.
        </Text>
      </View>
    );
  }

  if (!activeGroupId) {
    return (
      <View
        className="flex-1 items-center justify-center px-4"
        testID="group-settings-screen"
      >
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <EmptyState
          testID="group-settings-no-group"
          icon="group"
          title="Keine aktive Gruppe gefunden."
        />
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

        <View className="z-50 gap-2" testID="group-settings-switcher">
          <Text className="font-title text-lg text-accent-light">
            Deine Gruppen
          </Text>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Select
                testID="group-settings-switch"
                accessibilityLabel="Gruppe wählen"
                value={activeGroupId ?? null}
                options={(groupsQuery.data ?? []).map((membership) => ({
                  value: membership.group_id,
                  label: groupDisplayLabel(
                    membership.group_id,
                    groupNameById.get(membership.group_id),
                  ),
                }))}
                onChange={setActiveGroup}
                onOpenChange={setSwitchOpen}
              />
            </View>
            <IconButton
              testID="group-settings-create-button"
              icon="add"
              variant="accent"
              accessibilityLabel="Neue Gruppe anlegen"
              onPress={() => setCreateVisible(true)}
            />
          </View>
        </View>

        {isOwner ? (
          <View
            className="gap-2"
            testID="group-settings-rename-section"
            pointerEvents={switchOpen ? "none" : "auto"}
          >
            <Text className="font-title text-lg text-accent-light">
              Gruppenname
            </Text>
            <View
              testID="group-settings-rename-row"
              className="flex-row items-center gap-3"
            >
              <TextInput
                testID="group-settings-name-input"
                value={nameInput}
                onChangeText={setNameInput}
                className={`flex-1 rounded-lg ${GLASS_INSET_EDGE} bg-black/35 px-3 py-2 text-text-primary`}
              />
              <IconButton
                testID="group-settings-rename-save-button"
                icon="save"
                variant="accent"
                accessibilityLabel="Gruppenname speichern"
                disabled={!nameChanged}
                loading={renameMutation.isPending}
                onPress={handleRenameSave}
              />
            </View>
            {renameMutation.isError ? (
              <Text
                testID="group-settings-rename-error"
                className="text-sm text-danger"
              >
                Umbenennen fehlgeschlagen:{" "}
                {(renameMutation.error as { message?: string })?.message}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isOwner ? (
          <View className="gap-2" testID="group-settings-theme-section">
            <Text className="font-title text-lg text-accent-light">
              Farbthema
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {GROUP_THEME_OPTIONS.map((themeName) => {
                const { colors } = resolveGroupTheme(themeName);
                const isSelected = selectedThemeName === themeName;

                return (
                  <Pressable
                    key={themeName}
                    testID={`group-settings-theme-swatch-${themeName}`}
                    accessibilityRole="button"
                    accessibilityLabel={GROUP_THEME_LABELS[themeName]}
                    accessibilityState={{
                      selected: isSelected,
                      disabled: setThemeMutation.isPending,
                    }}
                    disabled={setThemeMutation.isPending}
                    onPress={() => handleThemeSelect(themeName)}
                    className="h-touch-comfortable w-touch-comfortable items-center justify-center"
                  >
                    <Icon name="swatch" size="L" color={colors.accent} />
                    {isSelected ? (
                      <Icon
                        testID={`group-settings-theme-selected-${themeName}`}
                        name="selected"
                        size="S"
                        color={themeColors.accent}
                        className="absolute -right-1 -top-1"
                      />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {setThemeMutation.isError ? (
              <Text
                testID="group-settings-theme-error"
                className="text-sm text-danger"
              >
                Farbthema konnte nicht geändert werden:{" "}
                {(setThemeMutation.error as { message?: string })?.message}
              </Text>
            ) : null}
          </View>
        ) : null}

        {isOwner ? (
          <View className="gap-2" testID="group-settings-invite-section">
            <Text className="font-title text-lg text-accent-light">
              Einladungslink
            </Text>
            <Text
              testID="group-settings-invite-link"
              className="text-text-primary"
              selectable
            >
              {inviteLink}
            </Text>
            <View className="flex-row gap-2">
              <Button
                testID="group-settings-invite-share-button"
                label="Teilen"
                icon="share"
                variant="secondary"
                className="flex-1"
                onPress={handleShareInvite}
              />
              <Button
                testID="group-settings-invite-regenerate-button"
                label="Neu generieren"
                icon="regenerate"
                variant="secondary"
                className="flex-1"
                loading={regenerateMutation.isPending}
                onPress={() => setRegenerateConfirmVisible(true)}
              />
            </View>
            <View className={GLASS_TILE_CLASSNAME}>
              <SettingsToggleRow
                testID="group-settings-invite-toggle"
                checked={inviteEnabled}
                onPress={handleToggleInviteEnabled}
                label={
                  inviteEnabled
                    ? "Einladungen aktiv"
                    : "Einladungen deaktiviert"
                }
              />
            </View>
          </View>
        ) : null}

        <View className="gap-2" testID="group-settings-member-list">
          <Text className="font-title text-lg text-accent-light">
            Mitglieder
          </Text>
          {(groupMembersQuery.data ?? []).map((member) => {
            const isSelf = member.user_id === currentUserId;
            return (
              <View
                key={member.user_id}
                testID={`group-settings-member-${member.user_id}`}
                className="gap-2"
              >
                <View className="flex-row items-center gap-3">
                  <View
                    testID={`group-settings-member-capsule-${member.user_id}`}
                    className={`flex-1 flex-row items-center gap-3 ${GLASS_TILE_CLASSNAME} px-3 py-3`}
                  >
                    <Text
                      className="flex-1 text-text-primary"
                      numberOfLines={1}
                    >
                      {memberDisplayLabel(
                        member.user_id,
                        member.profiles?.display_name,
                      )}
                    </Text>
                    <Text
                      testID={`group-settings-member-role-${member.user_id}`}
                      className="text-text-secondary"
                    >
                      {member.role === "owner" ? "Owner" : "Mitglied"}
                    </Text>
                  </View>
                  {isOwner && !isSelf ? (
                    <IconButton
                      testID={`group-settings-member-${member.user_id}-remove-button`}
                      icon="removeMember"
                      variant="danger"
                      accessibilityLabel="Mitglied entfernen"
                      onPress={() => setRemoveTargetUserId(member.user_id)}
                    />
                  ) : isOwner ? (
                    <View
                      testID={`group-settings-member-${member.user_id}-remove-placeholder`}
                      className="h-12 w-12 shrink-0"
                    />
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        <View className="gap-2" testID="group-settings-leave-section">
          <Button
            testID="group-settings-leave-button"
            label="Gruppe verlassen"
            icon="leave"
            variant="danger"
            onPress={() => setLeaveConfirmVisible(true)}
          />
        </View>
      </KeyboardAwareScrollView>
      <ConfirmDialog
        visible={removeTargetUserId != null}
        testID={`group-settings-member-${removeTargetUserId ?? "none"}-remove`}
        title="Mitglied entfernen?"
        description={`${removeTargetName} verliert den Zugriff auf die Gruppe. Bewertungen bleiben erhalten.`}
        confirmLabel="Entfernen"
        confirmIcon="removeMember"
        loading={removeMemberMutation.isPending}
        onCancel={() => setRemoveTargetUserId(null)}
        onConfirm={() =>
          removeTargetUserId && handleConfirmRemoveMember(removeTargetUserId)
        }
      />
      <ConfirmDialog
        visible={regenerateConfirmVisible}
        testID="group-settings-invite-regenerate"
        title="Einladungslink neu generieren?"
        description="Der bisherige Einladungslink wird ungültig. Wer ihn noch hat, kann der Gruppe nicht mehr beitreten."
        confirmLabel="Neu generieren"
        confirmIcon="regenerate"
        loading={regenerateMutation.isPending}
        onCancel={() => setRegenerateConfirmVisible(false)}
        onConfirm={handleConfirmRegenerate}
      />
      <ConfirmDialog
        visible={leaveConfirmVisible}
        testID="group-settings-leave"
        title="Gruppe verlassen?"
        description={
          isLastMember
            ? LEAVE_COPY_LAST_MEMBER
            : isOwner
              ? leaveOwnerCopy
              : LEAVE_COPY_AS_MEMBER
        }
        confirmLabel="Verlassen"
        confirmIcon="leave"
        loading={leaveGroupMutation.isPending}
        onCancel={() => setLeaveConfirmVisible(false)}
        onConfirm={handleConfirmLeave}
      />
      <CreateGroupSheet
        key={createSheetKey}
        visible={createVisible}
        loading={createGroupMutation.isPending}
        onCancel={() => setCreateVisible(false)}
        onCreate={handleCreateGroup}
      />
      <SettingsBackBar />
    </View>
  );
}
