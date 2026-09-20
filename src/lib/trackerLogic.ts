// M8: pure business logic for the Bezahl-Tracker screen
// (src/app/(app)/(tabs)/tracker.tsx). Same convention as
// src/lib/watchlistLogic.ts/addMovieLogic.ts -- kept free of
// Supabase/React so the two most bug-prone rules here (the "only ALREADY
// paid entries show up" filter and `computeNextPayer`'s tie-breaking) are
// exhaustively unit-testable without mounting anything.
//
// Governing spec (feature-inventory.md §2.1/§3/§4.12/§6, verbatim per the
// task brief):
//  - the Tracker table shows ONLY entries with `paid_at` already set
//    (confirmed, twice-reinforced legacy rule -- "Tracker zeigt nur
//    explizit bezahlte Filme, nicht alle bewertet aber unbezahlt"), sorted
//    by `paid_at` descending (newest payment first).
//  - the "Zahlung erfassen" modal's picker shows ALL unpaid diary movies
//    (at least one real rating >0 from ANY member, `paid_at` still null) --
//    NOT restricted to "everyone has rated" (confirmed legacy rule,
//    changelog 2026-05-09: "Tracker: Alle Tagebuch-Filme auswählbar").

import type { GroupMemberRow } from "./groups";
import type { WatchlistEntry } from "./watchlistTypes";

// ============================================================================
// Paid entries (the Tracker table itself)
// ============================================================================

/**
 * Entries that already have a payment logged (`paid_at` set), newest
 * payment first. A watchlist entry that's been rated but never paid does
 * NOT appear here -- see the module doc above.
 */
export function getPaidEntries(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries
    .filter((entry) => entry.paid_at != null)
    .sort((a, b) => new Date(b.paid_at as string).getTime() - new Date(a.paid_at as string).getTime());
}

// ============================================================================
// Unpaid diary entries (the "Zahlung erfassen" modal's picker)
// ============================================================================

/** Same "not really rated yet" threshold used project-wide (rating != null && rating > 0). */
function hasAnyRealRating(entry: WatchlistEntry): boolean {
  return entry.ratings.some((rating) => rating.rating != null && rating.rating > 0);
}

/**
 * Entries eligible to log a payment for: at least one real rating from ANY
 * group member (not "everyone has rated" -- confirmed legacy rule, see
 * module doc), and no payment logged yet.
 */
export function getUnpaidDiaryEntries(entries: WatchlistEntry[]): WatchlistEntry[] {
  return entries.filter((entry) => entry.paid_at == null && hasAnyRealRating(entry));
}

// ============================================================================
// computeNextPayer
// ============================================================================

/**
 * Suggests who should pay next.
 *
 * Exact algorithm (per task brief): for each group member, find their most
 * recent `paid_at` across all of the group's already-paid entries. Suggest
 * the member with the OLDEST most-recent-payment date; a member who has
 * NEVER paid (no `paid_at` history at all) takes priority over anyone who
 * has paid at least once.
 *
 * RESOLVED interim decision (see docs/interim-decisions.md "M8"): the
 * source doc itself flags the tie-breaking case ("multiple members never
 * paid, or share the exact same last-paid date") as ambiguous. Resolved as
 * a deterministic tie-break by `joined_at` -- the earliest-joined member
 * wins. This makes the suggestion fully deterministic for any input,
 * including the very first payment ever logged in a group (every member
 * "never paid" at that point).
 */
/**
 * member_id -> that member's most recent `paid_at` across all of the
 * group's paid entries. Exported separately from `computeNextPayer` (which
 * uses it internally) since the Tracker's payer buttons also need each
 * individual member's last-paid date for their own "vor X Tagen" hint
 * (`daysSincePayment`), not just the single suggested next-payer.
 */
export function getLastPaidAtByMember(entries: WatchlistEntry[]): Map<string, string> {
  const lastPaidByMember = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.paid_at || !entry.paid_by_member_id) {
      continue;
    }
    const current = lastPaidByMember.get(entry.paid_by_member_id);
    if (!current || new Date(entry.paid_at).getTime() > new Date(current).getTime()) {
      lastPaidByMember.set(entry.paid_by_member_id, entry.paid_at);
    }
  }
  return lastPaidByMember;
}

