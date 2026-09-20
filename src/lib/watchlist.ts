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

const WATCHLIST_ENTRY_SELECT =
  "*, movie:movies(*, movie_genres(genre_id, genres(name))), ratings(*)";

export async function getGroupWatchlistEntries(groupId: string) {
  return supabase.from("watchlist_entries").select(WATCHLIST_ENTRY_SELECT).eq("group_id", groupId);
}

export async function getStreamingAvailabilityForTmdbIds(tmdbIds: number[]) {
  if (tmdbIds.length === 0) {
    return { data: [], error: null };
  }
  return supabase.from("streaming_availability_cache").select("*").in("tmdb_id", tmdbIds);
}
