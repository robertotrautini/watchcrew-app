// M5 part 2 (Tagebuch screen): small presentational helpers layered on top
// of `src/lib/watchlistLogic.ts`'s pure business logic. Nothing here
// encodes a business rule of its own — it's purely "how do we show this
// value" formatting, kept separate from the screen component so it's
// independently unit-testable.
//
// --- M5 FAST-FOLLOW: real names, gap closed ---
// `memberDisplayLabel`/`genreDisplayLabel` originally rendered
// unconditional uuid-prefix placeholders (no `profiles` table and no
// genre-name join existed yet). Both gaps are now closed:
//  - `supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql`
//    adds a `profiles(id, display_name)` table, auto-populated by a trigger
//    on `auth.users` insert, joined in per-member by
//    `src/lib/groups.ts`'s `getGroupMembers`.
//  - `src/lib/watchlist.ts`'s query now nests `movie_genres(genre_id,
//    genres(name))`, so a real genre name is available per movie.
// Both functions now take the real name/display_name as an OPTIONAL second
// argument and only fall back to the uuid-prefix placeholder when it's
// missing/empty — defensive insurance for a profile or genre row that's
// somehow absent, not the expected common case anymore.

import type { WatchlistEntry } from "./watchlistTypes";

/** Same "average of non-null ratings" definition as watchlistLogic.ts's sort options — recomputed here since that internal helper isn't exported. */
export function computeAverageRating(entry: WatchlistEntry): number | null {
  const values = entry.ratings.map((r) => r.rating).filter((r): r is number => r != null);
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** "Gesehen am DD.MM.YYYY" date part, or the "Kein Datum" fallback copy for a null seen_at. */
export function formatSeenAtDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Kein Datum";
  }
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}.${month}.${year}`;
}

/**
 * Best-effort group member roster, derived as the union of every
 * `member_id` appearing in ANY entry's `ratings` array (across the full,
 * pre-split entry set the caller should pass in — not just the Diary
 * subset, so a member who has only rated Watchlist-side movies still shows
 * up). This is an approximation, not a real membership query (see the
 * flagged gap above): a member who has never rated anything at all in the
 * group won't appear here and so won't get a "–" row rendered for them.
 */
export function deriveGroupMemberIds(entries: WatchlistEntry[]): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    for (const rating of entry.ratings) {
      ids.add(rating.member_id);
    }
  }
  return Array.from(ids).sort();
}

/**
 * Member display label. Uses the real `profiles.display_name` when given
 * (the common case since the M5 fast-follow); falls back to the original
 * uuid-prefix placeholder only when no name is available (e.g. a missing
 * profile row — see the module comment above).
 */
export function memberDisplayLabel(memberId: string, displayName?: string | null): string {
  if (displayName != null && displayName.length > 0) {
    return displayName;
  }
  return `Mitglied ${memberId.slice(0, 8)}`;
}

/**
 * Genre display label. Uses the real `genres.name` when given (the common
 * case since the M5 fast-follow); falls back to the original uuid-prefix
 * placeholder only when no name is available (e.g. a missing genre-catalog
 * row — see the module comment above).
 */
export function genreDisplayLabel(genreId: string, genreName?: string | null): string {
  if (genreName != null && genreName.length > 0) {
    return genreName;
  }
  return `Genre ${genreId.slice(0, 8)}`;
}

/**
 * Group display label (M9 part 2 Group-Settings screen's switcher). Same
 * "real value, uuid-prefix placeholder fallback" convention as
 * `memberDisplayLabel`/`genreDisplayLabel` above, and for the same reason
 * this function lives HERE rather than in src/lib/groups.ts: that module
 * eagerly imports src/lib/supabase.ts (constructs a real Supabase/Realtime
 * client at import time), which would force any screen test that only needs
 * this pure display-label helper to mock the whole module. This file has no
 * such import, so it's the safe, already-established home for
 * presentation-only helpers like this one.
 */
export function groupDisplayLabel(groupId: string, name?: string | null): string {
  if (name != null && name.length > 0) {
    return name;
  }
  return `Gruppe ${groupId.slice(0, 8)}`;
}

/**
 * genre_id -> real genre name, derived from whatever entries are passed in
 * (via each movie's nested `movie_genres(genre_id, genres(name))`). Used by
 * both the Watchlist and Tagebuch screens to resolve a genre pill's real
 * name via `genreDisplayLabel(genreId, genreNamesById.get(genreId))`.
 */
export function deriveGenreNamesById(entries: WatchlistEntry[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const entry of entries) {
    for (const link of entry.movie.movie_genres ?? []) {
      if (link.genres?.name) {
        names.set(link.genre_id, link.genres.name);
      }
    }
  }
  return names;
}
