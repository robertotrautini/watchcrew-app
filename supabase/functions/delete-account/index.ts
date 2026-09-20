// M10 Settings hub — "Konto löschen" Edge Function. Separate from
// tmdb-proxy (a distinct concern — irreversible account deletion, not TMDB
// caching), per this task's brief.
//
// This function's JWT verification is left at the Supabase platform default
// (`verify_jwt = true`) — supabase/config.toml has no `[functions.
// delete-account]` section disabling it, same as every other function in
// this project. That gateway-level check is what makes decoding the JWT's
// `sub` claim WITHOUT re-verifying its signature safe inside
// `delete-account.ts` (see that file's module comment for the full
// reasoning) — this function must never be deployed with verify_jwt
// disabled.
//
// All orchestration/self-only-deletion logic lives in ./delete-account.ts,
// unit-tested separately with Deno.test (no real Supabase client or network
// call in those tests). This file only wires that logic to a real
// service-role Supabase client and Deno.serve.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { handleDeleteAccount, type DeleteAccountDeps } from "./delete-account.ts";

function getServiceRoleClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
  // into every Edge Function's environment — same pattern as tmdb-proxy's
  // own `getSupabaseClient()` (supabase/functions/tmdb-proxy/index.ts).
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

const deps: DeleteAccountDeps = {
  deleteUser: async (userId: string) => {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    return { error: error ? { message: error.message } : null };
  },
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const result = await handleDeleteAccount(req, deps);
    return jsonResponse(result.body, result.status);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
