import { supabase } from "./supabase";

/**
 * M10 Settings hub: the current user's own `profiles` row (just
 * `display_name` — the only column that table has beyond `id`/`created_at`,
 * per supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql).
 * Lookup only; writing goes through `updateOwnDisplayName` below.
 *
 * Follows the same "never throw, always resolve Supabase's raw
 * { data, error }" convention as the rest of src/lib/groups.ts.
 */
export async function getOwnProfile(userId: string) {
  return supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
}

/**
 * Saves the caller's own display name via the `set_display_name` SECURITY
 * DEFINER RPC (supabase/migrations/20260930100000_*), which upserts the
 * caller's `profiles` row -- `authenticated` has no direct write grant.
 */
export async function updateOwnDisplayName(displayName: string) {
  return supabase.rpc("set_display_name", { p_display_name: displayName.trim() });
}
