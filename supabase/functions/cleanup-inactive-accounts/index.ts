// M11 part 2, Job 1 — "cleanup-inactive-accounts" Edge Function. Thin HTTP
// entry point; all orchestration/eligibility logic lives in
// ./cleanup-inactive-accounts.ts, unit-tested separately with Deno.test (no
// real Supabase client or network call in those tests) — same split as
// ../delete-account/index.ts vs. its delete-account.ts.
//
// Invoked once daily by `invoke_inactivity_cleanup()`
// (supabase/migrations/20260921100000_account_inactivity_cleanup.sql) via
// `net.http_post` with an `Authorization: Bearer <service_role_key>` header
// looked up from Postgres Vault at call time — this function's JWT
// verification is left at the platform default (`verify_jwt = true`,
// supabase/config.toml has no override for this function), same as every
// other function in this project; the service-role key is itself a valid
// JWT, so it satisfies that gateway check the same way ../send-push's own
// invocation from `enqueue_push_notification()` already does.
//
// No request body is read — this function always runs its own full
// eligibility sweep, it takes no per-call parameters.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { runInactivityCleanup, type CleanupDeps, type WarnedProfile } from "./cleanup-inactive-accounts.ts";

const GRACE_PERIOD_DAYS = 14;

function getServiceRoleClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
  // into every Edge Function's environment — same pattern as
  // ../delete-account/index.ts's `getServiceRoleClient()`.
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

function createDeps(supabase: SupabaseClient): CleanupDeps {
  return {
    async listWarnedProfiles(): Promise<WarnedProfile[]> {
      const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

      // Service-role client bypasses RLS entirely (same as every other
      // cross-user read in this Edge Function family), so this sees every
      // user's `profiles` row regardless of the "authenticated" SELECT
      // policy on that table.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, inactivity_warning_sent_at")
        .not("inactivity_warning_sent_at", "is", null)
        .lt("inactivity_warning_sent_at", cutoff);

      if (error) {
        throw new Error(`listWarnedProfiles failed: ${error.message}`);
      }

      return (data ?? []).map((row) => ({
        userId: row.id as string,
        warnedAt: row.inactivity_warning_sent_at as string,
      }));
    },

    async getLastSignInAt(userId: string): Promise<string | null> {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error || !data?.user) {
        return null;
      }
      return data.user.last_sign_in_at ?? null;
    },

    async deleteUser(userId: string) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      return { error: error ? { message: error.message } : null };
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = getServiceRoleClient();
    const result = await runInactivityCleanup(createDeps(supabase));
    return jsonResponse({ data: result }, 200);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
