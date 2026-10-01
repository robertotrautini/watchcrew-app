import { useQuery } from '@tanstack/react-query';

import { getUserGroups } from '@/lib/groups';

/**
 * Wraps `getUserGroups` (src/lib/groups.ts) in TanStack Query.
 *
 * `getUserGroups` never throws — it always resolves Supabase's raw
 * `{ data, error }` tuple, even on failure. This hook translates that
 * tuple-style result into React Query's native error channel (throwing
 * `error` when present) so consumers can rely on the usual
 * `isLoading`/`data`/`error`/`isError` states instead of re-checking a
 * tuple themselves.
 */
export function userGroupsQueryOptions(userId: string | undefined) {
  return {
    queryKey: ['userGroups', userId],
    queryFn: async () => {
      const { data, error } = await getUserGroups(userId as string);
      if (error) {
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  };
}

export function useUserGroups(userId: string | undefined) {
  return useQuery(userGroupsQueryOptions(userId));
}
