-- M5 (Fast-Follow): `profiles` table + auto-provisioning trigger on
-- `auth.users`, closing a flagged gap from M5 part 2: `ratings.member_id`
-- (and `watch_group_members.user_id`) are bare `auth.users` uuids with no
-- human-readable display-name source anywhere in the schema.
--
-- Standard, well-known Supabase pattern: a `profiles` table keyed 1:1 on
-- `auth.users.id`, populated automatically by an AFTER INSERT trigger on
-- `auth.users` (SECURITY DEFINER, since `authenticated` cannot normally
-- write to `auth.users`-adjacent bootstrap logic and there is intentionally
-- no client-writable INSERT policy on `profiles` here -- see RLS section).
--
-- Placeholder-quality default: there is no profile-editing UI anywhere yet
-- (a later Settings/Profile milestone), so `display_name` is seeded from the
-- new user's email local-part (everything before "@"). This is explicitly a
-- placeholder default, not a real "chosen name" -- documented as such so a
-- later milestone knows to let users override it (see docs/interim-decisions.md).

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Auto-provisioning trigger
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger trg_auth_users_handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;

-- Display names aren't sensitive data, and per ADR 0003 group members need
-- to be able to see each other's names -- readable by any authenticated user
-- (not just fellow group members; there is no group-scoping concept that
-- would make sense for a name lookup table like this one).
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policy for the `authenticated` role: the trigger
-- above is SECURITY DEFINER and bypasses RLS entirely, so it needs none, and
-- there is intentionally no way for a user to edit their own `display_name`
-- yet (no profile-editing UI exists). A later Settings/Profile milestone can
-- add an UPDATE-own-row policy (`using (id = auth.uid()) with check (id =
-- auth.uid())`) plus UI when that feature is actually built -- out of scope
-- here, not silently pre-built.
