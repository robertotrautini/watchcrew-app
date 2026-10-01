import type { Session } from "@supabase/supabase-js";

import { largeSecureStore, supabase } from "@/lib/supabase";

/**
 * Reads the persisted Supabase session straight from SecureStore, bypassing
 * auth-js. Needed for OFFLINE cold starts: when the stored access token has
 * expired, auth-js tries a refresh on `getSession()`/`INITIAL_SESSION`; a
 * network failure (AuthRetryableFetchError) keeps the session in storage but
 * reports `session: null` to the caller. The user is still signed in, so the
 * app shell uses this stored copy to stay on the cached tabs. Never throws;
 * any problem yields `null`.
 */
export async function readStoredSession(): Promise<Session | null> {
  try {
    const storageKey = (supabase.auth as unknown as { storageKey?: string }).storageKey;
    if (!storageKey) return null;
    const raw = await largeSecureStore.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session> | null;
    if (!parsed?.user?.id || !parsed.refresh_token) return null;
    return parsed as Session;
  } catch {
    return null;
  }
}
