// M5 part 2 (Tagebuch screen): small presentational helpers layered on top
// of `src/lib/watchlistLogic.ts`'s pure business logic. Nothing here
// encodes a business rule of its own — it's purely "how do we show this
// value" formatting, kept separate from the screen component so it's
// independently unit-testable.
//
// --- FLAGGED GAP (see task report) ---
// `memberDisplayLabel` and `genreDisplayLabel` are PLACEHOLDERS. Neither a
// group-members-roster query nor a member-display-name source (no
// `profiles`/`display_name` table exists yet — `ratings.member_id` is only
// a bare `auth.users` uuid) nor a genre-id -> genre-name lookup (the
// `public.genres` table exists in the schema but nothing fetches it yet)
// is wired up anywhere in this codebase as of this task. Building either
// properly is a real data-layer/architecture decision (new table? new
// Edge Function? client-side join against `auth.users`, which isn't
// normally client-readable?) that the project's "zero autonomous
// decisions" rule requires surfacing to the user first, not inventing here.
// These two functions exist so the Diary screen's per-member rows and
// genre pills are still functionally correct (right rows, right filtering)
// today, with an obviously-a-placeholder label, and can be swapped for a
// real lookup later with no other code changes.

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

/** Placeholder member label — see the flagged-gap module comment above. */
export function memberDisplayLabel(memberId: string): string {
  return `Mitglied ${memberId.slice(0, 8)}`;
}

/** Placeholder genre label — see the flagged-gap module comment above. */
export function genreDisplayLabel(genreId: string): string {
  return `Genre ${genreId.slice(0, 8)}`;
}
