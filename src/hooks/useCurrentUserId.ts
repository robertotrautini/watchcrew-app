import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { readStoredSession } from "@/lib/storedSession";
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
    let latest = 0;

    // Offline cold start with an expired access token: auth-js reports
    // `session: null` although the session is stored (see readStoredSession).
    async function applySession(session: Session | null, event?: string) {
      const id = ++latest;
      let effective = session;
      if (!effective && event !== "SIGNED_OUT") {
        effective = (await readStoredSession()) ?? null;
      }
      if (isMounted && id === latest) {
        setUserId(effective?.user.id);
      }
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      void applySession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
      void applySession(session, event);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return userId;
}
