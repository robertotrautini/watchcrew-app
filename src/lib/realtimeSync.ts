import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

/**
 * M10 (Realtime foreground sync, ADR 0006). Pure classification logic for
 * incoming `postgres_changes` events on `watchlist_entries`/`ratings`,
 * deliberately kept free of any Supabase/React/React-Query import so it's
 * trivially unit-testable — see src/hooks/useGroupRealtimeSync.ts for the
 * actual channel wiring that calls into this file.
 *
 * "Which change matters" is intentionally narrower than "every row change":
 * per ADR 0006 / docs/feature-inventory.md section 2.6+4.2 (verbatim from
 * the legacy app), the only two DB-driven notification triggers that ever
 * existed are (a) a new watchlist entry, and (b) a member's FIRST rating on
 * an entry (NULL -> value), never a correction of an existing rating. A
 * third, new-for-this-rewrite trigger is added here for symmetry across the
 * three tabs this hook feeds (Watchlist/Tagebuch/Tracker all read the same
 * `["watchlist", groupId]` query): a payment being recorded on an entry
 * (`paid_at` transitioning null -> value) is treated as Tracker-relevant
 * exactly like the other two are Watchlist-/Tagebuch-relevant. See
 * docs/interim-decisions.md "M10 — Toast-Trigger-Typen" for why this third
 * type was added and why its exact copy can't be guaranteed to match the
 * parallel Push-infrastructure task's own trigger definitions.
 *
 * Everything else (a rating correction, any other watchlist_entries column
 * changing, any DELETE) still counts as "relevant enough to silently
 * refresh the cache" (the caller invalidates the query regardless of kind)
 * but must NEVER produce a toast — that's the `"other"` kind, whose toast
 * copy is `null`.
 */
export type RealtimeChangeKind =
  | "watchlist_entry_added"
  | "payment_recorded"
  | "rating_first"
  | "other";

/**
 * Structural subset of `RealtimePostgresChangesPayload` this module actually
 * reads — kept as its own type (rather than importing the full Supabase
 * generic payload type everywhere) so the hand-built fixtures in
 * __tests__/realtimeSync.test.ts don't need to fake the full real payload
 * shape (channel/schema/table/commit_timestamp/errors/...).
 */
export interface PostgresChangeLike {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
}

export function classifyWatchlistEntriesChange(
  payload: PostgresChangeLike | RealtimePostgresChangesPayload<Record<string, unknown>>,
): RealtimeChangeKind {
  if (payload.eventType === "INSERT") {
    return "watchlist_entry_added";
  }

  if (payload.eventType === "UPDATE") {
    const oldPaidAt = (payload.old as Record<string, unknown> | null)?.paid_at ?? null;
    const newPaidAt = (payload.new as Record<string, unknown> | null)?.paid_at ?? null;
    if (oldPaidAt == null && newPaidAt != null) {
      return "payment_recorded";
    }
  }

  return "other";
}

/**
 * ADR 0006 / feature-inventory 2.6: notify only on the NULL -> value
 * transition (an INSERT, since `ratings` rows are upserted once per
 * (watchlist_entry_id, member_id) and never re-inserted -- see the M1
 * schema's unique constraint), never on a correction (an UPDATE of an
 * existing rating row).
 */
export function classifyRatingsChange(
  payload: PostgresChangeLike | RealtimePostgresChangesPayload<Record<string, unknown>>,
): RealtimeChangeKind {
  return payload.eventType === "INSERT" ? "rating_first" : "other";
}

/**
 * `ratings` has no `group_id` column (see the M1 schema) -- callers can't
 * filter the Realtime subscription itself to "this group's ratings only"
 * the way they can for `watchlist_entries` (`filter: group_id=eq.<id>`).
 * This helper reads the one column ratings DOES carry
 * (`watchlist_entry_id`) off whichever row is present (`new` for
 * INSERT/UPDATE, `old` for DELETE) so the caller can check membership
 * client-side against the already-fetched watchlist entries for the active
 * group (see useGroupRealtimeSync.ts).
 */
export function extractWatchlistEntryId(
  payload: PostgresChangeLike | RealtimePostgresChangesPayload<Record<string, unknown>>,
): string | undefined {
  const fromNew = (payload.new as Record<string, unknown> | null)?.watchlist_entry_id;
  const fromOld = (payload.old as Record<string, unknown> | null)?.watchlist_entry_id;
  return (fromNew ?? fromOld) as string | undefined;
}

/**
 * German toast copy per trigger kind (concise, per the task brief) -- `null`
 * means "never toast for this kind" (still silently refreshes the cache,
 * see useGroupRealtimeSync.ts). Deliberately generic/no-name-included copy
 * (e.g. not "Robin hat X bewertet") since resolving a display name here
 * would require an extra network round-trip inside the realtime handler;
 * out of scope for this task, see docs/interim-decisions.md.
 */
export const REALTIME_TOAST_COPY: Record<RealtimeChangeKind, string | null> = {
  watchlist_entry_added: "Neuer Film zur Watchlist hinzugefügt",
  rating_first: "Jemand hat einen Film bewertet",
  payment_recorded: "Eine Zahlung wurde erfasst",
  other: null,
};
