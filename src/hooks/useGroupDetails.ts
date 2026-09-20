import { useQuery } from "@tanstack/react-query";

import { getWatchGroupDetails, getWatchGroupsByIds } from "@/lib/groups";

/**
 * Wraps `getWatchGroupDetails` (src/lib/groups.ts) in TanStack Query --
 * mirrors `useGroupMembers`'s conventions exactly. A group's OWN row
 * (`name`/`color_theme`/`invite_token`/`invite_enabled`) was never exposed
 * anywhere in the client before the M9 part 2 Group-Settings screen needed
 * it -- `useUserGroups`/`useGroupMembers` only ever return
 * `watch_group_members` rows, never the group's own data.
 *
 * `getWatchGroupDetails` never throws -- it always resolves Supabase's raw
 * `{ data, error }` tuple, even on failure. This hook translates that into
 * React Query's native error channel (throwing on `error`).
 */
export function useGroupDetails(groupId: string | undefined) {
  return useQuery({
    queryKey: ["groupDetails", groupId],
    queryFn: async () => {
      const { data, error } = await getWatchGroupDetails(groupId as string);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!groupId,
  });
}

/**
 * Batched `watch_groups` rows for a set of group ids, keyed by id -- powers
 * the Group-Settings screen's group SWITCHER (needs every one of the user's
 * groups' real NAMEs, not just the currently-active one's). See
 * `getWatchGroupsByIds` (src/lib/groups.ts) for why this is a separate
 * batched lookup rather than something `useUserGroups` already returns.
 *
 * `groupIds` is used directly as (part of) the query key -- stable as long
 * as the caller passes the same array reference/values, which
 * `useUserGroups()`'s own memoized-by-TanStack-Query `data` array already
 * guarantees between re-renders with no new data.
 */
export function useGroupNames(groupIds: string[]) {
  return useQuery({
    queryKey: ["groupNames", groupIds],
    queryFn: async () => {
      const { data, error } = await getWatchGroupsByIds(groupIds);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: groupIds.length > 0,
  });
}
