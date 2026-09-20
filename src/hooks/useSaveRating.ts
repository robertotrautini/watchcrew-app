import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resetRating, savePayment, saveRating } from "@/lib/movieDetailMutations";
import { buildRatingUpsertPayload, resolvePaymentDate } from "@/lib/ratingLogic";

// M7 part 2b: the Rating-Dialog's real save/reset mutations. Same
// `useMutation` + throw-on-`error` + invalidate-`["watchlist", groupId]`
// convention as src/hooks/useMovieDetailMutations.ts (see that file's own
// module comment) -- this is a NEW file rather than an addition to that one
// (task's explicit deliverable list names this file directly), while the
// underlying Supabase calls themselves were added to the EXISTING
// src/lib/movieDetailMutations.ts (see that file's own "M7 part 2b" comment
// for why).

export interface SaveRatingPaymentParams {
  /** The member being credited as payer for this save. */
  paidByMemberId: string;
  /** The dialog's own optional "Bezahlt am" field, if the user filled it in this save. */
  explicitPaidAt?: string | null;
  /** The watchlist entry's current `paid_at`, if already set -- NEVER silently overwritten. */
  existingPaidAt?: string | null;
}

export interface SaveRatingMutationParams {
  /** Needed purely to invalidate the right `["watchlist", groupId]` cache entry on success. */
  groupId: string;
  watchlistEntryId: string;
  memberId: string;
  rating: number | null;
  liked: boolean;
  /** Already resolved via `resolveSeenAtDate` -- `null` means "Weiß nicht". */
  seenAt: string | null;
  /** Injectable for deterministic tests; defaults to the real current time. */
  now?: Date;
  /**
   * Omit entirely when the payment section wasn't touched this save (no
   * payer selected) -- `watchlist_entries.paid_by_member_id`/`paid_at` are
   * then left completely untouched, rather than being cleared.
   */
  payment?: SaveRatingPaymentParams;
}

/**
 * Saves the acting member's rating (always) and, when a payer was assigned
 * in this save, the payment fields on the parent `watchlist_entries` row
 * (via the `resolvePaymentDate` priority chain -- see
 * src/lib/ratingLogic.ts). The rating write always happens first; the
 * payment write is only attempted if the rating write succeeds, and any
 * error from either step surfaces through this single mutation's error
 * channel.
 */
export function useSaveRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SaveRatingMutationParams) => {
      const now = params.now ?? new Date();

      const payload = buildRatingUpsertPayload({
        watchlistEntryId: params.watchlistEntryId,
        memberId: params.memberId,
        rating: params.rating,
        liked: params.liked,
        seenAt: params.seenAt,
        now,
      });

      const { data: ratingData, error: ratingError } = await saveRating(payload);
      if (ratingError) {
        throw ratingError;
      }

      if (params.payment) {
        const paidAt = resolvePaymentDate(
          params.payment.explicitPaidAt,
          params.payment.existingPaidAt,
          params.seenAt,
          now,
        );
        const { error: paymentError } = await savePayment({
          watchlistEntryId: params.watchlistEntryId,
          paidByMemberId: params.payment.paidByMemberId,
          paidAt,
        });
        if (paymentError) {
          throw paymentError;
        }
      }

      return ratingData;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", variables.groupId] });
    },
  });
}

export interface ResetRatingMutationParams {
  /** Needed purely to invalidate the right `["watchlist", groupId]` cache entry on success. */
  groupId: string;
  ratingId: string;
}

/**
 * Resets an existing rating back to "not rated" (rating=null, liked=false --
 * see src/lib/movieDetailMutations.ts's `resetRating` doc comment for why
 * `liked` is included). The dialog is expected to disable the reset button
 * entirely when there's no existing rating row/id to reset, rather than
 * this hook guarding against a missing id.
 */
export function useResetRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResetRatingMutationParams) => {
      const { data, error } = await resetRating({ ratingId: params.ratingId });
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
