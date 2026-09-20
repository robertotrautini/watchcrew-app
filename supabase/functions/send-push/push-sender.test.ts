// Deno.test suite for M10's `send-push` core sending logic
// (push-sender.ts) -- actor-exclusion, deep-link payload shape, and
// dead-token pruning, all with a fully mocked `PushSenderDb` and mocked
// Expo HTTP calls. No real Supabase client, Postgrest, or network call
// involved. Same fixture-based style as ../tmdb-proxy/movie-upsert.test.ts.
//
// Run with: deno test supabase/functions/send-push/push-sender.test.ts

import {
  buildDeepLinkData,
  buildNotificationCopy,
  sendPushForEvent,
  type ExpoPushMessage,
  type ExpoPushResult,
  type PushEvent,
  type PushSenderDb,
  type TokenRow,
} from "./push-sender.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message}\n  actual:   ${a}\n  expected: ${e}`);
  }
}

// --- fixtures ---------------------------------------------------------------

function newEntryEvent(overrides: Partial<PushEvent> = {}): PushEvent {
  return {
    eventType: "new_entry",
    groupId: "group-1",
    watchlistEntryId: "entry-1",
    tmdbId: 603,
    actingUserId: "user-adder",
    ...overrides,
  };
}

interface FakeDbOptions {
  subscribedUserIds?: string[];
  tokensByUser?: Record<string, string[]>;
  movieName?: string | null;
}

interface FakeDbCalls {
  getSubscribedUserIds: Array<{ groupId: string; excludeUserId: string | null }>;
  getTokensForUsers: string[][];
  deleteTokens: string[][];
}

function createFakeDb(options: FakeDbOptions = {}): { db: PushSenderDb; calls: FakeDbCalls } {
  const calls: FakeDbCalls = {
    getSubscribedUserIds: [],
    getTokensForUsers: [],
    deleteTokens: [],
  };

  const subscribedUserIds = options.subscribedUserIds ?? [];
  const tokensByUser = options.tokensByUser ?? {};
  let deletedTokens = new Set<string>();

  const db: PushSenderDb = {
    async getSubscribedUserIds(groupId, excludeUserId) {
      calls.getSubscribedUserIds.push({ groupId, excludeUserId });
      return subscribedUserIds.filter((id) => id !== excludeUserId);
    },
    async getTokensForUsers(userIds) {
      calls.getTokensForUsers.push(userIds);
      const rows: TokenRow[] = [];
      for (const userId of userIds) {
        for (const token of tokensByUser[userId] ?? []) {
          if (!deletedTokens.has(token)) {
            rows.push({ userId, token });
          }
        }
      }
      return rows;
    },
    async getMovieNameByTmdbId() {
      return options.movieName ?? "The Matrix";
    },
    async deleteTokens(tokens) {
      calls.deleteTokens.push(tokens);
      deletedTokens = new Set([...deletedTokens, ...tokens]);
    },
  };

  return { db, calls };
}

function okTicket(id: string): ExpoPushResult {
  return { status: "ok", id };
}

function errorTicket(error: string): ExpoPushResult {
  return { status: "error", message: "failed", details: { error } };
}

// --- actor exclusion ----------------------------------------------------

Deno.test("sendPushForEvent: excludes the acting user from subscribers, even if they are subscribed", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-adder", "user-other"],
    tokensByUser: { "user-other": ["token-other"] },
  });

  await sendPushForEvent(newEntryEvent({ actingUserId: "user-adder" }), {
    db,
    sendMessages: async (messages) => messages.map(() => okTicket("t1")),
    fetchReceipts: async () => ({}),
  });

  assertEquals(
    calls.getSubscribedUserIds,
    [{ groupId: "group-1", excludeUserId: "user-adder" }],
    "expected the acting user id to be passed through for exclusion",
  );
});

