// M11 part 2, Job 1 — "cleanup-inactive-accounts" Edge Function core logic.
//
// Invoked once daily by
// supabase/migrations/20260921100000_account_inactivity_cleanup.sql's
// `invoke_inactivity_cleanup()` (via `net.http_post`, same Vault-secret-
// based calling convention as ../send-push, see that migration's header
// comment). This half of Job 1 needs `auth.admin.deleteUser`
// (service-role/admin API), which a plain SQL function cannot call — the
// eligibility query itself lives here too (via `listWarnedProfiles`, a
// normal service-role table read), not in SQL, so the whole "who is
// actually still inactive" decision is made in one place.
//
// Same injectable-dependency pattern as ../delete-account/delete-account.ts
// and ../send-push/push-sender.ts: all I/O is behind a small `CleanupDeps`
// interface, so `runInactivityCleanup` is unit-testable with plain fakes —
// no real Supabase client or network call in the Deno.test suite
// (cleanup-inactive-accounts.test.ts).

export interface WarnedProfile {
  userId: string;
  /** `profiles.inactivity_warning_sent_at` — always non-null and >14 days old for a row returned by `listWarnedProfiles`. */
  warnedAt: string;
}

export interface DeleteUserOutcome {
  error: { message: string } | null;
}

export interface CleanupDeps {
  /**
   * Every `profiles` row with a non-null `inactivity_warning_sent_at` older
   * than 14 days — the SQL-side filter for "past the grace period" already
   * applied by the caller (index.ts), so this module only has to decide
   * whether the user actually logged back in since being warned.
   */
  listWarnedProfiles: () => Promise<WarnedProfile[]>;
  /** `auth.admin.getUserById(userId)`'s `last_sign_in_at`, or `null` if the user never signed in again (or the lookup failed). */
  getLastSignInAt: (userId: string) => Promise<string | null>;
  /** `auth.admin.deleteUser(userId)`. */
  deleteUser: (userId: string) => Promise<DeleteUserOutcome>;
}

export interface CleanupResult {
  deletedUserIds: string[];
  /** Logged back in during the grace period — correctly left alone, not an error. */
  skippedUserIds: string[];
  errors: Array<{ userId: string; message: string }>;
}

/**
 * Runs the full daily inactivity-cleanup sweep: for every user who was
 * warned over 14 days ago, deletes their account UNLESS they logged back in
 * since the warning was sent (`last_sign_in_at > warnedAt`). A `deleteUser`
 * failure for one user is recorded in `errors` and does not stop the sweep
 * from processing the remaining candidates.
 */
export async function runInactivityCleanup(deps: CleanupDeps): Promise<CleanupResult> {
  const candidates = await deps.listWarnedProfiles();

  const result: CleanupResult = { deletedUserIds: [], skippedUserIds: [], errors: [] };

  for (const candidate of candidates) {
    const lastSignInAt = await deps.getLastSignInAt(candidate.userId);

    const loggedBackIn = lastSignInAt !== null && new Date(lastSignInAt) > new Date(candidate.warnedAt);
    if (loggedBackIn) {
      result.skippedUserIds.push(candidate.userId);
      continue;
    }

    const { error } = await deps.deleteUser(candidate.userId);
    if (error) {
      result.errors.push({ userId: candidate.userId, message: error.message });
    } else {
      result.deletedUserIds.push(candidate.userId);
    }
  }

  return result;
}
