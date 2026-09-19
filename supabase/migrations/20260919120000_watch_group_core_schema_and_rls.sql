-- M1 part 1: Postgres schema (Watch-Groups, Owner/Member roles, Movies/Genres/Watchlist/Ratings)
-- + RLS policies per table.
--
-- Schema and RLS rules implemented exactly as specified/approved for M1 part 1.
-- Open questions NOT decided autonomously (see report / commit message for detail):
--   1. INSERT policy for `watch_groups` (creating a brand-new group) and the very first
--      INSERT into `watch_group_members` (the initial owner row) are not covered by the
--      approved RLS rules ("readable/writable only by members of that group" cannot apply
--      to the row that doesn't exist yet / the membership that doesn't exist yet). No INSERT
--      policy is defined here for either table, so inserts from the `authenticated` role are
--      denied by default until this is explicitly decided (e.g. direct authenticated INSERT
--      vs. a service-role Edge Function that creates group + owner membership atomically).
--   2. INSERT policy for `watch_group_members` for the invite-link / join-by-group-id flow
--      (ADR 0003) is likewise not covered by the approved rules and is left undecided/denied
--      for the same reason.
--   3. DELETE on `ratings`: the approved rules only specify that INSERT/UPDATE are restricted
--      to the user's own rating row; DELETE is not mentioned. No DELETE policy is defined here,
--      so deleting a rating row via the `authenticated` role is denied by default pending
--      clarification of whether/how a user may retract their own rating.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.watch_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color_theme text not null,
  created_at timestamptz not null default now()
);

create table public.watch_group_members (
  group_id uuid not null references public.watch_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null unique,
  name text not null,
  release_date date,
  poster text,
  overview text,
  runtime integer,
  director text,
  director_id integer,
  vote_average numeric
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  tmdb_genre_id integer not null unique,
  name text not null
);

