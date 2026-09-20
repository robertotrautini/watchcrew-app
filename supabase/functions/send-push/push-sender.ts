// M10 (part) — send-push Edge Function core logic.
//
// This is the shared sending mechanism invoked for ALL THREE push trigger
// conditions (ADR 0006 / feature-inventory.md §4.2): a new watchlist entry,
// a first-time rating, and a scheduled release-date reminder. The three
// Postgres call sites (two AFTER-INSERT/UPDATE triggers + one pg_cron job,
// all in supabase/migrations/20260920150000_push_notifications.sql) only
// ever differ in the `eventType`/`reminderType` fields of the JSON payload
// they post to this function's `index.ts` -- the actual subscriber lookup,
// actor-exclusion, Expo Push API call, and dead-token pruning logic below is
// written ONCE and reused for all three, per the task's explicit "reuse
// send-push's core sending logic rather than duplicating it" requirement.
//
// Same injectable-dependency pattern as ../tmdb-proxy/movie-upsert.ts: the DB
// access is an injected `PushSenderDb` (a small set of named async
// operations, not a raw SupabaseClient) and the two Expo HTTP calls take an
// injectable `fetch`-like function, so `sendPushForEvent` and its helpers are
// unit-testable with plain fakes/mocks -- no real Supabase client, Postgrest,
// or network call involved in the Deno.test suite (push-sender.test.ts).

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// --- event / payload shape --------------------------------------------------

export type PushEventType = "new_entry" | "first_rating" | "release_reminder";

export type ReleaseReminderType = "14_days" | "7_days" | "1_day" | "day_of" | "newly_added";

export interface PushEvent {
  eventType: PushEventType;
  groupId: string;
  watchlistEntryId: string;
  tmdbId: number;
  /**
   * The member whose action caused this event -- excluded from receiving
   * the notification themselves (requirement: "the person who caused the
   * event shouldn't get notified about their own action"). `null` for
   * `release_reminder` events, which nobody "acts" to cause -- nobody is
   * excluded in that case.
   */
  actingUserId: string | null;
  /** Only present for `eventType: "release_reminder"`. */
  reminderType?: ReleaseReminderType;
}

// --- injectable DB access ----------------------------------------------------

export interface TokenRow {
  userId: string;
  token: string;
}

/** Injectable DB operations backing `sendPushForEvent` -- see file header. */
export interface PushSenderDb {
  /**
   * Every user subscribed (`push_subscriptions`) to `groupId`, excluding
   * `excludeUserId` when given (the acting user, never notified about their
   * own action).
   */
  getSubscribedUserIds(groupId: string, excludeUserId: string | null): Promise<string[]>;
  /** Every `push_tokens` row (there may be several per user -- multiple devices) for the given users. */
  getTokensForUsers(userIds: string[]): Promise<TokenRow[]>;
  /** The movie's display name, for the notification copy -- `null` if not found (defensive, should not normally happen). */
  getMovieNameByTmdbId(tmdbId: number): Promise<string | null>;
  /** Dead-token pruning (requirement 4) -- deletes exactly these `expo_push_token` values from `push_tokens`, regardless of owner. */
  deleteTokens(tokens: string[]): Promise<void>;
}

/**
 * Real, production `PushSenderDb` -- wraps the service-role Supabase client
 * (bypasses RLS, same as every other write/cross-user-read in this Edge
 * Function family -- see ../tmdb-proxy/index.ts's `getSupabaseClient()`).
 */
