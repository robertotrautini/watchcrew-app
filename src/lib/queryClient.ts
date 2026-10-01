import { QueryClient } from '@tanstack/react-query';

import { PERSIST_MAX_AGE_MS } from '@/lib/queryPersistence';

/**
 * Singleton TanStack Query client (M4 data layer).
 *
 * Offline level 1 (user-approved, docs/planning-report.html section C): the
 * read cache IS persisted to MMKV via `PersistQueryClientProvider`
 * (src/lib/queryPersistence.ts: successful queries only, 24h maxAge, buster,
 * cleared on sign-out). Client/UI preferences stay a separate Zustand + MMKV
 * store. There is no offline mutation queue.
 *
 * staleTime: 2 minutes. This is a small, chatty watch-group app — data
 * changes as group members interact with it — so staleness must not linger.
 * Realtime pushes live updates; normal refetch triggers
 * (refocus/reconnect/remount) keep data reasonably fresh.
 *
 * gcTime: equals the persistence maxAge (24h). TanStack requires
 * gcTime >= maxAge, otherwise restored/persisted queries would be garbage
 * collected (and dropped from the persisted copy) long before they expire.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: PERSIST_MAX_AGE_MS,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});
