import { useMutation, useQueryClient } from "@tanstack/react-query";

import { resetRating, savePayment, saveRating } from "@/lib/movieDetailMutations";
import { buildRatingUpsertPayload, resolvePaymentDate } from "@/lib/ratingLogic";
import { queryKeys } from "@/lib/queryKeys";

// M7 part 2b: the Rating-Dialog's real save/reset mutations. Same
// `useMutation` + throw-on-`error` + invalidate-`["watchlist", groupId]`
// convention as src/hooks/useMovieDetailMutations.ts (see that file's own
// module comment) -- this is a NEW file rather than an addition to that one
// (task's explicit deliverable list names this file directly), while the
// underlying Supabase calls themselves were added to the EXISTING
// src/lib/movieDetailMutations.ts (see that file's own "M7 part 2b" comment
// for why).

interface SaveRatingPaymentParams {
  /** The member being credited as payer for this save. */
  paidByMemberId: string;
  /** The dialog's own optional "Bezahlt am" field, if the user filled it in this save. */
  explicitPaidAt?: string | null;
  /** The watchlist entry's current `paid_at`, if already set -- NEVER silently overwritten. */
  existingPaidAt?: string | null;
}

export interface SaveRatingMutationParams {
  /** The group the dialog was opened from (kept for call-site symmetry; ALL group watchlists are invalidated, ADR 0014). */
  groupId: string;
  /** Needed for the payment write (payment stays per group entry). */
  watchlistEntryId: string;
  /** `movies.id` -- the rating row is keyed by (user, movie). */
  movieId: string;
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
  /**
   * Payment-only save (e.g. after a rating delete): skips the rating write so
   * no empty/new `user_movie_ratings` row is created.
   */
  skipRating?: boolean;
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

      let ratingData: unknown = null;
      if (!params.skipRating) {
        const payload = buildRatingUpsertPayload({
          movieId: params.movieId,
          memberId: params.memberId,
          rating: params.rating,
          liked: params.liked,
          seenAt: params.seenAt,
          now,
        });

        const { data, error: ratingError } = await saveRating(payload);
        if (ratingError) {
          throw ratingError;
        }
        ratingData = data;
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
    onSuccess: () => {
      // ADR 0014: the rating is valid in every group that has the movie.
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDiary.all });
    },
  });
}

export interface ResetRatingMutationParams {
  /** The group the dialog was opened from (all group watchlists are invalidated). */
  groupId: string;
  userId: string;
  movieId: string;
}

/**
 * Resets an existing rating back to "not rated" (ADR 0014: deletes the own user_movie_ratings row -- not seen in ANY group). The dialog is expected to disable the reset button
 * entirely when there's no existing rating row/id to reset, rather than
 * this hook guarding against a missing id.
 */
export function useResetRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ResetRatingMutationParams) => {
      const { data, error } = await resetRating({ userId: params.userId, movieId: params.movieId });
      if (error) {
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDiary.all });
    },
  });
}
