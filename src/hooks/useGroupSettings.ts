import { useAppMutation } from "@/hooks/useAppMutation";
import type { GroupThemeName } from "@/lib/groupTheme";

import {
  createWatchGroup,
  regenerateInviteToken,
  removeMember,
  renameWatchGroup,
  setGroupColorTheme,
  setInviteEnabled,
} from "@/lib/groups";
import { queryKeys } from "@/lib/queryKeys";

// M9 part 2 (Group-Settings screen): TanStack Query mutations for the
// screen's own rename/invite-link/remove-member/leave-group flows. Same
// `useMutation` + throw-on-`error` + `invalidateQueries` convention as
// src/hooks/useTrackerPayments.ts -- the underlying src/lib/groups.ts
// functions never throw (they resolve Supabase's raw `{ data, error }`
// tuple), so each `mutationFn` here throws on `error` itself to route into
// React Query's native error channel.

export interface RenameGroupParams {
  groupId: string;
  newName: string;
}

export function useRenameGroup() {
  return useAppMutation({
    mutationFn: async ({ groupId, newName }: RenameGroupParams) => {
      const { data, error } = await renameWatchGroup(groupId, newName);
      if (error) {
        throw error;
      }
      return data;
    },
    // Prefix match: the group switcher chips read the name from every
    // ["userGroups", userId] query; "Deine Gruppen" chips read names via
    // useGroupNames: ["groupNames", groupIds].
    invalidateKeys: (variables) => [
      queryKeys.groupDetails.byGroup(variables.groupId),
      queryKeys.userGroups.all,
      queryKeys.groupNames.all,
    ],
    successToast: "Gruppe umbenannt",
    errorToast: "Gruppe konnte nicht umbenannt werden",
  });
}

export interface SetGroupThemeParams {
  groupId: string;
  theme: GroupThemeName;
}

export function useSetGroupTheme() {
  return useAppMutation({
    mutationFn: async ({ groupId, theme }: SetGroupThemeParams) => {
      const { data, error } = await setGroupColorTheme(groupId, theme);
      if (error) {
        throw error;
      }
      return data;
    },
    invalidateKeys: (variables) => [
      queryKeys.groupDetails.byGroup(variables.groupId),
      queryKeys.groupNames.all,
    ],
    successToast: "Farbthema geändert",
    errorToast: "Farbthema konnte nicht geändert werden",
  });
}

export interface SetInviteEnabledParams {
  groupId: string;
  enabled: boolean;
}

export function useSetInviteEnabled() {
  return useAppMutation({
    mutationFn: async ({ groupId, enabled }: SetInviteEnabledParams) => {
      const { data, error } = await setInviteEnabled(groupId, enabled);
      if (error) {
        throw error;
      }
      return data;
    },
    invalidateKeys: (variables) => [queryKeys.groupDetails.byGroup(variables.groupId)],
  });
}

export interface RegenerateInviteTokenParams {
  groupId: string;
}

export function useRegenerateInviteToken() {
  return useAppMutation({
    mutationFn: async ({ groupId }: RegenerateInviteTokenParams) => {
      const { data, error } = await regenerateInviteToken(groupId);
      if (error) {
        throw error;
      }
      return data;
    },
    invalidateKeys: (variables) => [queryKeys.groupDetails.byGroup(variables.groupId)],
  });
}

export interface RemoveMemberParams {
  groupId: string;
  userId: string;
}

/** Owner "Entfernen" (kick) action -- invalidates only this group's own member list, since the kicked user isn't the caller. */
export function useRemoveMember() {
  return useAppMutation({
    mutationFn: async ({ groupId, userId }: RemoveMemberParams) => {
      const { error } = await removeMember(groupId, userId);
      if (error) {
        throw error;
      }
    },
    invalidateKeys: (variables) => [queryKeys.groupMembers.byGroup(variables.groupId)],
  });
}

export interface LeaveGroupParams {
  groupId: string;
  userId: string;
}

/**
 * "Gruppe verlassen" -- reuses the exact same `removeMember` write as the
 * owner's kick action (both reduce to the same DELETE, and RLS's
 * `watch_group_members_delete_owner_or_self` policy allows a self-delete
 * regardless of role). A SEPARATE hook from `useRemoveMember` purely for
 * cache invalidation: leaving changes the CALLER's own group membership
 * list too (`["userGroups", userId]`), not just the group's member roster.
 */
export function useLeaveGroup() {
  return useAppMutation({
    mutationFn: async ({ groupId, userId }: LeaveGroupParams) => {
      const { error } = await removeMember(groupId, userId);
      if (error) {
        throw error;
      }
    },
    invalidateKeys: (variables) => [
      queryKeys.groupMembers.byGroup(variables.groupId),
      queryKeys.userGroups.byUser(variables.userId),
    ],
  });
}

export interface CreateGroupParams {
  name: string;
  theme: GroupThemeName;
}

/**
 * "Neue Gruppe anlegen" -- wraps the same `create_watch_group` RPC wrapper the
 * onboarding screen uses (caller becomes owner). Invalidates every group list
 * cache; the caller activates the new group via the returned `groupId`.
 */
export function useCreateGroup() {
  return useAppMutation({
    mutationFn: async ({ name, theme }: CreateGroupParams) => {
      const { data, error } = await createWatchGroup(name, theme);
      if (error) {
        throw error;
      }
      return data;
    },
    invalidateKeys: [queryKeys.userGroups.all, queryKeys.groupNames.all],
    successToast: "Gruppe angelegt",
    errorToast: "Gruppe konnte nicht angelegt werden",
  });
}
