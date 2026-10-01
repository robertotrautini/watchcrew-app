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

export interface GroupMemberProfile {
  display_name: string;
}

export interface GroupMemberRow extends WatchGroupMembershipRow {
  // Joined in a second query below (see the M5 fast-follow comment) rather
  // than a single PostgREST embed — `watch_group_members.user_id` and
  // `profiles.id` both reference `auth.users(id)` independently, with no
  // direct FK between `watch_group_members` and `profiles` for PostgREST to
  // embed through. `null` when the profile row is somehow missing (should
  // not normally happen given the `handle_new_user` trigger, but is handled
  // defensively) — callers fall back to the existing uuid-prefix placeholder
  // in that case (see `src/lib/diaryDisplay.ts`'s `memberDisplayLabel`).
  profiles: GroupMemberProfile | null;
}

// M5-part-2 addition (Watchlist screen's "x/y bewertet" progress badge needs
// a group's total current membership count, which nothing existing exposed
// — `getUserGroups` above is user-centric, filtered by user_id, not
// group-centric). Same never-throw tuple-passthrough convention as
// `getUserGroups` for the "no members / query failed" cases; on success it
// resolves a NEW plain object (not the raw Supabase result) since the result
// is the merge of two queries.
//
// M5 fast-follow: also joins each member's `profiles.display_name` (closes
// the flagged gap where a group member was only ever a bare `auth.users`
// uuid with no human-readable name anywhere) — see
// `supabase/migrations/20260920120000_profiles_table_and_display_name_trigger.sql`.
// M9 part 1: create/join now go through two SECURITY DEFINER Postgres RPCs
// (supabase/migrations/20260920130000_group_invite_and_rpcs.sql) rather than
// a direct client INSERT under RLS -- there is intentionally no INSERT
// policy for `authenticated` on either `watch_groups` or
// `watch_group_members` (see that migration + the M1 schema task's open
// questions). Both wrappers follow the same never-throw `{ data, error }`
// passthrough convention as `getUserGroups`/`getGroupMembers` above, except
// that on success the raw RPC scalar (the new/joined group's uuid) is
// reshaped into `{ groupId }` rather than returned bare, so callers get a
// self-describing field name instead of an anonymous string.

export interface WatchGroupIdResult {
  groupId: string;
}