export function createSupabasePushSenderDb(supabase: SupabaseClient): PushSenderDb {
  return {
    async getSubscribedUserIds(groupId, excludeUserId) {
      let query = supabase.from("push_subscriptions").select("user_id").eq("group_id", groupId);
      if (excludeUserId) {
        query = query.neq("user_id", excludeUserId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return ((data as { user_id: string }[] | null) ?? []).map((row) => row.user_id);
    },

    async getTokensForUsers(userIds) {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("push_tokens")
        .select("user_id, expo_push_token")
        .in("user_id", userIds);
      if (error) throw error;
      return ((data as { user_id: string; expo_push_token: string }[] | null) ?? []).map((row) => ({
        userId: row.user_id,
        token: row.expo_push_token,
      }));
    },

    async getMovieNameByTmdbId(tmdbId) {
      const { data, error } = await supabase
        .from("movies")
        .select("name")
        .eq("tmdb_id", tmdbId)
        .maybeSingle();
      if (error) throw error;
      return (data as { name: string } | null)?.name ?? null;
    },

    async deleteTokens(tokens) {
      if (tokens.length === 0) return;
      const { error } = await supabase.from("push_tokens").delete().in("expo_push_token", tokens);
      if (error) throw error;
    },
  };
}

// --- Expo Push API (injectable fetch) ---------------------------------------

const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

export interface ExpoPushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * A single Expo push "ticket" (the immediate `/send` response) or "receipt"
 * (the later `/getReceipts` response) -- both share this same shape per
 * Expo's API docs.
 */
export interface ExpoPushResult {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export type FetchLike = typeof fetch;

export async function sendExpoPushMessages(
  messages: ExpoPushMessage[],
  fetchImpl: FetchLike = fetch,
): Promise<ExpoPushResult[]> {
  if (messages.length === 0) return [];

  const response = await fetchImpl(EXPO_PUSH_SEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const json = await response.json();
  return (json?.data ?? []) as ExpoPushResult[];
}

/**
 * Best-effort IMMEDIATE receipt check for the ticket ids returned by
 * `sendExpoPushMessages`. Expo's own docs recommend waiting longer (they
 * suggest ~15 minutes) before a receipt is guaranteed to be ready, so this
 * is a known, documented limitation (see docs/interim-decisions.md "M10 —
 * Push-Zustellbestätigung") rather than a fully accurate delayed-receipt
 * reconciliation system -- out of scope here per the task's own "mock the
 * HTTP call, TDD the pruning logic" framing, which does not ask for a
 * second scheduled job just to re-check receipts later. Tokens that fail
 * with a permanent error either immediately (in the `/send` ticket itself)
 * or in this best-effort immediate receipt check are still pruned; a token
 * whose real delivery failure is only discovered by Expo's servers later
 * than this immediate check will simply be pruned on ITS NEXT send attempt
 * instead (the next ticket-level error), not lost forever.
 */
export async function fetchExpoPushReceipts(
  ticketIds: string[],
  fetchImpl: FetchLike = fetch,
): Promise<Record<string, ExpoPushResult>> {
  if (ticketIds.length === 0) return {};

  const response = await fetchImpl(EXPO_PUSH_RECEIPTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ ids: ticketIds }),
  });
  const json = await response.json();
  return (json?.data ?? {}) as Record<string, ExpoPushResult>;
}

/**
 * Permanent, "never retry this token again" Expo error codes -- per
 * requirement 4, `DeviceNotRegistered` is the named case; `InvalidCredentials`
 * is Expo's other documented permanent (as opposed to transient/rate-limit)
 * per-token failure and is pruned for the same reason.
 */
function isPermanentPushError(error: string | undefined): boolean {
  return error === "DeviceNotRegistered" || error === "InvalidCredentials";
}

// --- notification copy + deep-link payload ----------------------------------

/**
 * Placeholder German copy (same "reversible, documented placeholder" status
 * as the M5 empty-state copy -- see docs/interim-decisions.md) -- exact
 * wording was not specified anywhere in feature-inventory.md/ADR 0006 for
 * this brand-new (WatchCrew-only) feature.
 */
export function buildNotificationCopy(
  event: PushEvent,
  movieName: string | null,
): { title: string; body: string } {
  const name = movieName ?? "Ein Film";

  switch (event.eventType) {
    case "new_entry":
      return { title: "Neu in der Watchlist", body: `„${name}“ wurde zur Watchlist hinzugefügt.` };
    case "first_rating":
      return { title: "Neue Bewertung", body: `„${name}“ wurde bewertet.` };
    case "release_reminder":
      switch (event.reminderType) {
        case "14_days":
          return { title: "Bald verfügbar", body: `„${name}“ erscheint in 14 Tagen.` };
        case "7_days":
          return { title: "Bald verfügbar", body: `„${name}“ erscheint in 7 Tagen.` };
        case "1_day":
          return { title: "Morgen ist es soweit", body: `„${name}“ erscheint morgen.` };
        case "day_of":
          return { title: "Heute erscheint...", body: `„${name}“ erscheint heute.` };
        case "newly_added":
        default:
          return { title: "Neu hinzugefügt", body: `„${name}“ erscheint bald.` };
      }
  }
}

/**
 * Full deep-link context (requirement 3) -- `groupId` + `tmdbId` +
 * `watchlistEntryId` together, so the app can navigate directly to the right
 * movie-detail screen on tap even from a cold start (see
 * src/hooks/usePushNotificationRouting.ts on the client side). This is a
 * known, twice-reinforced legacy bugfix rule (missing context breaks the
 * deep link), so every field is always included rather than only the
 * minimum the spec names.
 */
export function buildDeepLinkData(event: PushEvent): Record<string, unknown> {
  return {
    eventType: event.eventType,
    groupId: event.groupId,
    tmdbId: event.tmdbId,
    watchlistEntryId: event.watchlistEntryId,
  };
}

// --- orchestration ------------------------------------------------------------

export interface SendPushDeps {
  db: PushSenderDb;
  sendMessages?: (messages: ExpoPushMessage[]) => Promise<ExpoPushResult[]>;
  fetchReceipts?: (ticketIds: string[]) => Promise<Record<string, ExpoPushResult>>;
}

export interface SendPushResult {
  /** How many group members (post actor-exclusion) had at least one token. */
  recipientCount: number;
  /** How many individual Expo push messages were sent (>= recipientCount when a recipient has multiple devices). */
  sentCount: number;
  /** Expo push tokens pruned this run (requirement 4). */
  prunedTokens: string[];
}

/**
 * The single shared sending pipeline for all three push trigger conditions.
 * See file header for the full reuse rationale.
 */
export async function sendPushForEvent(event: PushEvent, deps: SendPushDeps): Promise<SendPushResult> {
  const {
    db,
    sendMessages = (messages) => sendExpoPushMessages(messages),
    fetchReceipts = (ids) => fetchExpoPushReceipts(ids),
  } = deps;

  const subscribedUserIds = await db.getSubscribedUserIds(event.groupId, event.actingUserId);
  if (subscribedUserIds.length === 0) {
    return { recipientCount: 0, sentCount: 0, prunedTokens: [] };
  }

  const tokenRows = await db.getTokensForUsers(subscribedUserIds);
  if (tokenRows.length === 0) {
    return { recipientCount: 0, sentCount: 0, prunedTokens: [] };
  }

  const movieName = await db.getMovieNameByTmdbId(event.tmdbId);
  const { title, body } = buildNotificationCopy(event, movieName);
  const data = buildDeepLinkData(event);

  const messages: ExpoPushMessage[] = tokenRows.map((row) => ({
    to: row.token,
    sound: "default",
    title,
    body,
    data,
  }));

  const tickets = await sendMessages(messages);

  const prunedTokens = new Set<string>();
  const ticketIdToToken = new Map<string, string>();

  tickets.forEach((ticket, index) => {
    const token = tokenRows[index]?.token;
    if (!token) return;

    if (ticket.status === "error") {
      if (isPermanentPushError(ticket.details?.error)) {
        prunedTokens.add(token);
      }
      return;
    }

    if (ticket.id) {
      ticketIdToToken.set(ticket.id, token);
    }
  });

  if (ticketIdToToken.size > 0) {
    const receipts = await fetchReceipts([...ticketIdToToken.keys()]);
    for (const [ticketId, receipt] of Object.entries(receipts)) {
      if (receipt.status === "error" && isPermanentPushError(receipt.details?.error)) {
        const token = ticketIdToToken.get(ticketId);
        if (token) prunedTokens.add(token);
      }
    }
  }

  if (prunedTokens.size > 0) {
    await db.deleteTokens([...prunedTokens]);
  }

  const uniqueRecipients = new Set(tokenRows.map((row) => row.userId));

  return {
    recipientCount: uniqueRecipients.size,
    sentCount: messages.length,
    prunedTokens: [...prunedTokens],
  };
}