export function computeNextPayer(
  members: GroupMemberRow[],
  entries: WatchlistEntry[],
): string | null {
  if (members.length === 0) {
    return null;
  }

  const lastPaidByMember = getLastPaidAtByMember(entries);

  function compare(a: GroupMemberRow, b: GroupMemberRow): number {
    const aLast = lastPaidByMember.get(a.user_id) ?? null;
    const bLast = lastPaidByMember.get(b.user_id) ?? null;

    // Never-paid beats has-paid-at-least-once, regardless of anything else.
    if (aLast === null && bLast !== null) {
      return -1;
    }
    if (aLast !== null && bLast === null) {
      return 1;
    }

    if (aLast !== null && bLast !== null) {
      const diff = new Date(aLast).getTime() - new Date(bLast).getTime();
      if (diff !== 0) {
        // Oldest last-paid date wins -> ascending sort by timestamp.
        return diff;
      }
    }

    // Tie: both never paid, OR both paid on the exact same last date ->
    // earliest-joined member wins (RESOLVED interim decision, see above).
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  }

  const sorted = [...members].sort(compare);
  return sorted[0].user_id;
}

// ============================================================================
// daysSincePayment -- German "vor X Tagen"/"heute"/"gestern" hint
// ============================================================================

/** Calendar-date-only comparison (not a 24h bucket), avoiding local-timezone shift by slicing the ISO string -- same convention as watchlistLogic.ts's getYearFromDateString. */
function toUtcDateOnly(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`).getTime();
}

/**
 * German "days since" hint text for a member's payer button (per the task
 * brief: "vor X Tagen"/"heute"/"gestern" hint = days since that member's
 * most recent payment). Returns `null` when the member has never paid
 * (nothing to show).
 */
export function daysSincePayment(lastPaidAt: string | null | undefined, now: Date): string | null {
  if (!lastPaidAt) {
    return null;
  }

  const diffDays = Math.round((toUtcDateOnly(now.toISOString()) - toUtcDateOnly(lastPaidAt)) / 86_400_000);

  if (diffDays <= 0) {
    return "heute";
  }
  if (diffDays === 1) {
    return "gestern";
  }
  return `vor ${diffDays} Tagen`;
}

// ============================================================================
// Per-member payer-button colors
// ============================================================================
//
// RESOLVED interim decision (see docs/interim-decisions.md "M8"): the
// legacy app hardcoded a fixed 3-color array for payer buttons -- a real
// limitation once a group has more than 3 members. Instead, this reuses
// this repo's existing group-THEME color derivation pattern
// (src/lib/groupTheme.ts): the 6 named theme accent colors double as a
// payer-button color palette, assigned to members by stable index (sorted
// by `joined_at`, wrapping around via modulo once a group has more than 6
// members). This is a deliberate improvement over the legacy hardcoded
// limit, not a literal port.

import { resolveGroupTheme, type GroupThemeName } from "./groupTheme";

const MEMBER_COLOR_THEME_NAMES: GroupThemeName[] = ["gold", "red", "blue", "green", "purple", "orange"];

const MEMBER_COLOR_PALETTE: string[] = MEMBER_COLOR_THEME_NAMES.map(
  (name) => resolveGroupTheme(name).colors.accent,
);

/**
 * Assigns each member a stable, distinct color from `MEMBER_COLOR_PALETTE`
 * by index (sorted by `joined_at` ascending, so the assignment doesn't
 * depend on whatever order the group-members query happens to return).
 * Groups with more than 6 members wrap around the palette (modulo) rather
 * than crashing or running out of colors.
 */
export function assignMemberColors(members: GroupMemberRow[]): Map<string, string> {
  const sorted = [...members].sort(
    (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime(),
  );
  const colors = new Map<string, string>();
  sorted.forEach((member, index) => {
    colors.set(member.user_id, MEMBER_COLOR_PALETTE[index % MEMBER_COLOR_PALETTE.length]);
  });
  return colors;
}
