import { useEffect } from "react";

import { startConnectivityMonitor } from "@/lib/connectivity";
import { queryClient } from "@/lib/queryClient";
import { handleAuthEventForCache } from "@/lib/queryPersistence";
import { supabase } from "@/lib/supabase";

/**
 * Root-level offline-level-1 plumbing: binds the persisted query cache to
 * the signed-in user (cleared on sign-out/account deletion/user switch via
 * the auth state listener, so `auth.ts` stays untouched) and runs the
 * connectivity probe that feeds TanStack Query's `onlineManager`.
 */
export function useQueryCacheLifecycle() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void handleAuthEventForCache(event, session, queryClient);
    });
    const stopMonitor = startConnectivityMonitor();
    return () => {
      subscription.unsubscribe();
      stopMonitor();
    };
  }, []);
}
