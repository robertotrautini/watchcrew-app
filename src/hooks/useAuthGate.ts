import type { Session } from "@supabase/supabase-js";
import { useIsRestoring } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { resolveAuthGate, type AuthGateStatus } from "@/lib/authGate";
import { getUserGroups } from "@/lib/groups";
import { queryClient } from "@/lib/queryClient";
import { readStoredSession } from "@/lib/storedSession";
import { supabase } from "@/lib/supabase";
import { userGroupsQueryOptions } from "@/hooks/useUserGroups";

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
 * that later task, not this one. The error itself is still logged
 * (`console.warn`, same convention as `src/hooks/usePushRegistration.ts`) so
 * a real transient failure is distinguishable from "user genuinely has no
 * group" in the logs/Sentry breadcrumbs, even though the UI behavior is the
 * same either way.
 *
 * `evaluate()` is triggered from two independent places below — the direct
 * `supabase.auth.getSession().then(evaluate)` call, and the
 * `onAuthStateChange` subscription (which auth-js also fires once for the
 * already-resolved initial session, by design). Both call `getUserGroups()`,
 * an async request with no ordering guarantee: a `requestIdRef` counter
 * tags each `evaluate()` invocation with the id that was current when it
 * started, and its `setState` is skipped if a newer call has since started
 * — otherwise a slow, superseded call could resolve after a faster, later
 * one and overwrite the correct state with stale data (confirmed real bug:
 * a just-created group briefly "disappearing" back to onboarding on the
 * next cold launch).
 *
 * Offline cold start: when `getUserGroups` fails (no network), the persisted
 * `userGroups` query cache (src/lib/queryPersistence.ts) decides instead --
 * >=1 cached group -> 'app' (the tabs then render from the cache), nothing
 * cached -> 'onboarding' as before. The evaluation therefore waits until the
 * async cache restoration is finished (`useIsRestoring`). Likewise, an
 * expired access token that cannot be refreshed offline makes auth-js report
 * `session: null` although the session is still stored; `readStoredSession`
 * recovers it (never on SIGNED_OUT).
 */
export function useAuthGate(): AuthGateState {
  const [state, setState] = useState<AuthGateState>("loading");
  const requestIdRef = useRef(0);
  const isRestoring = useIsRestoring();

  useEffect(() => {
    if (isRestoring) {
      return;
    }
    let isMounted = true;

    async function evaluate(initialSession: Session | null, event?: string) {
      const requestId = ++requestIdRef.current;

      let session = initialSession;
      if (!session && event !== "SIGNED_OUT") {
        session = (await readStoredSession()) ?? null;
        if (!isMounted || requestId !== requestIdRef.current) {
          return;
        }
      }

      if (!session) {
        if (isMounted && requestId === requestIdRef.current) {
          setState(resolveAuthGate({ session: null, groups: null }));
        }
        return;
      }

      const { data, error } = await getUserGroups(session.user.id);
      if (!isMounted || requestId !== requestIdRef.current) {
        return;
      }
      if (error) {
        console.warn("useAuthGate: getUserGroups failed, falling back to 'onboarding'", error);
      }
      const cachedGroups = error
        ? queryClient.getQueryData<unknown[]>(userGroupsQueryOptions(session.user.id).queryKey)
        : undefined;
      setState(resolveAuthGate({ session, groups: error ? (cachedGroups ?? []) : data }));
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      void evaluate(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      void evaluate(session, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isRestoring]);

  return state;
}