create table public.movie_genres (
  movie_id uuid not null references public.movies(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

create table public.watchlist_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.watch_groups(id) on delete cascade,
  movie_id uuid not null references public.movies(id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid not null references auth.users(id),
  paid_by_member_id uuid references auth.users(id),
  paid_at timestamptz,
  unique (group_id, movie_id)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  watchlist_entry_id uuid not null references public.watchlist_entries(id) on delete cascade,
  member_id uuid not null references auth.users(id),
  rating numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  liked boolean not null default false,
  seen_at date,
  rated_at timestamptz,
  unique (watchlist_entry_id, member_id)
);

create table public.movie_metadata_cache (
  tmdb_id integer primary key,
  data jsonb not null,
  last_fetched_at timestamptz not null default now()
);

create table public.streaming_availability_cache (
  tmdb_id integer not null,
  region text not null,
  data jsonb not null,
  last_fetched_at timestamptz not null default now(),
  primary key (tmdb_id, region)
);

-- ============================================================================
-- Owner succession trigger
-- (ADR 0003: ownership transfers automatically/deterministically to the
-- remaining member with the earliest joined_at; never left ownerless. The
-- 2-week soft-delete cleanup for an emptied group is an out-of-scope pg_cron
-- job for a later milestone -- this trigger only reassigns ownership and
-- otherwise leaves the (possibly now-empty) group row untouched.)
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
    end if;
    -- else: deleted row was the last member; group row is intentionally left
    -- in place (empty), per M1 scope -- no hard-delete here.
  end if;

  return old;
end;
$$;

create trigger trg_watch_group_members_owner_succession
after delete on public.watch_group_members
for each row
execute function public.handle_owner_succession();

-- ============================================================================
-- RLS helper functions
--
-- `watch_group_members` policies need to check the caller's own membership/
-- role against the same table they're protecting. A policy that queries its
-- own table directly in a subquery triggers Postgres's
-- "infinite recursion detected in policy for relation" error, so the
-- standard (Supabase-documented) fix is a SECURITY DEFINER helper function
-- that performs the membership lookup with RLS bypassed, and is then reused
-- by every other table's group-scoped policies for consistency.
-- ============================================================================

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.watch_group_members m
     where m.group_id = p_group_id
       and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.watch_group_members m
     where m.group_id = p_group_id
       and m.user_id = auth.uid()
       and m.role = 'owner'
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.watch_groups enable row level security;
alter table public.watch_group_members enable row level security;
alter table public.movies enable row level security;
alter table public.genres enable row level security;
alter table public.movie_genres enable row level security;
alter table public.watchlist_entries enable row level security;
alter table public.ratings enable row level security;
alter table public.movie_metadata_cache enable row level security;
alter table public.streaming_availability_cache enable row level security;

-- --- watch_groups ---
-- INSERT intentionally not covered here; see open question 1 above.

create policy "watch_groups_select_members"
  on public.watch_groups
  for select
  to authenticated
  using (public.is_group_member(id));

create policy "watch_groups_update_owner_only"
  on public.watch_groups
  for update
  to authenticated
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

create policy "watch_groups_delete_owner_only"
  on public.watch_groups
  for delete
  to authenticated
  using (public.is_group_owner(id));

-- --- watch_group_members ---
-- INSERT intentionally not covered here; see open questions 1/2 above.

create policy "watch_group_members_select_same_group"
  on public.watch_group_members
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "watch_group_members_update_owner_only"
  on public.watch_group_members
  for update
  to authenticated
  using (public.is_group_owner(group_id))
  with check (public.is_group_owner(group_id));

create policy "watch_group_members_delete_owner_or_self"
  on public.watch_group_members
  for delete
  to authenticated
  using (
    public.is_group_owner(group_id)
    or user_id = auth.uid()
  );

-- --- movies / genres / movie_genres: global shared catalog, read-only for app users ---

create policy "movies_select_authenticated"
  on public.movies
  for select
  to authenticated
  using (true);

create policy "genres_select_authenticated"
  on public.genres
  for select
  to authenticated
  using (true);

create policy "movie_genres_select_authenticated"
  on public.movie_genres
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for `authenticated` on movies/genres/movie_genres:
-- writes only happen via the TMDB/Trakt Edge Function using the service_role key,
-- which bypasses RLS by default in Supabase.

-- --- watchlist_entries: group-scoped ---

create policy "watchlist_entries_select_group_members"
  on public.watchlist_entries
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "watchlist_entries_insert_group_members"
  on public.watchlist_entries
  for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy "watchlist_entries_update_group_members"
  on public.watchlist_entries
  for update
  to authenticated
  using (public.is_group_member(group_id))
  with check (public.is_group_member(group_id));

create policy "watchlist_entries_delete_group_members"
  on public.watchlist_entries
  for delete
  to authenticated
  using (public.is_group_member(group_id));

-- --- ratings: group-scoped for reads, strictly own-row for writes ---
-- DELETE intentionally not covered here; see open question 3 above.

create policy "ratings_select_group_members"
  on public.ratings
  for select
  to authenticated
  using (
    public.is_group_member(
      (select we.group_id from public.watchlist_entries we where we.id = watchlist_entry_id)
    )
  );

create policy "ratings_insert_own_row_only"
  on public.ratings
  for insert
  to authenticated
  with check (
    member_id = auth.uid()
    and public.is_group_member(
      (select we.group_id from public.watchlist_entries we where we.id = watchlist_entry_id)
    )
  );

create policy "ratings_update_own_row_only"
  on public.ratings
  for update
  to authenticated
  using (
    member_id = auth.uid()
    and public.is_group_member(
      (select we.group_id from public.watchlist_entries we where we.id = watchlist_entry_id)
    )
  )
  with check (
    member_id = auth.uid()
    and public.is_group_member(
      (select we.group_id from public.watchlist_entries we where we.id = watchlist_entry_id)
    )
  );

-- --- movie_metadata_cache / streaming_availability_cache: read-only for app users ---

create policy "movie_metadata_cache_select_authenticated"
  on public.movie_metadata_cache
  for select
  to authenticated
  using (true);

create policy "streaming_availability_cache_select_authenticated"
  on public.streaming_availability_cache
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for `authenticated` on either cache table:
-- writes only happen via Edge Functions using the service_role key.