export async function createWatchGroup(name: string, colorTheme: string) {
  const { data, error } = await supabase.rpc("create_watch_group", {
    p_name: name,
    p_color_theme: colorTheme,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: { groupId: data as string }, error: null };
}

// The Postgres error code the `join_watch_group_by_token` RPC raises
// specifically for "no group has this invite_token" / "invite_enabled is
// false" (see the migration's `WC003` errcode) -- deliberately a single
// shared code for both cases (see that migration's comment on why they're
// not distinguished further). Supabase's client surfaces a raised Postgres
// exception as `{ message, code, details, hint }` (confirmed against the
// real local-Postgres RPC response during this task's Docker verification),
// with `code` set to exactly the `errcode` the function raised with -- so
// callers can reliably branch on this constant instead of pattern-matching
// the (potentially locale-dependent) message text.
export const INVALID_INVITE_TOKEN_ERROR_CODE = "WC003";

export function isInvalidInviteTokenError(error: { code?: string } | null | undefined): boolean {
  return error?.code === INVALID_INVITE_TOKEN_ERROR_CODE;
}

export async function joinWatchGroupByToken(token: string) {
  const { data, error } = await supabase.rpc("join_watch_group_by_token", {
    p_token: token,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: { groupId: data as string }, error: null };
}

// M9 part 2 (Group-Settings screen): wrappers for the group-management write
// paths this screen needs (rename, invite-link toggle/regenerate, remove
// member) plus a group-centric details lookup (`watch_groups.name`/
// `color_theme`/`invite_token`/`invite_enabled`, not exposed anywhere in the
// client before this screen). Same never-throw `{ data, error }`
// passthrough convention as every other function in this file.

export interface WatchGroupRow {
  id: string;
  name: string;
  color_theme: string;
  invite_token: string;
  invite_enabled: boolean;
  created_at: string;
}

/** A single group's own row (name/theme/invite settings) -- RLS: member-only select, same `watch_groups_select_members` policy as everything else on this table. */
export async function getWatchGroupDetails(groupId: string) {
  return supabase.from("watch_groups").select("*").eq("id", groupId).single();
}

/**
 * Several groups' own rows at once, keyed by id -- needed for the
 * Group-Settings screen's group SWITCHER, which lists every group the user
 * belongs to by NAME. `useUserGroups()` only ever returns the user's own
 * `watch_group_members` rows (group_id/user_id/role/joined_at), never the
 * groups' own names, so a second batched lookup by id is needed (same
 * reasoning as `getGroupMembers`'s two-step `profiles` join above -- no
 * direct FK from a set of ids to embed through in a single PostgREST call
 * here either, since this is a plain `IN (...)` filter, not a join).
 * Short-circuits to an empty result for an empty id list rather than
 * issuing a `.in("id", [])` query (which Postgres/PostgREST could
 * technically handle, but is a wasted round-trip for a case this common --
 * e.g. before `useUserGroups()` has resolved).
 */
export async function getWatchGroupsByIds(groupIds: string[]) {
  if (groupIds.length === 0) {
    return { data: [], error: null };
  }
  return supabase.from("watch_groups").select("*").in("id", groupIds);
}

// `groupDisplayLabel` (the switcher's per-group display label + uuid-prefix
// fallback) intentionally lives in src/lib/diaryDisplay.ts, NOT here -- the
// exact same reasoning as why `memberDisplayLabel`/`genreDisplayLabel` live
// there rather than in this file: this module eagerly imports
// src/lib/supabase.ts (constructs a real Supabase/Realtime client at import
// time), which a screen test importing only a pure display-label helper
// from here would otherwise be forced to drag in and mock too.
// diaryDisplay.ts has no such import, so it's the safe, already-established
// home for presentation-only helpers like this one.

/** Plain client UPDATE, covered by the existing M1 `watch_groups_update_owner_only` whole-row RLS policy -- no new policy/RPC needed. */
export async function renameWatchGroup(groupId: string, newName: string) {
  return supabase.from("watch_groups").update({ name: newName }).eq("id", groupId);
}

/**
 * Owner changes the group's colour theme. Same plain client UPDATE as
 * renameWatchGroup (`watch_groups_update_owner_only` RLS policy + the
 * `authenticated` UPDATE grant). NOTE: unlike `create_watch_group` (which
 * validates against the 6 names), there is no DB-side check on this column,
 * so callers must only pass a `GroupThemeName`.
 */
export async function setGroupColorTheme(groupId: string, theme: string) {
  return supabase.from("watch_groups").update({ color_theme: theme }).eq("id", groupId);
}

/** "Einladungen aktiv"/"Einladungen deaktiviert" toggle -- same owner-only UPDATE policy as renameWatchGroup. */
export async function setInviteEnabled(groupId: string, enabled: boolean) {
  return supabase.from("watch_groups").update({ invite_enabled: enabled }).eq("id", groupId);
}

// "Neu generieren" goes through a SECURITY DEFINER RPC
// (supabase/migrations/20260920140000_regenerate_invite_token_rpc.sql)
// rather than a plain client UPDATE with a client-generated
// `crypto.randomUUID()` -- see that migration's comment for why (consistency
// with every other group-mutating write path's SECURITY DEFINER pattern,
// and sidestepping any doubt about `crypto.randomUUID()` availability on
// this app's actual RN/Hermes runtime). The RPC itself re-checks ownership
// server-side (raises `WC004` otherwise) as defense in depth, even though
// the existing owner-only RLS policy would already block a non-owner's
// plain UPDATE the same way.
export const NOT_GROUP_OWNER_ERROR_CODE = "WC004";

export interface RegenerateInviteTokenResult {
  inviteToken: string;
}

export async function regenerateInviteToken(groupId: string) {
  const { data, error } = await supabase.rpc("regenerate_invite_token", { p_group_id: groupId });

  if (error) {
    return { data: null, error };
  }

  return { data: { inviteToken: data as string }, error: null };
}

/**
 * Removes a `watch_group_members` row -- used for BOTH the owner's "kick
 * another member" action and any member's own "Gruppe verlassen" (leave),
 * since both reduce to the exact same DELETE, already covered by the
 * existing M1 `watch_group_members_delete_owner_or_self` RLS policy
 * (`is_group_owner(group_id) OR user_id = auth.uid()`). Callers pass their
 * own id to leave, or another member's id to kick (owner only -- enforced
 * by that same RLS policy, not re-checked client-side).
 */
export async function removeMember(groupId: string, userId: string) {
  return supabase.from("watch_group_members").delete().eq("group_id", groupId).eq("user_id", userId);
}

export async function getGroupMembers(groupId: string) {
  const membersResult = await supabase.from("watch_group_members").select("*").eq("group_id", groupId);
  if (membersResult.error || !membersResult.data || membersResult.data.length === 0) {
    return membersResult;
  }

  const memberRows = membersResult.data as WatchGroupMembershipRow[];
  const userIds = Array.from(new Set(memberRows.map((row) => row.user_id)));

  const profilesResult = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  if (profilesResult.error) {
    return profilesResult;
  }

  const profileById = new Map<string, GroupMemberProfile>(
    (profilesResult.data ?? []).map((p: { id: string; display_name: string }) => [
      p.id,
      { display_name: p.display_name },
    ]),
  );

  const data: GroupMemberRow[] = memberRows.map((row) => ({
    ...row,
    profiles: profileById.get(row.user_id) ?? null,
  }));

  return { data, error: null };
}
