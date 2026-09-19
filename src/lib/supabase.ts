import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// expo-secure-store enforces a real ~2048 byte per-value limit on Android
// (Keystore/SharedPreferences) and effectively on iOS Keychain too. A
// Supabase auth session (JWT access token + refresh token + user object,
// including app_metadata/user_metadata) can realistically exceed that —
// Supabase's own JWTs alone are commonly 700-1000+ bytes, and the full
// serialized session JSON regularly pushes past 2048 bytes. To stay within
// SecureStore's limit without adding any new dependency (no AsyncStorage,
// no extra encryption library), large values are split across multiple
// SecureStore keys ("chunks") and reassembled on read.
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}_chunk_${index}`;
}

function chunkCountKey(key: string): string {
  return `${key}_chunk_count`;
}

export const largeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    if (countRaw === null) {
      return null;
    }

    const count = Number(countRaw);
    const chunks: string[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) {
        return null;
      }
      chunks.push(chunk);
    }

    return chunks.join("");
  },

  async setItem(key: string, value: string): Promise<void> {
    await largeSecureStore.removeItem(key);

    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < count; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, i), chunk);
    }
    await SecureStore.setItemAsync(chunkCountKey(key), String(count));
  },

  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const count = countRaw === null ? 0 : Number(countRaw);

    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  },
};

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabasePublishableKey = Constants.expoConfig?.extra?.supabasePublishableKey;

// See docs/adr/0004-auth-and-account-lifecycle.md: individual Supabase Auth
// accounts, email + password, email confirmation required before first
// login. detectSessionInUrl is off because this is a native app (no browser
// URL-based OAuth redirect flow in play here).
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: largeSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
