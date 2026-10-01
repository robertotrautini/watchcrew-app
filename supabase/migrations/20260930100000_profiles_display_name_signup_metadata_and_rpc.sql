-- Member display names.
--
-- 1. `handle_new_user` now prefers the sign-up metadata key `display_name`
--    (supabase.auth.signUp({ options: { data: { display_name } } }) ->
--    auth.users.raw_user_meta_data), then falls back to the e-mail local-part
--    (previous behaviour), then to the literal 'Mitglied' so the NOT NULL
--    column can never fail the sign-up.
-- 2. `set_display_name(text)`: SECURITY DEFINER RPC letting a signed-in user
--    set their OWN display name. Upserts, so accounts that have no profiles
--    row yet (e.g. created before the trigger existed) get one. Chosen over a
--    column GRANT + UPDATE policy because `authenticated` has only SELECT on
--    profiles (20260930090000) and an UPDATE policy would not cover missing
--    rows; consistent with the repo's other write RPCs.
--
-- NOT applied to any remote by this file's author; a push is required.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Mitglied'
    )
  );
  return new;
end;
$$;

create or replace function public.set_display_name(p_display_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then
    raise exception 'set_display_name requires an authenticated user'
      using errcode = 'WC005';
  end if;

  if v_name = '' or char_length(v_name) > 50 then
    raise exception 'display name must be 1 to 50 characters'
      using errcode = 'WC006';
  end if;

  insert into public.profiles (id, display_name)
  values (auth.uid(), v_name)
  on conflict (id) do update set display_name = excluded.display_name;
end;
$$;

revoke execute on function public.set_display_name(text) from public;
grant execute on function public.set_display_name(text) to authenticated;
