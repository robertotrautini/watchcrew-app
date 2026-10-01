import type { Session } from "@supabase/supabase-js";
import type { DehydrateOptions, Query, QueryClient } from "@tanstack/react-query";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import Constants from "expo-constants";
import { createMMKV } from "react-native-mmkv";

/**
 * Offline level 1 (docs/planning-report.html, section C): read-cache of the
 * TanStack Query server-state, persisted to MMKV via `persistQueryClient`.
 * No offline mutation queue (that is level 2).
 */

/** Minimal slice of an MMKV instance used here (also fakeable in tests). */
export interface KeyValueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const CACHE_KEY = "watchcrew-query-cache";
const OWNER_KEY = "watchcrew-query-cache-owner";

/** Cached data older than this is dropped on restore. */
export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Writes to MMKV are coalesced to at most one per this window. */
export const PERSIST_THROTTLE_MS = 1000;

/**
 * Bump CACHE_SCHEMA_VERSION whenever the shape of a cached query result
 * changes; the app version is part of the buster too, so every release
 * starts with a clean cache instead of stale shapes.
 */
const CACHE_SCHEMA_VERSION = "2";
export const PERSIST_BUSTER = `${Constants.expoConfig?.version ?? "0"}-${CACHE_SCHEMA_VERSION}`;

/** Transient lookup queries that make no sense to restore. */
const NON_PERSISTED_ROOTS = new Set(["movieSearch", "personSearch", "companySearch"]);

/**
 * True when `value` survives a JSON round trip unchanged in shape: only
 * primitives, arrays and plain objects. Map/Set/Date/class instances are
 * restored as `{}`/strings and would crash consumers after a restart.
 */
export function isJsonSafe(value: unknown): boolean {
  if (value === null || typeof value !== "object") return typeof value !== "function" && typeof value !== "symbol" && typeof value !== "bigint";
  if (Array.isArray(value)) return value.every(isJsonSafe);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value as Record<string, unknown>).every(isJsonSafe);
}

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== "success") return false;
  if (!isJsonSafe(query.state.data)) return false;
  return !NON_PERSISTED_ROOTS.has(String(query.queryKey[0]));
}

export const persistDehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: shouldPersistQuery,
};

/** Dedicated MMKV instance, separate from the preferences store. */
export const queryCacheStorage: KeyValueStorage = createMMKV({ id: "watchcrew-query-cache" });

export function createMmkvPersister(
  storage: KeyValueStorage,
  throttleMs: number = PERSIST_THROTTLE_MS,
): Persister {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: PersistedClient | null = null;

  return {
    persistClient: async (client) => {
      pending = client;
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        if (pending) {
          storage.set(CACHE_KEY, JSON.stringify(pending));
          pending = null;
        }
      }, throttleMs);
    },
    restoreClient: async () => {
      const raw = storage.getString(CACHE_KEY);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as PersistedClient;
      } catch {
        storage.remove(CACHE_KEY);
        return undefined;
      }
    },
    removeClient: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending = null;
      storage.remove(CACHE_KEY);
    },
  };
}

export const queryPersister = createMmkvPersister(queryCacheStorage);

/** Empties the in-memory cache and the persisted copy (sign-out, user switch). */
export async function clearPersistedQueryCache(
  client: QueryClient,
  persister: Pick<Persister, "removeClient"> = queryPersister,
): Promise<void> {
  client.clear();
  await persister.removeClient();
}

/**
 * Keeps the cache bound to the signed-in user: SIGNED_OUT (also fired by
 * account deletion's signOut) clears it, and a session for a different user
 * than the recorded owner clears it before the new user sees old data.
 */
export async function handleAuthEventForCache(
  event: string,
  session: Session | null,
  client: QueryClient,
  persister: Pick<Persister, "removeClient"> = queryPersister,
  storage: KeyValueStorage = queryCacheStorage,
): Promise<void> {
  if (event === "SIGNED_OUT") {
    storage.remove(OWNER_KEY);
    await clearPersistedQueryCache(client, persister);
    return;
  }
  const userId = session?.user.id;
  if (!userId) return;
  const owner = storage.getString(OWNER_KEY);
  if (owner && owner !== userId) {
    await clearPersistedQueryCache(client, persister);
  }
  storage.set(OWNER_KEY, userId);
}
