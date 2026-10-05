import { useQuery } from "@tanstack/react-query";

import { getGroupMembers } from "@/lib/groups";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Wraps `getGroupMembers` (src/lib/groups.ts) in TanStack Query — mirrors
 * `useUserGroups`'s conventions exactly, but group-centric rather than
 * user-centric: this is a group's full current membership, used by the
 * Watchlist screen to compute the "x/y bewertet" progress badge's total
 * member count (`WatchlistPosterCard`'s `totalMembers` prop).
 *
 * `getGroupMembers` never throws — it always resolves Supabase's raw
 * `{ data, error }` tuple, even on failure. This hook translates that
 * tuple-style result into React Query's native error channel.
 */
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.groupMembers.byGroup(groupId),
    queryFn: async () => {
      const { data, error } = await getGroupMembers(groupId as string);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!groupId,
  });
}
