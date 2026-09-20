import { supabase } from "./supabase";
import type { RatingUpsertPayload } from "./ratingLogic";
import { upsertMovie } from "./tmdbProxy";

// M6 part 2a: thin, typed wrappers around the Supabase writes needed for the
// Movie Detail Overlay (toggle-like, delete-from-watchlist,
// add-to-watchlist). Same convention as src/lib/watchlist.ts/groups.ts:
// never throw, always return the underlying Supabase `{ data, error }`
// result unchanged so callers (src/hooks/useMovieDetailMutations.ts) branch
// on `error` the same way they would with the raw supabase-js client.
//
// M7 part 2: `addToWatchlist`'s former non-Postgres case -- `movies` has no
// INSERT/UPDATE RLS policy for `authenticated` -- is now RESOLVED: the M7
// part 1 `upsert_movie` Edge Function action (service-role-backed) gets-or-
// creates the local `movies` row first. The former `MovieNotCatalogedError`
// fail-fast special case has been removed entirely -- see
// docs/interim-decisions.md "M7 Teil 2 — Add-Movie-Modal" for the decision
// log.

export interface ToggleLikeParams {
  watchlistEntryId: string;
  memberId: string;
  nextLiked: boolean;
  /**
   * The current member's existing `ratings` row id for this
   * watchlist_entry, if one is already known (e.g. from the entry's nested
   * `ratings` array). When given, only the `liked` column is updated on
   * that row via `.update()`, leaving `rating`/`seen_at`/`rated_at`
   * untouched. When omitted, an `.upsert()` is used instead (there is no
   * DELETE policy on `ratings`, so like-toggle is always an upsert/update,
   * never a delete) -- see docs/interim-decisions.md for the reasoning on
   * why both paths exist instead of always upserting.
   */
  existingRatingId?: string;
}

/**
 * Flips `liked` on a group member's `ratings` row for a watchlist entry,
 * without clobbering that row's `rating`/`seen_at`/`rated_at` fields.
 *
 * `ratings` has no DELETE policy at all, and INSERT/UPDATE are restricted to
 * `member_id = auth.uid()` -- so this is always an insert-or-update on the
 * caller's own row, keyed by the `(watchlist_entry_id, member_id)` unique
 * constraint.
 */
export async function toggleLike(params: ToggleLikeParams) {
  const { watchlistEntryId, memberId, nextLiked, existingRatingId } = params;

  if (existingRatingId) {
    return supabase
      .from("ratings")
      .update({ liked: nextLiked })
      .eq("id", existingRatingId)
      .select()
      .single();
  }

  return supabase
    .from("ratings")
    .upsert(
      { watchlist_entry_id: watchlistEntryId, member_id: memberId, liked: nextLiked },
      { onConflict: "watchlist_entry_id,member_id" }
    )
    .select()
    .single();
}

export interface DeleteWatchlistEntryParams {
  watchlistEntryId: string;
}

/**
 * Deletes a `watchlist_entries` row. RLS allows this for any authenticated
 * member of the entry's group (`watchlist_entries_delete_group_members`).
 */
export async function deleteWatchlistEntry(params: DeleteWatchlistEntryParams) {
  return supabase.from("watchlist_entries").delete().eq("id", params.watchlistEntryId);
}

export interface AddToWatchlistParams {
  tmdbId: number;
  groupId: string;
  addedBy: string;
  /**
   * M7 consolidation (Item 1, see docs/interim-decisions.md): the Add-
   * Movie-Modal's manual-date fallback value (ISO date string), forwarded
   * to the `upsert_movie` Edge Function action's own optional parameter of
   * the same name. Only relevant when TMDB has no release date for this
   * movie at all -- see `upsertMovie`'s own doc comment
   * (supabase/functions/tmdb-proxy/movie-upsert.ts) for the full "never
   * overrides real TMDB data" safety rule enforced server-side.
   */
  manualReleaseDate?: string;
}

/**
 * Adds a movie (identified by its TMDB id) to a group's watchlist.
 *
 * M7 part 2 rewire: `movies` is still SELECT-only for `authenticated` (no
 * INSERT/UPDATE policy -- catalog writes only happen via a service-role Edge
 * Function, see the migration's own comment), but this no longer fails fast
 * when the movie isn't cataloged yet. Instead it's a two-step flow:
 *   1. `upsertMovie(tmdbId)` (src/lib/tmdbProxy.ts) -- the M7 part 1
 *      `upsert_movie` Edge Function action, idempotent by tmdb_id. Gets the
 *      existing `movies.id` if already cataloged, or creates the row (plus
 *      genres) via TMDB data and returns the new id -- either way, this
 *      never attempts to write `movies` directly from the client.
 *   2. Inserts the `watchlist_entries` row using the id from step 1.
 *
 * Step 1 failing (edge function error) short-circuits with
 * `{ data: null, error }` unchanged, before any DB call is attempted.
 *
 * A unique-violation on `(group_id, movie_id)` (movie already in that
 * group's watchlist) is deliberately NOT translated into a friendlier
 * shape here -- the raw Postgres/Supabase error (`code: "23505"`) is
 * propagated unchanged. There is no existing repo precedent for a
 * "friendly duplicate-entry message" layer, and building one is arguably
 * UI-layer scope (the Add-Movie-Modal's own "Bereits gesehen" duplicate-
 * warning dialog is a separate, pre-emptive check on already-loaded data,
 * not a reaction to this constraint -- see src/lib/addMovieLogic.ts).
 */
