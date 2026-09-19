import { supabase } from "./supabase";

// Thin, typed wrapper around the Supabase query needed to check a user's
// Watch-Group memberships (ADR 0003: Watch-Group is the sole shareable unit,
// so "does this user belong to any group yet" is the input to the M3
// navigation-shell's auth gate — see src/lib/authGate.ts). Same error
// handling convention as src/lib/auth.ts: never throw, always return the
// underlying Supabase `{ data, error }` result unchanged so callers branch
// on `error` the same way they would with the raw supabase-js client.

export interface WatchGroupMembershipRow {
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
}

export async function getUserGroups(userId: string) {
  return supabase.from("watch_group_members").select("*").eq("user_id", userId);
}
