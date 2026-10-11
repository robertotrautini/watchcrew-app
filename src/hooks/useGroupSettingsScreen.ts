import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

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
import { memberDisplayLabel } from "@/lib/diaryDisplay";
import { resolveGroupTheme, type GroupThemeName } from "@/lib/groupTheme";

export const INVITE_LINK_SCHEME = "watchcrew://join/";

export const LEAVE_COPY_LAST_MEMBER =
  "Du bist das einzige Mitglied. Die Gruppe wird nach 14 Tagen endgültig gelöscht, außer jemand tritt über den Einladungslink wieder bei.";
export const LEAVE_COPY_AS_MEMBER = "Möchtest du die Gruppe wirklich verlassen?";

// Same target string src/app/index.tsx's useAuthGate 'onboarding' redirect
// uses, and the same reasoning as M9 part 1's create-or-join-group.tsx
// `APP_HOME_ROUTE` comment: `useAuthGate` only re-evaluates on a genuine
// Supabase auth event, not on a plain `watch_group_members` row deletion
// with the same session still active -- leaving your only/last group would
// otherwise strand you here with zero groups and no gate re-check. The
// screen navigates there explicitly instead of relying on the gate.
const ONBOARDING_ROUTE = "/(onboarding)/create-or-join-group";

/**
 * Controller for the Group-Settings screen (src/app/(app)/(modals)/group-settings.tsx):
 * loads the active group's details/members, owns the dialog/input state and
 * the mutation handlers, and derives permissions (`isOwner`) and the
 * leave-dialog copy. The screen and its section components only render.
 */
export function useGroupSettingsScreen() {
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
  const setThemeMutation = useSetGroupTheme();
  const setInviteEnabledMutation = useSetInviteEnabled();
  const regenerateMutation = useRegenerateInviteToken();
  const removeMemberMutation = useRemoveMember();
  const leaveGroupMutation = useLeaveGroup();
  const createGroupMutation = useCreateGroup();
  const [createVisible, setCreateVisible] = useState(false);

  const [switchOpen, setSwitchOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [removeTargetUserId, setRemoveTargetUserId] = useState<string | null>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [regenerateConfirmVisible, setRegenerateConfirmVisible] = useState(false);

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

  const members = groupMembersQuery.data ?? [];
  const currentMembership = members.find((member) => member.user_id === currentUserId);
  const isOwner = currentMembership?.role === "owner";
  const removeTarget = members.find((member) => member.user_id === removeTargetUserId);
  const removeTargetName = removeTarget
    ? memberDisplayLabel(removeTarget.user_id, removeTarget.profiles?.display_name)
    : "Das Mitglied";
  const isLastMember = members.length === 1;
  // Mirrors handle_owner_succession: oldest joined_at, user_id as tiebreak.
  const successor = [...members]
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
  const leaveDescription = isLastMember
    ? LEAVE_COPY_LAST_MEMBER
    : isOwner
      ? leaveOwnerCopy
      : LEAVE_COPY_AS_MEMBER;

  const inviteToken = groupDetailsQuery.data?.invite_token;
  const inviteEnabled = groupDetailsQuery.data?.invite_enabled ?? false;
  const inviteLink = inviteToken ? `${INVITE_LINK_SCHEME}${inviteToken}` : "";

  const themeColors = resolveGroupTheme(groupDetailsQuery.data?.color_theme).colors;
  const selectedThemeName: GroupThemeName = resolveGroupTheme(
    groupDetailsQuery.data?.color_theme,
  ).name;

  const isLoading =
    groupsQuery.isLoading || groupDetailsQuery.isLoading || groupMembersQuery.isLoading;
  const isError = groupsQuery.isError || groupDetailsQuery.isError || groupMembersQuery.isError;

  const nameChanged =
    nameInput.trim().length > 0 && nameInput.trim() !== (groupDetailsQuery.data?.name ?? "");

  function handleThemeSelect(theme: GroupThemeName) {
    if (!activeGroupId || theme === selectedThemeName) {
      return;
    }
    setThemeMutation.mutate({ groupId: activeGroupId, theme });
  }

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
        if (result?.groupId) {
          setActiveGroup(result.groupId);
        }
      },
    });
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

  return {
    activeGroupId,
    setActiveGroup,
    groups: groupsQuery.data ?? [],
    groupNameById,
    members,
    currentUserId,
    isOwner,
    isLoading,
    isError,
    // switcher / create
    switchOpen,
    setSwitchOpen,
    createVisible,
    setCreateVisible,
    createGroupMutation,
    handleCreateGroup,
    // rename
    nameInput,
    setNameInput,
    nameChanged,
    renameMutation,
    handleRenameSave,
    // theme
    selectedThemeName,
    themeColors,
    setThemeMutation,
    handleThemeSelect,
    // invite
    inviteLink,
    inviteEnabled,
    regenerateMutation,
    regenerateConfirmVisible,
    setRegenerateConfirmVisible,
    handleToggleInviteEnabled,
    handleConfirmRegenerate,
    // members
    removeTargetUserId,
    setRemoveTargetUserId,
    removeTargetName,
    removeMemberMutation,
    handleConfirmRemoveMember,
    // leave
    leaveConfirmVisible,
    setLeaveConfirmVisible,
    leaveDescription,
    leaveGroupMutation,
    handleConfirmLeave,
  };
}
