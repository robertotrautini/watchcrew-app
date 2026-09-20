// M10 Settings hub — "Konto löschen" (ADR 0004 / App Store Guideline 5.1.1,
// mandatory account-deletion support).
//
// Structural self-only-deletion guarantee: the account this deletes is
// ALWAYS the caller's own, extracted from their own already-verified JWT.
// There is no parameter anywhere in this module for a target user id, so
// there is no code path — not even a bug — that could delete a different
// account. This is deliberately stronger than "we checked the id matches":
// the id an attacker might smuggle into the request body (e.g. a
// `userId`/`targetUserId` field) is never even read for that purpose (see
// `handleDeleteAccount` below, which drains the body but never inspects it).
//
// Trust boundary: `extractUserIdFromJwt` decodes the JWT's `sub` claim
// WITHOUT verifying its signature. This is safe ONLY because Supabase's
// Edge Functions gateway already verifies the token's signature before this
// function's code ever runs — `verify_jwt` defaults to `true` for every
// function unless explicitly disabled per-function in supabase/config.toml,
// and this project's config.toml has no `[functions.delete-account]`
// section overriding that default (confirmed at implementation time). If
// that default is ever flipped for this function, this decoding step would
// need to switch to real signature verification.
//
// `profiles` (M5) and `watch_group_members` (M1) both have `ON DELETE
// CASCADE` on their `auth.users` foreign key, so deleting the `auth.users`
// row via `supabase.auth.admin.deleteUser` cleanly cascades everything this
// user owns — no additional cleanup queries needed here.

export interface DeleteUserOutcome {
  error: { message: string } | null;
}

export interface DeleteAccountDeps {
  /** Real impl (index.ts): a service-role Supabase client's `auth.admin.deleteUser`. */
  deleteUser: (userId: string) => Promise<DeleteUserOutcome>;
}

export type DeleteAccountResponse =
  | { status: 200; body: { success: true } }
  | { status: 401 | 500; body: { error: string } };

/**
 * Decodes a JWT's `sub` claim without verifying its signature — see this
 * module's top comment for why that's safe in this specific context. Returns
 * `null` for a missing header, a malformed/non-3-part token, unparsable
 * base64/JSON, or a `sub` that isn't a non-empty string.
 */
export function extractUserIdFromJwt(authHeader: string | null | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1] : authHeader;
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Deletes ONLY the caller's own account, per this module's top comment.
 * `req`'s `Authorization` header is the SOLE source of the user id acted on
 * — the request body is drained (so the HTTP request completes cleanly
 * regardless of what a caller sends) but its content is never read for any
 * id field, even if present (e.g. a malicious `{ userId: "..." }` body is
 * silently ignored, not honored).
 */
export async function handleDeleteAccount(
  req: Request,
  deps: DeleteAccountDeps,
): Promise<DeleteAccountResponse> {
  const callerId = extractUserIdFromJwt(req.headers.get("Authorization"));

  // Drain the body without ever inspecting it for a user id — see doc
  // comment above. Tolerates an empty/missing/non-JSON body.
  try {
    await req.json();
  } catch {
    // No body, or non-JSON body — both fine, this action never needs one.
  }

  if (!callerId) {
    return { status: 401, body: { error: "Missing or invalid Authorization token" } };
  }

  const { error } = await deps.deleteUser(callerId);
  if (error) {
    return { status: 500, body: { error: error.message } };
  }

  return { status: 200, body: { success: true } };
}
