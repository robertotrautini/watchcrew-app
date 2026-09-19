import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { resolveAuthGate, type AuthGateStatus } from "@/lib/authGate";
import { getUserGroups } from "@/lib/groups";
import { supabase } from "@/lib/supabase";

/**
 * The full set of states the root navigation shell can be in.
 * 'loading' is the only state not produced by the pure `resolveAuthGate`
 * function — it covers the window before the initial session/group lookup
 * has resolved, so the shell shows nothing (still under the splash overlay)
 * instead of flashing the wrong route group.
 */
export type AuthGateState = "loading" | AuthGateStatus;

/**
 * Drives the M3 root redirect (src/app/index.tsx): subscribes to the
 * Supabase session, looks up the signed-in user's Watch-Group memberships
 * (src/lib/groups.ts), and reduces both into a single `AuthGateState` via
 * the pure `resolveAuthGate` function (src/lib/authGate.ts).
 *
 * On a group-membership query error, this falls back to 'onboarding' rather
 * than getting stuck on 'loading' or throwing — a user who is authenticated
 * should always land somewhere navigable. This is a reasonable default for
 * the navigation-shell scaffold; screens further into M3 may want a
 * dedicated error state instead, which would be a business-rule call for
 * that later task, not this one.
 */
export function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>("loading");

  useEffect(() => {
    let isMounted = true;

    async function evaluate(session: Session | null) {
      if (!session) {
        if (isMounted) {
          setState(resolveAuthGate({ session: null, groups: null }));
        }
        return;
      }

      const { data, error } = await getUserGroups(session.user.id);
      if (!isMounted) {
        return;
      }
      setState(resolveAuthGate({ session, groups: error ? [] : data }));
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      void evaluate(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      void evaluate(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}
