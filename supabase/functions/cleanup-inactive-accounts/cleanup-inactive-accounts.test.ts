// Deno.test suite for the `cleanup-inactive-accounts` Edge Function's
// orchestration logic, using a fully mocked `CleanupDeps` — no real
// Supabase client or network call involved. Mirrors the hand-rolled
// assert-helper convention already used by
// ../delete-account/delete-account.test.ts and
// ../send-push/push-sender.test.ts.
//
// Run with: deno test supabase/functions/cleanup-inactive-accounts/

import { runInactivityCleanup, type CleanupDeps, type WarnedProfile } from "./cleanup-inactive-accounts.ts";

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

function createFakeDeps(options: {
  candidates?: WarnedProfile[];
  lastSignInAtByUser?: Record<string, string | null>;
  deleteOutcomeByUser?: Record<string, { error: { message: string } | null }>;
} = {}): { deps: CleanupDeps; deleteCalls: string[] } {
  const candidates = options.candidates ?? [];
  const lastSignInAtByUser = options.lastSignInAtByUser ?? {};
  const deleteOutcomeByUser = options.deleteOutcomeByUser ?? {};
  const deleteCalls: string[] = [];

  const deps: CleanupDeps = {
    listWarnedProfiles: async () => candidates,
    getLastSignInAt: async (userId: string) =>
      Object.prototype.hasOwnProperty.call(lastSignInAtByUser, userId) ? lastSignInAtByUser[userId] : null,
    deleteUser: async (userId: string) => {
      deleteCalls.push(userId);
      return deleteOutcomeByUser[userId] ?? { error: null };
    },
  };

  return { deps, deleteCalls };
}

Deno.test("runInactivityCleanup: no candidates -> nothing happens", async () => {
  const { deps, deleteCalls } = createFakeDeps({ candidates: [] });

  const result = await runInactivityCleanup(deps);

  assertEquals(result, { deletedUserIds: [], skippedUserIds: [], errors: [] }, "should be a no-op");
  assert(deleteCalls.length === 0, "deleteUser must not be called");
});

Deno.test(
  "runInactivityCleanup: deletes a user who never logged back in (last_sign_in_at stayed null)",
  async () => {
    const { deps, deleteCalls } = createFakeDeps({
      candidates: [{ userId: "user-a", warnedAt: "2026-01-01T00:00:00.000Z" }],
      lastSignInAtByUser: { "user-a": null },
    });

    const result = await runInactivityCleanup(deps);

    assertEquals(deleteCalls, ["user-a"], "deleteUser should be called for user-a");
    assertEquals(result.deletedUserIds, ["user-a"], "user-a should be deleted");
    assertEquals(result.skippedUserIds, [], "no one should be skipped");
  },
);

Deno.test(
  "runInactivityCleanup: deletes a user whose last_sign_in_at is BEFORE the warning (still inactive)",
  async () => {
    const { deps, deleteCalls } = createFakeDeps({
      candidates: [{ userId: "user-b", warnedAt: "2026-01-15T00:00:00.000Z" }],
      lastSignInAtByUser: { "user-b": "2025-01-01T00:00:00.000Z" },
    });

    const result = await runInactivityCleanup(deps);

    assertEquals(deleteCalls, ["user-b"], "deleteUser should be called for user-b");
    assertEquals(result.deletedUserIds, ["user-b"], "user-b should be deleted");
  },
);

Deno.test(
  "runInactivityCleanup: deletes a user whose last_sign_in_at EQUALS the warning moment exactly",
  async () => {
    const warnedAt = "2026-01-15T00:00:00.000Z";
    const { deps, deleteCalls } = createFakeDeps({
      candidates: [{ userId: "user-edge", warnedAt }],
      lastSignInAtByUser: { "user-edge": warnedAt },
    });

    const result = await runInactivityCleanup(deps);

    assertEquals(deleteCalls, ["user-edge"], "an exact-equal timestamp is not a new login, should delete");
    assertEquals(result.deletedUserIds, ["user-edge"], "user-edge should be deleted");
  },
);

Deno.test(
  "runInactivityCleanup: skips (does NOT delete) a user who logged back in AFTER being warned",
  async () => {
    const { deps, deleteCalls } = createFakeDeps({
      candidates: [{ userId: "user-c", warnedAt: "2026-01-01T00:00:00.000Z" }],
      lastSignInAtByUser: { "user-c": "2026-01-10T00:00:00.000Z" },
    });

    const result = await runInactivityCleanup(deps);

    assert(deleteCalls.length === 0, "deleteUser must never be called for a user who logged back in");
    assertEquals(result.skippedUserIds, ["user-c"], "user-c should be recorded as skipped");
    assertEquals(result.deletedUserIds, [], "user-c must not be deleted");
  },
);

Deno.test(
  "runInactivityCleanup: records a deleteUser error without stopping the sweep for remaining users",
  async () => {
    const { deps, deleteCalls } = createFakeDeps({
      candidates: [
        { userId: "user-fails", warnedAt: "2026-01-01T00:00:00.000Z" },
        { userId: "user-ok", warnedAt: "2026-01-01T00:00:00.000Z" },
      ],
      lastSignInAtByUser: { "user-fails": null, "user-ok": null },
      deleteOutcomeByUser: {
        "user-fails": { error: { message: "admin API unavailable" } },
      },
    });

    const result = await runInactivityCleanup(deps);

    assertEquals(deleteCalls, ["user-fails", "user-ok"], "both users should be attempted");
    assertEquals(
      result.errors,
      [{ userId: "user-fails", message: "admin API unavailable" }],
      "the failure should be recorded",
    );
    assertEquals(result.deletedUserIds, ["user-ok"], "the second user should still be deleted");
  },
);

Deno.test("runInactivityCleanup: processes multiple independent candidates correctly", async () => {
  const { deps } = createFakeDeps({
    candidates: [
      { userId: "still-inactive", warnedAt: "2026-01-01T00:00:00.000Z" },
      { userId: "came-back", warnedAt: "2026-01-01T00:00:00.000Z" },
    ],
    lastSignInAtByUser: {
      "still-inactive": null,
      "came-back": "2026-01-05T00:00:00.000Z",
    },
  });

  const result = await runInactivityCleanup(deps);

  assertEquals(result.deletedUserIds, ["still-inactive"], "only the still-inactive user should be deleted");
  assertEquals(result.skippedUserIds, ["came-back"], "the returning user should be skipped");
});
