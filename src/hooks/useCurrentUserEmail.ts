import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * M10 Settings hub: the signed-in user's email, or `undefined` before the
 * initial session lookup resolves / when signed out. Same session-subscription
 * pattern as `useCurrentUserId` (src/hooks/useCurrentUserId.ts), kept as its
 * own small hook rather than widening that one's return type — several
 * existing call sites already depend on `useCurrentUserId`'s plain
 * `string | undefined` contract.
 */
export function useCurrentUserEmail(): string | undefined {
  const [email, setEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    function applySession(session: Session | null) {
      if (isMounted) {
        setEmail(session?.user.email);
      }
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      applySession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      applySession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return email;
}
