-- Phase 0 apply script for Supabase DEV (project vketnadfeyovguikpaao).
-- Paste into SQL editor, run once. All four migrations idempotent, unchanged, in order.
-- No CONCURRENTLY, no non-transactional commands. Check section at end (SELECT only).

-- ============================================================
-- Migration: supabase/migrations/20261011100000_user_movie_ratings.sql
-- ============================================================
-- ADR 0014 Phase 0: ratings per user and movie (not per group entry).
-- Additive: legacy public.ratings stays untouched until Phase 4.
-- Idempotent: safe to re-run.
--
-- Semantics (confirmed): one row per (user_id, movie_id). Resetting/deleting
-- a rating = DELETE the row (movie counts as unseen/unrated in ALL groups).
-- Removing a movie from a group only deletes watchlist_entries; the rating
-- stays. No push trigger here (Phase 2, see supabase/drafts/).

create table if not exists public.user_movie_ratings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  movie_id   uuid not null references public.movies(id) on delete cascade,
  rating     numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  liked      boolean not null default false,
  seen_at    date,
  rated_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

-- Group read path: all ratings for given movies.
create index if not exists user_movie_ratings_movie_user_idx
  on public.user_movie_ratings (movie_id, user_id);

-- Support the visibility check (movie in group X, member of group X).
create index if not exists watchlist_entries_movie_group_idx
  on public.watchlist_entries (movie_id, group_id);
create index if not exists watch_group_members_user_group_idx
  on public.watch_group_members (user_id, group_id);

-- updated_at maintenance.
create or replace function public.set_user_movie_ratings_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_user_movie_ratings_updated_at on public.user_movie_ratings;
create trigger trg_user_movie_ratings_updated_at
before update on public.user_movie_ratings
for each row
execute function public.set_user_movie_ratings_updated_at();

