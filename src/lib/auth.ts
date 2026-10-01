import { AUTH_CALLBACK_URL } from "./authDeepLink";
import { supabase } from "./supabase";

// Thin, typed wrappers around the Supabase Auth SDK calls needed for
// email+password sign-up/sign-in/sign-out (ADR 0004). Error handling
// convention: never throw — always return the underlying SDK's own
// `{ data, error }` (or `{ error }` for signOut) result unchanged, so
// callers (screens, later milestones) branch on `error` the same way they
// would with the raw supabase-js client. Keeping this uniform across all
// three functions avoids mixing throw-based and return-based error handling
// in the same small module.

/**
 * `displayName` is passed as sign-up metadata (`raw_user_meta_data.display_name`),
 * which the `handle_new_user` trigger reads to seed `profiles.display_name`.
 */
export async function signUpWithEmail(email: string, password: string, displayName: string) {
  return supabase.auth.signUp({
    email,
    password,
    // emailRedirectTo: the confirmation link opens the app (src/app/auth/callback.tsx).
    options: { data: { display_name: displayName }, emailRedirectTo: AUTH_CALLBACK_URL },
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

/** Sends the password-reset mail; the link opens the app at the auth callback route. */
export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: AUTH_CALLBACK_URL });
}

/** Sets a new password for the current (recovery) session. */
export async function updatePassword(password: string) {
  return supabase.auth.updateUser({ password });
}

/** Implicit flow: establishes the session from the tokens in a deep link fragment. */
export async function establishSessionFromTokens(accessToken: string, refreshToken: string) {
  return supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

/** PKCE flow (not used by the current client config, kept for robustness). */
export async function exchangeAuthCode(code: string) {
  return supabase.auth.exchangeCodeForSession(code);
}
