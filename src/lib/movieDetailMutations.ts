import { supabase } from "./supabase";
import type { RatingUpsertPayload } from "./ratingLogic";

// M6 part 2a: thin, typed wrappers around the Supabase writes needed for the
// Movie Detail Overlay (toggle-like, delete-from-watchlist,
// add-to-watchlist). Same convention as src/lib/watchlist.ts/groups.ts:
// never throw, always return the underlying Supabase `{ data, error }`
// result unchanged so callers (src/hooks/useMovieDetailMutations.ts) branch
// on `error` the same way they would with the raw supabase-js client.
//
// The one non-Postgres case -- `movies` has no INSERT/UPDATE/DELETE policy
// for `authenticated` at all (writes only happen via a service-role Edge
// Function, see supabase/migrations/20260919120000_..._rls.sql's own
// comment) -- is surfaced through the SAME `{ data: null, error }` shape,
// using `MovieNotCatalogedError` as the `error` value, rather than a thrown
// exception. That keeps the hook layer's "if (error) throw error" pattern
// uniform across all three mutations instead of needing a special case for
// this one.

export class MovieNotCatalogedError extends Error {
  readonly tmdbId: number;

  constructor(tmdbId: number) {
    super(
      `Movie not yet in catalog — requires service-role upsert, not yet implemented (see M6 part 2a decision log). tmdb_id=${tmdbId}`
    );
    this.name = "MovieNotCatalogedError";
    this.tmdbId = tmdbId;
  }
}

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
}

/**
 * Adds a movie (identified by its TMDB id) to a group's watchlist.
 *
 * `movies` is SELECT-only for `authenticated` -- there is no INSERT policy,
 * because catalog writes only happen via a service-role Edge Function (see
 * the migration's own comment). So this never attempts to write `movies`
 * itself: it looks the movie up by `tmdb_id` first (`.maybeSingle()`, so a
 * "not found" resolves to `{ data: null, error: null }` instead of a
 * Postgres error), and:
 *   - found -> inserts the `watchlist_entries` row using that movie's id.
 *   - not found -> returns `{ data: null, error: MovieNotCatalogedError }`,
 *     failing fast instead of attempting a doomed RLS-rejected insert.
 *
 * A unique-violation on `(group_id, movie_id)` (movie already in that
 * group's watchlist) is deliberately NOT translated into a friendlier
 * shape here -- the raw Postgres/Supabase error (`code: "23505"`) is
 * propagated unchanged. There is no existing repo precedent for a
 * "friendly duplicate-entry message" layer, and building one is arguably
 * UI-layer scope, not this mutation-layer's job.
 */
export async function addToWatchlist(params: AddToWatchlistParams) {
  const { tmdbId, groupId, addedBy } = params;

  const { data: movie, error: movieError } = await supabase
    .from("movies")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .maybeSingle();

  if (movieError) {
    return { data: null, error: movieError };
  }

  if (!movie) {
    return { data: null, error: new MovieNotCatalogedError(tmdbId) };
  }

  return supabase
    .from("watchlist_entries")
    .insert({ group_id: groupId, movie_id: (movie as { id: string }).id, added_by: addedBy })
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
