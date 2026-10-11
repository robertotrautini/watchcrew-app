import { supabase } from "./supabase";

// Thin, typed wrappers around the Supabase queries needed for M5's
// Watchlist/Diary data layer. Same convention as src/lib/groups.ts: never
// throw, always return the underlying Supabase `{ data, error }` result
// unchanged so callers (src/hooks/useGroupWatchlist.ts) branch on `error`
// the same way they would with the raw supabase-js client.
//
// Single-table model reminder: this fetches a group's FULL
// `watchlist_entries` set once (joined with `movies`/`movie_genres`/
// `ratings`) — Watchlist vs Diary is a client-side split
// (`src/lib/watchlistLogic.ts`'s `splitWatchlistAndDiary`), never two
// separate queries.
//
// M5 fast-follow: `movie_genres` also nests `genres(name)` (a genre's row in
// `public.genres`), closing the flagged gap where genre pills only had a raw
// genre_id to show. `genre_id` itself stays selected too — it's still the
// identity used for filtering/selection state in watchlistLogic.ts/the
// screens; only the display LABEL needed a real name.

// ADR 0014: no embedded `ratings(*)` any more -- ratings are per user and movie
// (`user_movie_ratings`) and come from `getGroupMemberRatings` below.
const WATCHLIST_ENTRY_SELECT = "*, movie:movies(*, movie_genres(genre_id, genres(name)))";

export async function getGroupWatchlistEntries(groupId: string) {
  return supabase.from("watchlist_entries").select(WATCHLIST_ENTRY_SELECT).eq("group_id", groupId);
}

/**
 * ADR 0014: all `user_movie_ratings` rows of the group's members for the
 * movies in the group's watchlist (RPC, membership checked once server-side;
 * non-members get an empty set).
 */
export async function getGroupMemberRatings(groupId: string) {
  return supabase.rpc("get_group_member_ratings", { p_group_id: groupId });
}

export async function getStreamingAvailabilityForTmdbIds(tmdbIds: number[]) {
  if (tmdbIds.length === 0) {
    return { data: [], error: null };
  }
  return supabase.from("streaming_availability_cache").select("*").in("tmdb_id", tmdbIds);
}

const MY_DIARY_SELECT = "*, movie:movies(*, movie_genres(genre_id, genres(name)))";
/** PostgREST caps one response at 1000 rows by default -> page with `range`. */
export const MY_DIARY_PAGE_SIZE = 1000;

/**
 * ADR 0014 / Phase 5: ALL `user_movie_ratings` rows of the user (any group, or
 * none) with the embedded `movies` row (real FK `movie_id`; `movies` is
 * readable for every authenticated user). Pages through the 1000-row limit;
 * stops at the first error (returned as `{ data: null, error }`).
 */
export async function getMyDiaryRows(userId: string) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += MY_DIARY_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("user_movie_ratings")
      .select(MY_DIARY_SELECT)
      .eq("user_id", userId)
      .order("movie_id", { ascending: true })
      .range(from, from + MY_DIARY_PAGE_SIZE - 1);
    if (error) {
      return { data: null, error };
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < MY_DIARY_PAGE_SIZE) {
      break;
    }
  }
  return { data: rows, error: null };
}
