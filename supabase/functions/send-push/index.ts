// M10 (part) — send-push Edge Function.
//
// Invoked by supabase/migrations/20260920150000_push_notifications.sql's
// `enqueue_push_notification()` (called from the two `watchlist_entries`/
// `ratings` triggers AND the `run_release_reminders()` pg_cron job) via
// `net.http_post`, always with the same JSON body shape (`PushEvent`, see
// ./push-sender.ts) and an `Authorization: Bearer <service_role_key>` header
// (looked up from Postgres Vault at call time -- see that migration's
// header comment for the full wiring decision).
//
// All the actual logic (subscriber lookup, actor-exclusion, Expo Push API
// call, dead-token pruning) lives in ./push-sender.ts, unit-tested
// separately with Deno.test — this file is only the thin HTTP entry point,
// same split as ../tmdb-proxy/index.ts vs. its tmdb-client.ts/movie-upsert.ts.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  createSupabasePushSenderDb,
  sendPushForEvent,
  type PushEvent,
  type PushEventType,
  type ReleaseReminderType,
} from "./push-sender.ts";

const VALID_EVENT_TYPES: PushEventType[] = ["new_entry", "first_rating", "release_reminder"];
const VALID_REMINDER_TYPES: ReleaseReminderType[] = [
  "14_days",
  "7_days",
  "1_day",
  "day_of",
  "newly_added",
];

interface SendPushRequestBody {
  eventType: PushEventType;
  groupId: string;
  watchlistEntryId: string;
  tmdbId: number;
  actingUserId: string | null;
  reminderType?: ReleaseReminderType;
}

function getSupabaseClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
  // into every Edge Function's environment — same as ../tmdb-proxy/index.ts.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in the function environment",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function badRequest(message: string): Response {
  return jsonResponse({ error: message }, 400);
}

function isValidBody(body: unknown): body is SendPushRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;

  if (typeof b.eventType !== "string" || !VALID_EVENT_TYPES.includes(b.eventType as PushEventType)) {
    return false;
  }
  if (typeof b.groupId !== "string" || b.groupId.length === 0) return false;
  if (typeof b.watchlistEntryId !== "string" || b.watchlistEntryId.length === 0) return false;
  if (typeof b.tmdbId !== "number") return false;
  if (b.actingUserId !== null && typeof b.actingUserId !== "string") return false;
  if (
    b.reminderType !== undefined &&
    !VALID_REMINDER_TYPES.includes(b.reminderType as ReleaseReminderType)
  ) {
    return false;
  }

  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!isValidBody(body)) {
    return badRequest(
      "Expected { eventType: 'new_entry'|'first_rating'|'release_reminder', groupId: string, watchlistEntryId: string, tmdbId: number, actingUserId: string|null, reminderType?: string }",
    );
  }

  try {
    const supabase = getSupabaseClient();
    const db = createSupabasePushSenderDb(supabase);

    const event: PushEvent = {
      eventType: body.eventType,
      groupId: body.groupId,
      watchlistEntryId: body.watchlistEntryId,
      tmdbId: body.tmdbId,
      actingUserId: body.actingUserId,
      reminderType: body.reminderType,
    };

    const result = await sendPushForEvent(event, { db });
    return jsonResponse({ data: result }, 200);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
