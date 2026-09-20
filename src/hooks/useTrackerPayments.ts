import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deletePayment, savePayment } from "@/lib/movieDetailMutations";
import { resolvePaymentDate } from "@/lib/ratingLogic";

// M8 (Bezahl-Tracker): TanStack Query mutations for the Tracker screen's own
// payment-set/edit/delete flows. Same `useMutation` + throw-on-`error` +
// invalidate-`["watchlist", groupId]` convention as
// src/hooks/useSaveRating.ts/useMovieDetailMutations.ts -- the underlying
// src/lib/movieDetailMutations.ts functions never throw (they resolve
// Supabase's raw `{ data, error }` tuple), so each `mutationFn` here throws
// on `error` itself to route into React Query's native error channel.
//
// Deliberately a NEW, separate file from useSaveRating.ts: that hook's
// `useSaveRating` bundles a RATING write together with an optional payment
// write (the Rating-Dialog's own combined save) -- the Tracker's own
// "Zahlung erfassen"/"Bearbeiten"/"Löschen" flows never touch a rating row
// at all, so reusing that hook would mean either always sending a no-op
// rating upsert or awkwardly making the rating half optional. Both new
// hooks here instead call `savePayment`/`deletePayment`
// (src/lib/movieDetailMutations.ts) directly.

export interface SetPaymentMutationParams {
  /** Needed purely to invalidate the right `["watchlist", groupId]` cache entry on success. */
  groupId: string;
  watchlistEntryId: string;
  paidByMemberId: string;
  /**
   * The date field's currently-entered value (ISO "YYYY-MM-DD", from
   * `DateField`). Resolved through the SAME `resolvePaymentDate` priority
   * chain used everywhere else in the app (src/lib/ratingLogic.ts) --
   * except the Tracker's own flows have no "Gesehen am" date to fall back
   * to (there's no rating context here), so `seenAtDate` is always passed
   * as `null`: the effective chain is simply
   * explicit date > existing paid_at > "now" (see
   * docs/interim-decisions.md "M8" for why this is still a direct reuse of
   * `resolvePaymentDate`, not a reimplementation, and not a new function).
   */
  explicitDate: string | null | undefined;
  /** The entry's current `paid_at`, if any -- NEVER silently overwritten (same rule as everywhere else). */
  existingPaidAt: string | null | undefined;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: Date;
}

export function useSetPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SetPaymentMutationParams) => {
      const now = params.now ?? new Date();
      const paidAt = resolvePaymentDate(params.explicitDate, params.existingPaidAt, null, now);

      const { data, error } = await savePayment({
        watchlistEntryId: params.watchlistEntryId,
        paidByMemberId: params.paidByMemberId,
        paidAt,
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

export interface DeletePaymentMutationParams {
  /** Needed purely to invalidate the right `["watchlist", groupId]` cache entry on success. */
  groupId: string;
  watchlistEntryId: string;
}

/**
 * Clears an already-logged payment -- the Tracker table row's "Löschen"
 * action (after the inline "Wirklich löschen?" confirmation).
 */
export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DeletePaymentMutationParams) => {
      const { data, error } = await deletePayment({ watchlistEntryId: params.watchlistEntryId });
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
