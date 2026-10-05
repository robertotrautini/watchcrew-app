import { EmptyState } from "@/components/ui/EmptyState";
import { useParallaxScroll } from "@/components/parallaxContext";
import { Stack, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { SettingsBackBar } from "@/components/settings/SettingsBackBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import {
  ActivityIndicator,
  Pressable,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { Icon } from "@/components/ui/Icon";
import { SettingsToggleRow } from "@/components/settings/SettingsToggleRow";

import {
  Button,
  BUTTON_ICON_COLORS,
  BUTTON_ICON_COLOR_DISABLED,
} from "@/components/ui/Button";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useGroupDetails, useGroupNames } from "@/hooks/useGroupDetails";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import {
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
import {
  GLASS_EDGE,
  GLASS_INSET_EDGE,
  GLASS_TILE_CLASSNAME,
} from "@/components/ui/Glass";

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

  const [nameInput, setNameInput] = useState("");
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(
    null,
  );
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

  const currentMembership = groupMembersQuery.data?.find(
    (member) => member.user_id === currentUserId,
  );
  const isOwner = currentMembership?.role === "owner";
  const memberCount = groupMembersQuery.data?.length ?? 0;
  const isLastMember = memberCount === 1;

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
      <View
        className="flex-1 items-center justify-center"
        testID="group-settings-screen"
      >
        <Stack.Screen options={{ title: "Gruppe verwalten" }} />
        <ActivityIndicator testID="group-settings-loading" />
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

        <View
          className="flex-row items-center gap-3"
          testID="group-settings-header"
        >
          <Icon
            testID="group-settings-theme-swatch"
            name="swatch"
            size="M"
            color={themeColors.accent}
          />
          <Text
            testID="group-settings-name"
            className="font-display text-xl text-text-primary"
          >
            {groupDetailsQuery.data?.name}
          </Text>
        </View>

        <View className="gap-2" testID="group-settings-switcher">
          <Text className="font-display text-lg text-accent-light">
            Deine Gruppen
          </Text>
          {(groupsQuery.data ?? []).map((membership) => {
            const isActive = membership.group_id === activeGroupId;
            return (
              <Button
                key={membership.group_id}
                testID={`group-settings-switch-${membership.group_id}`}
                variant={isActive ? "primary" : "secondary"}
                size="sm"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveGroup(membership.group_id)}
                label={groupDisplayLabel(
                  membership.group_id,
                  groupNameById.get(membership.group_id),
                )}
              />
            );
          })}
        </View>

        {isOwner ? (
          <View className="gap-2" testID="group-settings-rename-section">
            <Text className="font-display text-lg text-accent-light">
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
              <Button
                testID="group-settings-rename-save-button"
                variant="primary"
                iconOnly
                accessibilityLabel="Gruppenname speichern"
                accessibilityRole="button"
                disabled={!nameChanged}
                loading={renameMutation.isPending}
                onPress={handleRenameSave}
              >
                <Icon
                  name="save"
                  size="M"
                  color={
                    nameChanged
                      ? BUTTON_ICON_COLORS.primary
                      : BUTTON_ICON_COLOR_DISABLED
                  }
                />
              </Button>
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
            <Text className="font-display text-lg text-accent-light">
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
            <Text className="font-display text-lg text-accent-light">
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
                onPress={handleRegenerateInvite}
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
          <Text className="font-display text-lg text-accent-light">
            Mitglieder
          </Text>
          {(groupMembersQuery.data ?? []).map((member) => {
            const isSelf = member.user_id === currentUserId;
            const isRemoving = removeTargetUserId === member.user_id;
            return (
              <View
                key={member.user_id}
                testID={`group-settings-member-${member.user_id}`}
                className={`gap-2 ${GLASS_TILE_CLASSNAME} p-3`}
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-text-primary">
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
                  isRemoving ? (
                    <View
                      testID={`group-settings-member-${member.user_id}-remove-confirm`}
                      className="gap-2"
                    >
                      <Text className="text-text-primary">
                        Mitglied wirklich entfernen?
                      </Text>
                      <View className="flex-row gap-2">
                        <Button
                          testID={`group-settings-member-${member.user_id}-remove-cancel-button`}
                          label="Abbrechen"
                          icon="close"
                          variant="secondary"
                          className="flex-1"
                          onPress={() => setRemoveTargetUserId(null)}
                        />
                        <Button
                          testID={`group-settings-member-${member.user_id}-remove-confirm-button`}
                          label="Entfernen"
                          icon="removeMember"
                          variant="danger"
                          className="flex-1"
                          loading={removeMemberMutation.isPending}
                          onPress={() =>
                            handleConfirmRemoveMember(member.user_id)
                          }
                        />
                      </View>
                    </View>
                  ) : (
                    <Button
                      testID={`group-settings-member-${member.user_id}-remove-button`}
                      label="Entfernen"
                      icon="removeMember"
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
              <Text
                testID="group-settings-leave-confirm-copy"
                className="text-text-primary"
              >
                {isLastMember
                  ? LEAVE_COPY_LAST_MEMBER
                  : isOwner
                    ? LEAVE_COPY_AS_OWNER
                    : LEAVE_COPY_AS_MEMBER}
              </Text>
              <View className="flex-row gap-2">
                <Button
                  testID="group-settings-leave-cancel-button"
                  label="Abbrechen"
                  icon="close"
                  variant="secondary"
                  className="flex-1"
                  onPress={() => setLeaveConfirmVisible(false)}
                />
                <Button
                  testID="group-settings-leave-confirm-button"
                  label="Verlassen"
                  icon="leave"
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
              icon="leave"
              variant="danger"
              onPress={() => setLeaveConfirmVisible(true)}
            />
          )}
        </View>
      </KeyboardAwareScrollView>
      <SettingsBackBar />
    </View>
  );
}
