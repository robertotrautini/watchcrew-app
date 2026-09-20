import { supabase } from "./supabase";

/**
 * M10 Settings hub: the current user's own `profiles` row (just
 * `display_name` — the only column that table has beyond `id`/`created_at`,
 * per supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql).
 * Read-only lookup — there is still no profile-EDITING UI/RLS policy (that
 * migration's own comment flags this as a later milestone), so this is only
 * ever used to DISPLAY the value, never to write it.
 *
 * Follows the same "never throw, always resolve Supabase's raw
 * { data, error }" convention as the rest of src/lib/groups.ts.
 */
export async function getOwnProfile(userId: string) {
  return supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
}
