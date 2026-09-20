-- M9 part 1: resolves the M1-flagged "no INSERT policy for watch_groups /
-- watch_group_members" gap (see 20260919120000's open questions 1/2), by
-- adding two SECURITY DEFINER RPC functions instead of crafting
-- interdependent RLS INSERT policies across both tables. No new INSERT
-- policy is added to either table -- both write paths below run as the
-- function owner (bypassing RLS), which is the same pattern already used by
-- the M1 owner-succession trigger and the M5-fast-follow
-- `handle_new_user()` trigger.
--
-- Also resolves a real ADR 0003 ambiguity: ADR 0003 says the invite link and
-- the manual "Group-ID" join both use "derselben nicht erratbaren UUID wie
-- der Link" (the same non-guessable UUID as the link) -- literally read,
-- that UUID would be `watch_groups.id`, the primary key. But the same ADR
-- also says the owner can "Invite-Link regenerieren" (regenerate the invite
-- link), which cannot apply to an immutable primary key that
-- `watchlist_entries.group_id` etc. reference by foreign key. This migration
-- reinterprets ADR 0003's "same UUID" language as referring to the invite
-- token's UUID *format/shape* (non-guessable, same type as the primary key),
-- not literally the primary key column itself -- see
-- docs/interim-decisions.md's "M9 part 1" entry for the full reasoning. This
-- is a schema-level interpretation, not a routine cheap detail, and is
-- flagged there for explicit user confirmation.

-- ============================================================================
-- Invite-link schema additions
-- ============================================================================

alter table public.watch_groups
  add column invite_token uuid not null default gen_random_uuid() unique;

alter table public.watch_groups
  add column invite_enabled boolean not null default true;

-- "Regenerate" (new token) / "revoke" (disable) / "re-enable" all reduce to
-- a plain `UPDATE watch_groups SET invite_token = ..., invite_enabled = ...`
-- from the client -- the existing M1 `watch_groups_update_owner_only` RLS
-- policy already covers these two columns (it is a whole-row owner-only
-- UPDATE policy, not column-scoped), so no new RLS policy or RPC is needed
-- for that part of the flow.

-- ============================================================================
-- create_watch_group: atomically creates a Watch-Group + its creator's
-- owner membership row. SECURITY DEFINER so it can INSERT into both tables
-- despite there being no INSERT policy for `authenticated` on either.
-- ============================================================================

create or replace function public.create_watch_group(p_name text, p_color_theme text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'create_watch_group requires an authenticated caller'
      using errcode = 'WC001';
  end if;

  -- Known theme names per src/lib/groupTheme.ts's `GroupThemeName` /
  -- `KNOWN_THEME_NAMES` -- kept as a literal list here (not a Postgres enum)
  -- so it stays a single, easily-greppable source of truth alongside that
  -- TS file rather than introducing a second schema-level enum type to keep
  -- in sync.
  if p_color_theme not in ('gold', 'red', 'blue', 'green', 'purple', 'orange') then
    raise exception 'invalid color theme: %', p_color_theme
      using errcode = 'WC002';
  end if;

  insert into public.watch_groups (name, color_theme)
  values (p_name, p_color_theme)
  returning id into v_group_id;

  insert into public.watch_group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'owner');

  return v_group_id;
end;
$$;

grant execute on function public.create_watch_group(text, text) to authenticated;

-- ============================================================================
-- join_watch_group_by_token: looks up a group by its invite_token, verifies
-- invites are enabled, and inserts a 'member' row for the caller -- unless
-- the caller is already a member, in which case it's a no-op (idempotent).
-- SECURITY DEFINER for the same reason as create_watch_group above.
-- ============================================================================

create or replace function public.join_watch_group_by_token(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_invite_enabled boolean;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'join_watch_group_by_token requires an authenticated caller'
      using errcode = 'WC001';
  end if;

  select id, invite_enabled
    into v_group_id, v_invite_enabled
    from public.watch_groups
   where invite_token = p_token;

  -- Deliberately a single combined check/error for "no such token" and
  -- "token exists but invites are disabled" -- both are the same
  -- client-facing case ("this invite code doesn't currently work"), and
  -- distinguishing them would leak whether a given token/group used to
  -- exist. Distinguishable via errcode 'WC003' from the generic-failure
  -- case (any other Postgres/network error), which is what the client
  -- (src/lib/groups.ts's `joinWatchGroupByToken`) branches on.
  if v_group_id is null or not coalesce(v_invite_enabled, false) then
    raise exception 'invalid or disabled invite token'
      using errcode = 'WC003';
  end if;

  -- Idempotent: (group_id, user_id) is the table's primary key, so a caller
  -- who is already a member of this group simply matches zero rows here
  -- instead of erroring or duplicating.
  insert into public.watch_group_members (group_id, user_id, role)
  values (v_group_id, v_user_id, 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

grant execute on function public.join_watch_group_by_token(uuid) to authenticated;
