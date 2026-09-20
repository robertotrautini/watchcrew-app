import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  addToWatchlist,
  deleteWatchlistEntry,
  MovieNotCatalogedError,
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
// Re-exported so callers can `instanceof`-check a mutation's `error`
// without importing from src/lib directly.
export { MovieNotCatalogedError };

export function useToggleLike() {
  return useMutation({
    mutationFn: async (params: ToggleLikeParams) => {
      const { data, error } = await toggleLike(params);
      if (error) {
        throw error;
      }
      return data;
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
    },
  });
}
