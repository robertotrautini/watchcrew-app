import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

/**
 * The signed-in user's id, or `undefined` before the initial session lookup
 * resolves / when signed out. Same session-subscription pattern as
 * `useAuthGate` (src/hooks/useAuthGate.ts), extracted into its own small
 * hook since M5's Watchlist/Tagebuch screens need just the user id (for
 * `splitWatchlistAndDiary`/`sortDiary`'s `currentUserId` param), not the
 * full auth-gate state machine.
 */
export function useCurrentUserId(): string | undefined {
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isMounted = true;

    function applySession(session: Session | null) {
      if (isMounted) {
        setUserId(session?.user.id);
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

  return userId;
}