-- Read helper: own row, or a user sharing a group in which the movie has an
-- entry. SECURITY DEFINER avoids RLS recursion on watch_group_members /
-- watchlist_entries (same pattern as is_group_member).
create or replace function public.can_read_user_movie_rating(p_user_id uuid, p_movie_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select p_user_id = (select auth.uid())
      or exists (
        select 1
          from public.watchlist_entries we
          join public.watch_group_members me
            on me.group_id = we.group_id and me.user_id = (select auth.uid())
          join public.watch_group_members them
            on them.group_id = we.group_id and them.user_id = p_user_id
         where we.movie_id = p_movie_id
      );
$$;

alter table public.user_movie_ratings enable row level security;

drop policy if exists "umr_select_own_or_shared_group" on public.user_movie_ratings;
create policy "umr_select_own_or_shared_group"
  on public.user_movie_ratings for select to authenticated
  using (public.can_read_user_movie_rating(user_id, movie_id));

drop policy if exists "umr_insert_own" on public.user_movie_ratings;
create policy "umr_insert_own"
  on public.user_movie_ratings for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "umr_update_own" on public.user_movie_ratings;
create policy "umr_update_own"
  on public.user_movie_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "umr_delete_own" on public.user_movie_ratings;
create policy "umr_delete_own"
  on public.user_movie_ratings for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.user_movie_ratings to authenticated;
grant select, insert, update, delete on public.user_movie_ratings to service_role;

-- Bulk read path for the group view: membership checked once. Non-members
-- (and unauthenticated callers) get an empty set, no membership leak.
create or replace function public.get_group_member_ratings(p_group_id uuid)
returns table (
  user_id  uuid,
  movie_id uuid,
  rating   numeric(2,1),
  liked    boolean,
  seen_at  date,
  rated_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select r.user_id, r.movie_id, r.rating, r.liked, r.seen_at, r.rated_at
    from public.watchlist_entries we
    join public.watch_group_members m on m.group_id = we.group_id
    join public.user_movie_ratings r on r.movie_id = we.movie_id and r.user_id = m.user_id
   where we.group_id = p_group_id
     and public.is_group_member(p_group_id);
$$;

revoke all on function public.get_group_member_ratings(uuid) from public, anon;
grant execute on function public.get_group_member_ratings(uuid) to authenticated;

-- ============================================================
-- Migration: supabase/migrations/20261011100100_user_movie_ratings_backfill.sql
-- ============================================================
-- ADR 0014 Phase 0: backfill user_movie_ratings from legacy public.ratings.
-- Idempotent (on conflict do nothing); no push notifications (no trigger on
-- the new table in Phase 0).
--
-- Conflict rule (one row per user+movie across all groups):
--   rating/rated_at: row with a rating first, then newest rated_at, then
--                    newest seen_at, then ratings.id (deterministic)
--   liked:           OR over all rows
--   seen_at:         EARLIEST non-null seen_at
-- Rows without any content (no rating, not liked, no seen_at) are skipped.

do $$
declare
  v_pairs bigint;
  v_conflicts bigint;
  v_rating_conflicts bigint;
  v_seen_conflicts bigint;
begin
  select count(*),
         count(*) filter (where n > 1),
         count(*) filter (where n_rating > 1),
         count(*) filter (where n_seen > 1)
    into v_pairs, v_conflicts, v_rating_conflicts, v_seen_conflicts
    from (
      select count(*) as n,
             count(distinct r.rating) as n_rating,
             count(distinct r.seen_at) as n_seen
        from public.ratings r
        join public.watchlist_entries we on we.id = r.watchlist_entry_id
       where r.rating is not null or r.liked or r.seen_at is not null
       group by r.member_id, we.movie_id
    ) t;
  raise notice 'user_movie_ratings backfill: % user/movie pairs, % with multiple source rows, % with differing rating, % with differing seen_at',
    v_pairs, v_conflicts, v_rating_conflicts, v_seen_conflicts;
end;
$$;

insert into public.user_movie_ratings (user_id, movie_id, rating, liked, seen_at, rated_at)
select ranked.member_id,
       ranked.movie_id,
       ranked.rating,
       ranked.any_liked,
       ranked.min_seen_at,
       ranked.rated_at
  from (
    select r.member_id,
           we.movie_id,
           r.rating,
           r.rated_at,
           bool_or(r.liked) over (partition by r.member_id, we.movie_id) as any_liked,
           min(r.seen_at) over (partition by r.member_id, we.movie_id) as min_seen_at,
           row_number() over (
             partition by r.member_id, we.movie_id
             order by (r.rating is not null) desc,
                      r.rated_at desc nulls last,
                      r.seen_at desc nulls last,
                      r.id
           ) as rn
      from public.ratings r
      join public.watchlist_entries we on we.id = r.watchlist_entry_id
     where r.rating is not null or r.liked or r.seen_at is not null
  ) ranked
 where ranked.rn = 1
on conflict (user_id, movie_id) do nothing;

-- ============================================================
-- Migration: supabase/migrations/20261011110000_account_deletion_fk_fixes.sql
-- ============================================================
-- Account deletion fix (ADR 0004 / ADR 0014 open point 6): FKs onto
-- auth.users without ON DELETE action blocked deleting a user.
--   watchlist_entries.added_by          -> ON DELETE SET NULL (now nullable)
--   watchlist_entries.paid_by_member_id -> ON DELETE SET NULL
--   ratings.member_id                   -> ON DELETE CASCADE
-- All other FKs onto auth.users (profiles, watch_group_members,
-- email_notification_log, push_tokens, push_subscriptions,
-- user_movie_ratings) already cascade.
-- Idempotent: drop-if-exists then add.

alter table public.watchlist_entries
  alter column added_by drop not null;

alter table public.watchlist_entries
  drop constraint if exists watchlist_entries_added_by_fkey;
alter table public.watchlist_entries
  add constraint watchlist_entries_added_by_fkey
  foreign key (added_by) references auth.users(id) on delete set null;

alter table public.watchlist_entries
  drop constraint if exists watchlist_entries_paid_by_member_id_fkey;
alter table public.watchlist_entries
  add constraint watchlist_entries_paid_by_member_id_fkey
  foreign key (paid_by_member_id) references auth.users(id) on delete set null;

alter table public.ratings
  drop constraint if exists ratings_member_id_fkey;
alter table public.ratings
  add constraint ratings_member_id_fkey
  foreign key (member_id) references auth.users(id) on delete cascade;

-- ============================================================
-- Migration: supabase/migrations/20261011120000_realtime_publication.sql
-- ============================================================
-- Make supabase_realtime membership reproducible (was dashboard-only).
-- Idempotent: adds a table only if not yet a member.
-- REPLICA IDENTITY FULL: the client filters watchlist_entries by group_id
-- (filter on a non-PK column) and needs old-row values on DELETE/UPDATE
-- events; with the default identity DELETE events carry only the PK.

do $$
declare
  t text;
begin
  foreach t in array array['watchlist_entries', 'ratings', 'user_movie_ratings'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

alter table public.watchlist_entries replica identity full;
alter table public.ratings replica identity full;
alter table public.user_movie_ratings replica identity full;

-- ============================================================
-- CHECKS (SELECT only). SQL editor shows only the last result,
-- so the checks are combined into one result set.
-- ============================================================
select '1 table exists' as check_name,
       coalesce(to_regclass('public.user_movie_ratings')::text, 'MISSING') as result
union all
select '2 rowsecurity',
       coalesce((select relrowsecurity::text from pg_class where oid = to_regclass('public.user_movie_ratings')), 'n/a')
union all
select '3 policy ' || policyname, cmd || ' roles=' || roles::text
  from pg_policies where schemaname = 'public' and tablename = 'user_movie_ratings'
union all
select '4 publication ' || pubname, schemaname || '.' || tablename
  from pg_publication_tables where pubname = 'supabase_realtime'
union all
select '5 fk ' || c.conrelid::regclass::text || '.' || a.attname || ' -> ' || c.conname,
       case c.confdeltype when 'a' then 'NO ACTION' when 'r' then 'RESTRICT' when 'c' then 'CASCADE'
                          when 'n' then 'SET NULL' when 'd' then 'SET DEFAULT' end
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
 where c.contype = 'f'
   and ((c.conrelid = 'public.watchlist_entries'::regclass and a.attname in ('added_by', 'paid_by_member_id'))
     or (c.conrelid = 'public.ratings'::regclass and a.attname = 'member_id'))
union all
select '6 replica identity ' || relname, case relreplident when 'f' then 'FULL' when 'd' then 'default' else relreplident::text end
  from pg_class where oid in ('public.watchlist_entries'::regclass, 'public.ratings'::regclass, 'public.user_movie_ratings'::regclass)
union all
select '7 rows user_movie_ratings', (select count(*) from public.user_movie_ratings)::text
order by 1;
