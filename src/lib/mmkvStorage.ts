import { createMMKV } from "react-native-mmkv";
import type { StateStorage } from "zustand/middleware";

/**
 * Single MMKV instance backing all persisted client/UI preferences.
 *
 * IMPORTANT: this is for genuine UI/client preferences only (e.g. which tab
 * was last active). Server-state from Supabase (groups, movies, watchlist,
 * ratings, ...) must never be written to this storage — that data belongs
 * exclusively to TanStack Query's in-memory cache.
 *
 * Note: the installed react-native-mmkv version (4.x) is the Nitro-modules
 * rewrite — there is no `new MMKV(...)` class to instantiate (`MMKV` is
 * exported only as a TypeScript type). Instances are created via the
 * `createMMKV(configuration)` factory function instead, and the instance
 * method to remove a key is `remove(key)`, not `delete(key)`.
 */
export const preferencesStorage = createMMKV({ id: "watchcrew-preferences" });

/**
 * Adapts `preferencesStorage` to Zustand's `StateStorage` interface so it
 * can be passed to `createJSONStorage` in the `persist` middleware.
 */
export const mmkvStorage: StateStorage = {
  getItem: (name) => preferencesStorage.getString(name) ?? null,
  setItem: (name, value) => {
    preferencesStorage.set(name, value);
  },
  removeItem: (name) => {
    preferencesStorage.remove(name);
  },
};