export async function addToWatchlist(params: AddToWatchlistParams) {
  const { tmdbId, groupId, addedBy, manualReleaseDate } = params;

  const { data: upsertResult, error: upsertError } = await upsertMovie(tmdbId, manualReleaseDate);

  if (upsertError) {
    return { data: null, error: upsertError };
  }

  return supabase
    .from("watchlist_entries")
    .insert({
      group_id: groupId,
      movie_id: (upsertResult as { movieId: string }).movieId,
      added_by: addedBy,
    })
    .select()
    .single();
}

// --- M7 part 2b: Rating-Dialog writes ---
//
// Interim decision (docs/interim-decisions.md "M7 Teil 2b"): these three
// functions live here (extending the existing M6-part-2a movie-detail
// mutations file) rather than in a brand-new `src/lib/ratingMutations.ts` --
// they're the same "thin, typed, never-throw Supabase wrapper" kind of
// function as `toggleLike`/`deleteWatchlistEntry`/`addToWatchlist` above,
// operate on the same two tables (`ratings`/`watchlist_entries`), and the
// task brief itself flagged this file as the natural fit to check first.
// The hook layer (`src/hooks/useSaveRating.ts`) is a NEW file, per the
// task's explicit deliverable list.

/**
 * Upserts the acting member's own `ratings` row for a watchlist entry.
 *
 * Deliberately a real UPSERT (never a delete-then-reinsert) so a future
 * server-side NULL->value push trigger (ADR 0006's push-behavior design,
 * out of scope for this client-side task) can correctly observe a
 * NULL->value vs. value->value transition on `rating` later. `payload` is
 * expected to already be shaped by `buildRatingUpsertPayload`
 * (src/lib/ratingLogic.ts) -- this function does no further shaping itself.
 *
 * RLS (`ratings_insert_own_row_only`/`ratings_update_own_row_only`)
 * restricts both the insert and update path of this upsert to
 * `member_id = auth.uid()`, so this can only ever write the CALLING
 * member's own rating row -- exactly the "Direkt Bewerten only rates for
 * the acting user" business rule, enforced at the database layer, not just
 * assumed client-side.
 */
export async function saveRating(payload: RatingUpsertPayload) {
  return supabase
    .from("ratings")
    .upsert(payload, { onConflict: "watchlist_entry_id,member_id" })
    .select()
    .single();
}

export interface ResetRatingParams {
  ratingId: string;
}

/**
 * Resets a rating row's `rating` back to NULL and its `liked` back to
 * `false` -- per the known rule "deleting a rating also resets the like".
 * Only `rating`/`liked` are touched: `seen_at`/`rated_at` are left exactly
 * as they were (resetting a rating value isn't itself a new "rating
 * event", so `rated_at` is intentionally NOT bumped here -- an interim
 * decision, see docs/interim-decisions.md "M7 Teil 2b").
 *
 * An `.update()` targeting the existing row's id, not a delete -- `ratings`
 * has no DELETE policy at all (see the M6-part-2a `toggleLike` doc comment
 * above), and this keeps the same "never delete-then-reinsert" guarantee
 * `saveRating` relies on.
 */
export async function resetRating(params: ResetRatingParams) {
  return supabase.from("ratings").update({ rating: null, liked: false }).eq("id", params.ratingId).select().single();
}

export interface SavePaymentParams {
  watchlistEntryId: string;
  paidByMemberId: string;
  paidAt: string;
}

/**
 * Assigns/confirms who paid for a watchlist entry and when. `paidAt` is
 * expected to already be resolved via `resolvePaymentDate`
 * (src/lib/ratingLogic.ts) by the caller -- this function does no priority
 * resolution itself, it just writes the two columns.
 *
 * `watchlist_entries_update_group_members` (RLS) allows ANY group member to
 * update this row, not just the payer or the row's own `added_by` -- this
 * is the deliberate, documented "any member can log payment on any other
 * member's behalf" interim decision (see docs/interim-decisions.md
 * "M7 Teil 2b"), not an oversight.
 */
export async function savePayment(params: SavePaymentParams) {
  return supabase
    .from("watchlist_entries")
    .update({ paid_by_member_id: params.paidByMemberId, paid_at: params.paidAt })
    .eq("id", params.watchlistEntryId)
    .select()
    .single();
}

export interface DeletePaymentParams {
  watchlistEntryId: string;
}

/**
 * M8 (Bezahl-Tracker): clears a logged payment -- resets both
 * `paid_by_member_id` and `paid_at` to `NULL` on the targeted
 * `watchlist_entries` row. This is the "Löschen" action on an already-paid
 * Tracker row (feature-inventory.md §2.1's `deletePayment`), distinct from
 * `deleteWatchlistEntry` above (which removes the whole entry, not just its
 * payment fields).
 *
 * Same RLS policy as `savePayment` (`watchlist_entries_update_group_members`)
 * applies here too -- any group member can clear any other member's logged
 * payment, not just the person who originally logged it or the payer
 * themselves. RESOLVED interim decision (see docs/interim-decisions.md
 * "M8"): the source doc is silent on payment-record permissions, same gap
 * already resolved identically for `savePayment` in M7 Teil 2b.
 */
export async function deletePayment(params: DeletePaymentParams) {
  return supabase
    .from("watchlist_entries")
    .update({ paid_by_member_id: null, paid_at: null })
    .eq("id", params.watchlistEntryId)
    .select()
    .single();
}