Deno.test("sendPushForEvent: sends nothing and calls no Expo API when only the acting user is subscribed", async () => {
  const { db } = createFakeDb({
    subscribedUserIds: ["user-adder"],
    tokensByUser: { "user-adder": ["token-adder"] },
  });

  let sendMessagesCalled = false;
  const result = await sendPushForEvent(newEntryEvent({ actingUserId: "user-adder" }), {
    db,
    sendMessages: async () => {
      sendMessagesCalled = true;
      return [];
    },
  });

  assertEquals(result, { recipientCount: 0, sentCount: 0, prunedTokens: [] }, "expected a no-op result");
  assert(!sendMessagesCalled, "expected the Expo send API to never be called when nobody would receive anything");
});

Deno.test("sendPushForEvent: release_reminder events (actingUserId: null) exclude nobody", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-a", "user-b"],
    tokensByUser: { "user-a": ["token-a"], "user-b": ["token-b"] },
  });

  await sendPushForEvent(
    {
      eventType: "release_reminder",
      groupId: "group-1",
      watchlistEntryId: "entry-1",
      tmdbId: 603,
      actingUserId: null,
      reminderType: "7_days",
    },
    { db, sendMessages: async (messages) => messages.map(() => okTicket("t")), fetchReceipts: async () => ({}) },
  );

  assertEquals(
    calls.getSubscribedUserIds,
    [{ groupId: "group-1", excludeUserId: null }],
    "expected no exclusion for a null actingUserId",
  );
});

// --- deep-link payload shape ----------------------------------------------

Deno.test("buildDeepLinkData: includes groupId, tmdbId, watchlistEntryId, eventType", () => {
  const data = buildDeepLinkData(
    newEntryEvent({ groupId: "g1", watchlistEntryId: "e1", tmdbId: 603 }),
  );

  assertEquals(
    data,
    { eventType: "new_entry", groupId: "g1", tmdbId: 603, watchlistEntryId: "e1" },
    "expected the full deep-link context in the payload",
  );
});

Deno.test("sendPushForEvent: every Expo message carries the full deep-link data block", async () => {
  const { db } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["token-other"] },
  });

  let sentMessages: ExpoPushMessage[] = [];
  await sendPushForEvent(
    newEntryEvent({ groupId: "g1", watchlistEntryId: "e1", tmdbId: 603, actingUserId: "user-adder" }),
    {
      db,
      sendMessages: async (messages) => {
        sentMessages = messages;
        return messages.map(() => okTicket("t1"));
      },
      fetchReceipts: async () => ({}),
    },
  );

  assertEquals(sentMessages.length, 1, "expected exactly one message");
  assertEquals(
    sentMessages[0].data,
    { eventType: "new_entry", groupId: "g1", tmdbId: 603, watchlistEntryId: "e1" },
    "expected the message's data block to carry the full deep-link context",
  );
  assertEquals(sentMessages[0].to, "token-other", "expected the message addressed to the subscriber's token");
});

Deno.test("sendPushForEvent: a subscriber with multiple devices gets one message per token", async () => {
  const { db } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["token-phone", "token-tablet"] },
  });

  let sentMessages: ExpoPushMessage[] = [];
  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async (messages) => {
      sentMessages = messages;
      return messages.map(() => okTicket("t"));
    },
    fetchReceipts: async () => ({}),
  });

  assertEquals(sentMessages.map((m) => m.to).sort(), ["token-phone", "token-tablet"], "expected one message per device token");
  assertEquals(result.recipientCount, 1, "expected exactly one unique recipient (one user, two devices)");
  assertEquals(result.sentCount, 2, "expected two messages sent (one per device)");
});

// --- dead-token pruning -----------------------------------------------------

Deno.test("sendPushForEvent: prunes a token whose /send ticket reports DeviceNotRegistered", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["dead-token"] },
  });

  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async () => [errorTicket("DeviceNotRegistered")],
  });

  assertEquals(result.prunedTokens, ["dead-token"], "expected the dead token to be pruned");
  assertEquals(calls.deleteTokens, [["dead-token"]], "expected exactly one deleteTokens call with the dead token");
});

