-- M11 part 2, Job 2 — Empty-group hard-delete (ADR 0003, deferred since
-- M1). Verbatim spec: when a group's last member leaves, the group is soft-
-- retained for 2 weeks (rejoinable via the group's invite token, per ADR
-- 0003's "wieder beitretbar" language -- M9 part 1's Q&A already
-- reinterpreted "same UUID as the invite link" as the invite-token UUID,
-- not the immutable primary key -- see that migration's header comment),
-- then a scheduled job permanently hard-deletes it.
--
-- FK cascade check (per this task's explicit instruction, not assumed):
-- 20260919120000_watch_group_core_schema_and_rls.sql defines
-- `watchlist_entries.group_id references public.watch_groups(id) on delete
-- cascade` and `ratings.watchlist_entry_id references
-- public.watchlist_entries(id) on delete cascade` -- confirmed, a hard
-- `delete from watch_groups` cascades through both tables already, no new
-- cascade needed. `push_subscriptions.group_id` (20260920150000) also
-- cascades. `watch_group_members` itself already cascades on `group_id` too
-- (it would already be empty for these rows by definition of "empty
-- group", but this makes the delete valid regardless).

-- ============================================================================
-- watch_groups.emptied_at — when this group last became empty (zero
-- members). NULL means "currently has at least one member" (or has never
-- been empty). Set by the extended `handle_owner_succession()` trigger
-- below when the last member leaves; cleared by `join_watch_group_by_token`
-- when anyone rejoins during the 2-week window (ADR 0003's "wieder
-- beitretbar").
-- ============================================================================

alter table public.watch_groups
  add column emptied_at timestamptz;

-- ============================================================================
-- Extend handle_owner_succession (originally defined in
-- 20260919120000_watch_group_core_schema_and_rls.sql) -- `create or replace
-- function` keeps the same signature/trigger binding, only the body
-- changes. Adds exactly one new branch: when a departing owner has NO
-- successor (the group is now empty -- the pre-existing `else` comment in
-- the M1 version already said "deleted row was the last member; group row
-- is intentionally left in place (empty)" -- this is that exact case),
-- stamp `emptied_at`. The non-empty branches (successor found, or a
-- non-owner leaving a still-populated group) are untouched.
-- ============================================================================

create or replace function public.handle_owner_succession()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_owner_user_id uuid;
begin
  if old.role = 'owner' then
    -- joined_at asc picks the most senior remaining member; user_id asc is a
    -- secondary tiebreaker only, to keep the choice fully deterministic in
    -- the (practically improbable) case of an exact joined_at tie.
    select user_id
      into v_new_owner_user_id
      from public.watch_group_members
     where group_id = old.group_id
     order by joined_at asc, user_id asc
     limit 1;

    if v_new_owner_user_id is not null then
      update public.watch_group_members
         set role = 'owner'
       where group_id = old.group_id
         and user_id = v_new_owner_user_id;
    else
      -- Deleted row was the last member; group row is intentionally left in
      -- place (empty) -- M11 part 2 addition: stamp when it became empty,
      -- so the scheduled cleanup job (below) can hard-delete it 2 weeks
      -- from now unless someone rejoins first.
      update public.watch_groups
         set emptied_at = now()
       where id = old.group_id;
    end if;
  end if;

  return old;
end;
$$;

-- ============================================================================
-- Extend join_watch_group_by_token (originally defined in
-- 20260920130000_group_invite_and_rpcs.sql) -- same signature/grant, only
-- the body changes. Adds one unconditional statement: clear `emptied_at`
-- for the joined group. Unconditional (not "only if it was set") is
-- deliberately simplest -- an `update ... set emptied_at = null` is a no-op
-- write when the column is already null (the common case: joining a group
-- that was never empty), and correctness doesn't depend on knowing which
-- case applies.
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

  -- M11 part 2 addition: rejoining an emptied group (ADR 0003's 2-week
  -- rejoin window) cancels its pending hard-delete.
  update public.watch_groups
     set emptied_at = null
   where id = v_group_id
     and emptied_at is not null;

  return v_group_id;
end;
$$;

grant execute on function public.join_watch_group_by_token(uuid) to authenticated;

-- ============================================================================
-- cleanup_empty_groups — pg_cron job function. Finds groups that are BOTH
-- (a) still actually empty (zero rows in watch_group_members -- defensive
-- double-check, not solely trusting `emptied_at`, per this task's explicit
-- instruction) and (b) became empty over 2 weeks ago, and hard-deletes them.
-- No Edge Function needed here (unlike Job 1) -- a plain `delete` is
-- ordinary SQL, no service-role/admin API required.
-- ============================================================================

create or replace function public.cleanup_empty_groups()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.watch_groups g
   where g.emptied_at is not null
     and g.emptied_at < now() - interval '14 days'
     and not exists (
       select 1 from public.watch_group_members m where m.group_id = g.id
     );
end;
$$;

-- Interim decision (docs/interim-decisions.md): runs once daily at 05:30
-- UTC (after the two Job 1 crons above) -- a cheap, reversible schedule
-- choice, not a business rule.
select cron.schedule(
  'cleanup-empty-groups-daily',
  '30 5 * * *',
  $$select public.cleanup_empty_groups();$$
);
