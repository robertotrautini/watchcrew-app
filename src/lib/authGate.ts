import type { Session } from "@supabase/supabase-js";

/**
 * The three "which route group should be shown" states for the app shell.
 * Deliberately excludes a "loading" state — that is a concern of the
 * `useAuthGate` hook (src/hooks/useAuthGate.ts), which wraps this pure
 * function with the async session/group lookups. This function only ever
 * runs once both inputs are known.
 */
export type AuthGateStatus = "auth" | "onboarding" | "app";

export interface AuthGateInput {
  session: Session | null;
  /**
   * The signed-in user's Watch-Group memberships, or `null` when that query
   * hasn't resolved yet / isn't applicable (no session). `null` and `[]`
   * are treated identically once a session exists — both mean "no confirmed
   * group membership yet" per ADR 0003 ("create or join a group" is a
   * required app state, not optional).
   */
  groups: unknown[] | null;
}

/**
 * Pure redirect-decision logic for the root navigation shell (M3):
 *   - no session                    -> 'auth'
 *   - session, no group memberships -> 'onboarding'
 *   - session, >=1 group membership -> 'app'
 */
export function resolveAuthGate({ session, groups }: AuthGateInput): AuthGateStatus {
  if (!session) {
    return "auth";
  }

  if (!groups || groups.length === 0) {
    return "onboarding";
  }

  return "app";
}
