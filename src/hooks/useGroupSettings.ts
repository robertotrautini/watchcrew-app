import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GroupThemeName } from "@/lib/groupTheme";
import { showToast } from "@/lib/toast";

import {
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, newName }: RenameGroupParams) => {
      const { data, error } = await renameWatchGroup(groupId, newName);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupDetails.byGroup(variables.groupId),
      });
      // Prefix match: the group switcher chips read the name from every
      // ["userGroups", userId] query.
      queryClient.invalidateQueries({ queryKey: queryKeys.userGroups.all });
      // "Deine Gruppen" chips read names via useGroupNames: ["groupNames", groupIds].
      queryClient.invalidateQueries({ queryKey: queryKeys.groupNames.all });
      showToast("Gruppe umbenannt", { variant: "success" });
    },
    onError: () => {
      showToast("Gruppe konnte nicht umbenannt werden", { variant: "error" });
    },
  });
}

export interface SetGroupThemeParams {
  groupId: string;
  theme: GroupThemeName;
}

export function useSetGroupTheme() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, theme }: SetGroupThemeParams) => {
      const { data, error } = await setGroupColorTheme(groupId, theme);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupDetails.byGroup(variables.groupId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupNames.all });
      showToast("Farbthema geändert", { variant: "success" });
    },
    onError: () => {
      showToast("Farbthema konnte nicht geändert werden", { variant: "error" });
    },
  });
}

export interface SetInviteEnabledParams {
  groupId: string;
  enabled: boolean;
}

export function useSetInviteEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, enabled }: SetInviteEnabledParams) => {
      const { data, error } = await setInviteEnabled(groupId, enabled);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupDetails.byGroup(variables.groupId),
      });
    },
  });
}

export interface RegenerateInviteTokenParams {
  groupId: string;
}

export function useRegenerateInviteToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId }: RegenerateInviteTokenParams) => {
      const { data, error } = await regenerateInviteToken(groupId);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupDetails.byGroup(variables.groupId),
      });
    },
  });
}

export interface RemoveMemberParams {
  groupId: string;
  userId: string;
}

/** Owner "Entfernen" (kick) action -- invalidates only this group's own member list, since the kicked user isn't the caller. */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: RemoveMemberParams) => {
      const { error } = await removeMember(groupId, userId);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers.byGroup(variables.groupId),
      });
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, userId }: LeaveGroupParams) => {
      const { error } = await removeMember(groupId, userId);
      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.groupMembers.byGroup(variables.groupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.userGroups.byUser(variables.userId),
      });
    },
  });
}
