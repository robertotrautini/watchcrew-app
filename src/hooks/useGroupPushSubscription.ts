import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getGroupPushSubscription,
  subscribeToGroupPush,
  unsubscribeFromGroupPush,
} from "@/lib/pushTokens";
import { queryKeys } from "@/lib/queryKeys";

// M10 (part): the per-group push opt-in surface for the Settings hub
// (requirement 1 -- per-group, not global). Built here as this task's own
// deliverable; the PARALLEL Settings-hub task wires this into its
// notifications section UI -- see this file's own exported shape below for
// exactly what that task can call.
//
// Same `useQuery` (current state) + two `useMutation`s (subscribe/
// unsubscribe) + `invalidateQueries` shape as every other group-scoped
// mutation hook in this codebase (e.g. src/hooks/useGroupSettings.ts).

export interface UseGroupPushSubscriptionResult {
  /** `true` once the current subscription-state query has resolved and a row exists; `false` while loading or when not subscribed. */
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => void;
  unsubscribe: () => void;
  /** `true` while either the subscribe or unsubscribe mutation is in flight -- callers can use this to disable the toggle. */
  isMutating: boolean;
}

/**
 * `groupId`/`userId` are both optional so callers can mount this hook before
 * either has resolved yet (e.g. `useCurrentUserId()`/`useActiveGroup()` still
 * loading) -- the query is simply `enabled: false` until both are known, and
 * `subscribe`/`unsubscribe` are no-ops in that case too (there is nothing
 * meaningful to subscribe/unsubscribe from yet).
 */
export function useGroupPushSubscription(
  groupId: string | undefined,
  userId: string | undefined,
): UseGroupPushSubscriptionResult {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.pushSubscription.byGroupUser(groupId, userId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await getGroupPushSubscription({
        groupId: groupId as string,
        userId: userId as string,
      });
      if (error) {
        throw error;
      }
      return data !== null;
    },
    enabled: Boolean(groupId && userId),
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) return;
      const { error } = await subscribeToGroupPush({ groupId, userId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!groupId || !userId) return;
      const { error } = await unsubscribeFromGroupPush({ groupId, userId });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    isSubscribed: query.data ?? false,
    isLoading: query.isLoading,
    subscribe: () => subscribeMutation.mutate(),
    unsubscribe: () => unsubscribeMutation.mutate(),
    isMutating: subscribeMutation.isPending || unsubscribeMutation.isPending,
  };
}