Deno.test("sendPushForEvent: does NOT prune on a transient/non-permanent ticket error", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["flaky-token"] },
  });

  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async () => [errorTicket("MessageTooBig")],
  });

  assertEquals(result.prunedTokens, [], "expected no pruning for a non-permanent error");
  assertEquals(calls.deleteTokens, [], "expected deleteTokens to never be called");
});

Deno.test("sendPushForEvent: prunes a token whose receipt (not the initial ticket) reports DeviceNotRegistered", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["dead-token"] },
  });

  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async () => [okTicket("ticket-1")],
    fetchReceipts: async (ids) => {
      assertEquals(ids, ["ticket-1"], "expected the receipt check to use the ticket id from the send response");
      return { "ticket-1": errorTicket("DeviceNotRegistered") };
    },
  });

  assertEquals(result.prunedTokens, ["dead-token"], "expected the token to be pruned from the receipt check");
  assertEquals(calls.deleteTokens, [["dead-token"]], "expected exactly one deleteTokens call");
});

Deno.test("sendPushForEvent: an ok receipt does not prune anything, and skips the receipt call entirely with no ticket ids", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-other"],
    tokensByUser: { "user-other": ["ok-token"] },
  });

  let receiptsCalled = false;
  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async () => [errorTicket("DeviceNotRegistered")], // no ticket id -> nothing to check receipts for
    fetchReceipts: async () => {
      receiptsCalled = true;
      return {};
    },
  });

  assert(!receiptsCalled, "expected fetchReceipts to be skipped when there are no successful ticket ids");
  assertEquals(result.prunedTokens, ["ok-token"], "expected the token pruned via the ticket-level error only");
  assertEquals(calls.deleteTokens, [["ok-token"]], "expected exactly one deleteTokens call");
});

Deno.test("sendPushForEvent: multiple dead tokens across multiple recipients are all pruned in a single deleteTokens call", async () => {
  const { db, calls } = createFakeDb({
    subscribedUserIds: ["user-a", "user-b"],
    tokensByUser: { "user-a": ["dead-a"], "user-b": ["dead-b"] },
  });

  const result = await sendPushForEvent(newEntryEvent(), {
    db,
    sendMessages: async () => [errorTicket("DeviceNotRegistered"), errorTicket("DeviceNotRegistered")],
  });

  assertEquals(result.prunedTokens.sort(), ["dead-a", "dead-b"], "expected both dead tokens pruned");
  assertEquals(calls.deleteTokens.length, 1, "expected a single batched deleteTokens call, not one per token");
});

// --- notification copy -------------------------------------------------------

Deno.test("buildNotificationCopy: uses the movie's real name when known", () => {
  const { body } = buildNotificationCopy(newEntryEvent(), "The Matrix");
  assert(body.includes("The Matrix"), `expected the movie name in the body, got: ${body}`);
});

Deno.test("buildNotificationCopy: falls back to a generic placeholder when the movie name is unknown", () => {
  const { body } = buildNotificationCopy(newEntryEvent(), null);
  assert(!body.includes("null"), `expected a graceful fallback, not a literal 'null', got: ${body}`);
});

Deno.test("buildNotificationCopy: release_reminder varies copy by reminderType", () => {
  const dayOf = buildNotificationCopy(
    { eventType: "release_reminder", groupId: "g", watchlistEntryId: "e", tmdbId: 1, actingUserId: null, reminderType: "day_of" },
    "Dune",
  );
  const fourteenDays = buildNotificationCopy(
    { eventType: "release_reminder", groupId: "g", watchlistEntryId: "e", tmdbId: 1, actingUserId: null, reminderType: "14_days" },
    "Dune",
  );

  assert(dayOf.body !== fourteenDays.body, "expected different copy for different reminder types");
});
