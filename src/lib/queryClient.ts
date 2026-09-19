import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton TanStack Query client (M4 data layer).
 *
 * NON-NEGOTIABLE: server-state (anything from Supabase — groups, movies,
 * watchlist, ratings) must NEVER be persisted to disk. It lives only in this
 * QueryClient's in-memory cache for the lifetime of the app process. Do NOT
 * add a persistence plugin (e.g. `@tanstack/query-async-storage-persister`)
 * to this client. Client/UI preferences are a separate, deliberately
 * persisted store (Zustand + MMKV, built in parallel) — that is a different
 * concern from this ephemeral server-state cache and must stay separate.
 *
 * staleTime: 2 minutes. This is a small, chatty watch-group app — data
 * changes as group members interact with it — so we don't want staleness to
 * linger indefinitely. Supabase Realtime subscriptions (a later milestone)
 * will eventually push live updates so aggressive polling/refetching won't
 * be needed, but Realtime isn't wired up yet this milestone, so a few
 * minutes keeps data reasonably fresh via normal refetch triggers
 * (refocus/reconnect/remount) without refetching on every render.
 *
 * gcTime: 10 minutes. How long unused/inactive query data is kept around in
 * memory (e.g. after a screen unmounts) before being garbage-collected, so
 * quick back-and-forth navigation doesn't force a fresh network round-trip.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});
