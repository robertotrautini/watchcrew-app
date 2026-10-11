import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  ensureWatchlistEntry,
  savePayment,
  saveRating,
} from "@/lib/movieDetailMutations";
import { queryKeys } from "@/lib/queryKeys";
import { buildRatingUpsertPayload, resolvePaymentDate } from "@/lib/ratingLogic";
import { upsertMovie } from "@/lib/tmdbProxy";

export interface DirectRateParams {
  tmdbId: number;
  groupId: string;
  /** Acting user: rater and `added_by` of the new group entry. */
  memberId: string;
  rating: number | null;
  liked: boolean;
  seenAt: string | null;
  manualReleaseDate?: string;
  now?: Date;
  payment?: { paidByMemberId: string; explicitPaidAt?: string | null };
}

/** `ratingSaved` tells the caller whether the rating write already succeeded (then it stays saved). */
export class DirectRateError extends Error {
  readonly ratingSaved: boolean;
  readonly cause: unknown;
  constructor(cause: unknown, ratingSaved: boolean) {
    super("direct rate failed");
    this.cause = cause;
    this.ratingSaved = ratingSaved;
  }
}

/**
 * "Direkt bewerten": runs only on Speichern. Order: catalog upsert -> rating upsert -> group entry
 * (idempotent) -> optional payment. A failure before the rating write creates nothing; a later
 * failure keeps the already-saved rating (error flagged `ratingSaved`).
 */
export function useDirectRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DirectRateParams) => {
      const now = params.now ?? new Date();

      const movie = await upsertMovie(params.tmdbId, params.manualReleaseDate);
      if (movie.error || !movie.data) {
        throw new DirectRateError(movie.error, false);
      }
      const movieId = (movie.data as { movieId: string }).movieId;

      const { error: ratingError } = await saveRating(
        buildRatingUpsertPayload({
          movieId,
          memberId: params.memberId,
          rating: params.rating,
          liked: params.liked,
          seenAt: params.seenAt,
          now,
        }),
      );
      if (ratingError) {
        throw new DirectRateError(ratingError, false);
      }

      const { data: entry, error: entryError } = await ensureWatchlistEntry({
        groupId: params.groupId,
        movieId,
        addedBy: params.memberId,
      });
      if (entryError || !entry) {
        throw new DirectRateError(entryError, true);
      }

      if (params.payment) {
        const paidAt = resolvePaymentDate(
          params.payment.explicitPaidAt,
          (entry as { paid_at: string | null }).paid_at,
          params.seenAt,
          now,
        );
        const { error: paymentError } = await savePayment({
          watchlistEntryId: (entry as { id: string }).id,
          paidByMemberId: params.payment.paidByMemberId,
          paidAt,
        });
        if (paymentError) {
          throw new DirectRateError(paymentError, true);
        }
      }
      return entry;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.myDiary.all });
    },
  });
}
