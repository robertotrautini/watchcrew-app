import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import {
  addToWatchlist,
  deleteWatchlistEntry,
  toggleLike,
  type AddToWatchlistParams,
  type DeleteWatchlistEntryParams,
  type ToggleLikeParams,
} from "@/lib/movieDetailMutations";

// M6 part 2a: TanStack Query mutations for the Movie Detail Overlay's write
// operations. Thin `useMutation` wrappers over src/lib/movieDetailMutations.ts,
// matching the query-hook convention in src/hooks/useGroupWatchlist.ts: the
// underlying `src/lib` functions never throw (they resolve Supabase's raw
// `{ data, error }` tuple), so each `mutationFn` here throws on `error`
// itself to route into React Query's native error channel
// (isError/error/onError).
//
// M7 part 2: `MovieNotCatalogedError` no longer exists (resolved -- see
// src/lib/movieDetailMutations.ts's `addToWatchlist`), so it's no longer
// re-exported here either.

/**
 * `groupId` is accepted alongside the like-toggle target purely so this hook
 * can invalidate the affected group's `["watchlist", groupId]` query (the
 * exact key used by `useGroupWatchlist`) on success -- same rationale as
 * `DeleteWatchlistEntryMutationParams` below. Without this, the Watchlist/
 * Tagebuch screens' like-heart state wouldn't visually refresh after a
 * like-toggle from the Detail-Overlay until something else triggered a
 * refetch (a real bug, fixed in the M6 cleanup pass -- see
 * docs/interim-decisions.md).
 */
export interface ToggleLikeMutationParams extends ToggleLikeParams {
  groupId: string;
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ToggleLikeMutationParams) => {
      // Destructured (not `toggleLike(params)` directly) so `groupId` --
      // a mutation-only variable, not part of `ToggleLikeParams` -- never
      // reaches the underlying lib call.
      const { watchlistEntryId, memberId, nextLiked, existingRatingId } = params;
      const { data, error } = await toggleLike({
        watchlistEntryId,
        memberId,
        nextLiked,
        existingRatingId,
      });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", variables.groupId] });
    },
  });
}

/**
 * `groupId` is accepted alongside the delete target purely so this hook can
 * invalidate the affected group's `["watchlist", groupId]` query (the exact
 * key used by `useGroupWatchlist`) on success -- the alternative considered
 * was an `onSuccess` callback supplied by the caller, but since the caller
 * already knows the groupId (the overlay is always opened from within a
 * specific group's watchlist), passing it as a mutation variable keeps the
 * invalidation logic co-located with the mutation instead of duplicated at
 * every call site.
 */
export interface DeleteWatchlistEntryMutationParams extends DeleteWatchlistEntryParams {
  groupId: string;
}

export function useDeleteWatchlistEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeleteWatchlistEntryMutationParams) => {
      const { error } = await deleteWatchlistEntry({ watchlistEntryId: params.watchlistEntryId });
      if (error) {
        throw error;
      }
      return params.watchlistEntryId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", variables.groupId] });
    },
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddToWatchlistParams) => {
      const { data, error } = await addToWatchlist(params);
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", variables.groupId] });
      // M11 (haptic polish, see docs/interim-decisions.md "M11 — Haptik"):
      // centralized here (rather than at each of this hook's call sites --
      // MovieDetailActionsBar's "zur_watchlist"/"direkt_bewerten" buttons
      // AND the Add-Movie-Modal's per-tile quick-add "+") so every
      // successful add-to-watchlist gets the same light confirmation
      // impact, in exactly one place.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });
}
