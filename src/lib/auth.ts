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
    options: { data: { display_name: displayName } },
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}
