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
  /** `movies.id` -- ADR 0014: the rating belongs to (user, movie), not to a group entry. */
  movieId: string;
  memberId: string;
  nextLiked: boolean;
}

/**
 * Flips `liked` on the caller's own `user_movie_ratings` row for a movie,
 * without clobbering `rating`/`seen_at`/`rated_at`. Liking upserts only the
 * `liked` column (creates the row if missing); un-liking only UPDATEs an
 * existing row (never creates an empty one).
 */
export async function toggleLike(params: ToggleLikeParams) {
  const { movieId, memberId, nextLiked } = params;

  if (!nextLiked) {
    return supabase
      .from("user_movie_ratings")
      .update({ liked: false })
      .eq("user_id", memberId)
      .eq("movie_id", movieId)
      .select()
      .maybeSingle();
  }

  return supabase
    .from("user_movie_ratings")
    .upsert({ user_id: memberId, movie_id: movieId, liked: true }, { onConflict: "user_id,movie_id" })
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

export interface SetWatchlistEntryReleaseDateParams {
  watchlistEntryId: string;
  /** ISO "YYYY-MM-DD", or `null` to reset to the TMDB date. */
  releaseDate: string | null;
}

/**
 * Sets (or, with `null`, clears) the per-group release date override on one
 * `watchlist_entries` row. Touches only `release_date_override` -- the shared
 * `movies` row is never modified. RLS: `watchlist_entries_update_group_members`.
 */
export async function setWatchlistEntryReleaseDate(params: SetWatchlistEntryReleaseDateParams) {
  return supabase
    .from("watchlist_entries")
    .update({ release_date_override: params.releaseDate })
    .eq("id", params.watchlistEntryId);
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

export interface EnsureWatchlistEntryParams {
  groupId: string;
  movieId: string;
  addedBy: string;
}

/**
 * Idempotent: returns the group's existing `watchlist_entries` row for the movie, or inserts one
 * when missing (used by "Direkt bewerten", which must never create a second entry).
 */
export async function ensureWatchlistEntry(params: EnsureWatchlistEntryParams) {
  const existing = await supabase
    .from("watchlist_entries")
    .select()
    .eq("group_id", params.groupId)
    .eq("movie_id", params.movieId)
    .maybeSingle();
  if (existing.error || existing.data) {
    return existing;
  }
  return supabase
    .from("watchlist_entries")
    .insert({ group_id: params.groupId, movie_id: params.movieId, added_by: params.addedBy })
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
 * Upserts the acting user's own `user_movie_ratings` row (ADR 0014: one row
 * per user and movie, valid in ALL groups). `payload` is expected to already
 * be shaped by `buildRatingUpsertPayload` (src/lib/ratingLogic.ts).
 *
 * A row exists only while it has content (rating > 0, like or `seen_at`): a
 * payload without any of them deletes the own row instead of storing an empty
 * one. Still a real UPSERT otherwise, so the push trigger can observe the
 * NULL->value transition of `rating`. RLS (`umr_insert_own`/`umr_update_own`)
 * limits writes to `user_id = auth.uid()`.
 */
export async function saveRating(payload: RatingUpsertPayload) {
  const hasContent = (payload.rating != null && payload.rating > 0) || payload.liked || payload.seen_at != null;
  if (!hasContent) {
    return resetRating({ userId: payload.user_id, movieId: payload.movie_id });
  }
  return supabase
    .from("user_movie_ratings")
    .upsert(payload, { onConflict: "user_id,movie_id" })
    .select()
    .single();
}

export interface ResetRatingParams {
  userId: string;
  movieId: string;
}

/**
 * Deletes the caller's own `user_movie_ratings` row (ADR 0014 decision 2:
 * delete instead of reset). The movie then counts as not seen/not rated in
 * ALL groups. Group entries (`watchlist_entries`) are untouched. RLS:
 * `umr_delete_own`.
 */
export async function resetRating(params: ResetRatingParams) {
  return supabase
    .from("user_movie_ratings")
    .delete()
    .eq("user_id", params.userId)
    .eq("movie_id", params.movieId);
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
