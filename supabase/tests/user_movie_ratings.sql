-- Manueller DB-Test fuer ADR 0014 Phase 0. NUR gegen DEV ausfuehren, alles
-- laeuft in einer Transaktion und endet mit ROLLBACK (keine Spuren).
--   npx supabase db query --linked -f supabase/tests/user_movie_ratings.sql
-- (oder psql gegen die DEV-Connection). Jeder Check wirft bei Fehler eine
-- Exception; am Ende steht NOTICE 'ALL OK'.
begin;

-- Fixtures (als postgres/Superuser): 3 Nutzer, 2 Gruppen, 2 Filme.
-- A+B in G1, C in G2. Film M1 liegt in G1, Film M2 in keiner Gruppe.
insert into auth.users (id, instance_id, aud, role, email)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'umr-a@test.invalid'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'umr-b@test.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'umr-c@test.invalid');

insert into public.watch_groups (id, name, color_theme) values
  ('00000000-0000-0000-0000-0000000000e1', 'umr-g1', 'gold'),
  ('00000000-0000-0000-0000-0000000000e2', 'umr-g2', 'gold');
insert into public.watch_group_members (group_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'member'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000c1', 'owner');

insert into public.movies (id, tmdb_id, name) values
  ('00000000-0000-0000-0000-0000000000f1', 999000001, 'umr-m1'),
  ('00000000-0000-0000-0000-0000000000f2', 999000002, 'umr-m2');
insert into public.watchlist_entries (id, group_id, movie_id, added_by) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1');

-- Strukturchecks.
do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'public.user_movie_ratings'::regclass), 'RLS not enabled';
  assert exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'user_movie_ratings'), 'not in publication';
  assert (select count(*) from pg_policies where tablename = 'user_movie_ratings') = 4, 'expected 4 policies';
end $$;

-- ===== als Nutzer A =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- eigene Zeile ohne Gruppen-Eintrag (M2) schreiben: ok
insert into public.user_movie_ratings (user_id, movie_id, rating, liked, seen_at, rated_at)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f2', 4.0, true, current_date, now());
-- Zeile fuer M1 (in G1)
insert into public.user_movie_ratings (user_id, movie_id, rating, seen_at, rated_at)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 3.5, current_date, now());

-- fremde Zeile schreiben: Fehler
do $$
begin
  begin
    insert into public.user_movie_ratings (user_id, movie_id, rating)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000f1', 1.0);
    raise exception 'FAIL: foreign insert allowed';
  exception when insert_privilege_violation or others then
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end $$;

-- ===== als Nutzer B (teilt G1 mit A) =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
do $$
begin
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1' and movie_id = '00000000-0000-0000-0000-0000000000f1') = 1, 'B must see A rating for M1 (shared group entry)';
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1' and movie_id = '00000000-0000-0000-0000-0000000000f2') = 0, 'B must NOT see A rating for M2 (no entry)';
  assert (select count(*) from public.get_group_member_ratings('00000000-0000-0000-0000-0000000000e1')) = 1, 'RPC must return A rating for M1 only';
  -- fremdes Update/Delete trifft 0 Zeilen
  update public.user_movie_ratings set rating = 1 where user_id = '00000000-0000-0000-0000-0000000000a1';
  assert not found, 'B must not update A row';
  delete from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1';
  assert not found, 'B must not delete A row';
end $$;

-- ===== als Nutzer C (andere Gruppe) =====
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
begin
  assert (select count(*) from public.user_movie_ratings) = 0, 'C must see nothing';
  assert (select count(*) from public.get_group_member_ratings('00000000-0000-0000-0000-0000000000e1')) = 0, 'RPC must be empty for non-member';
end $$;

-- ===== Eintrag loeschen: Zeile bleibt, aber fuer B unsichtbar =====
reset role;
delete from public.watchlist_entries where id = '00000000-0000-0000-0000-0000000000d1';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';
do $$
begin
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1') = 0, 'B must not see A rating after entry removal';
end $$;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';
do $$
begin
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1') = 2, 'A keeps both own rows';
  -- Zuruecksetzen = eigene Zeile loeschen
  delete from public.user_movie_ratings where movie_id = '00000000-0000-0000-0000-0000000000f2';
  assert found, 'A must delete own row';
end $$;

-- ===== Beitritt macht Zeile sichtbar =====
reset role;
insert into public.watchlist_entries (group_id, movie_id, added_by) values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1');
insert into public.watch_group_members (group_id, user_id, role) values ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'member');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
do $$
begin
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1') = 1, 'C sees A rating right after A joins G2';
end $$;

-- ===== Konto-Loeschung: FKs =====
reset role;
delete from auth.users where id = '00000000-0000-0000-0000-0000000000a1';
do $$
begin
  assert (select count(*) from public.user_movie_ratings where user_id = '00000000-0000-0000-0000-0000000000a1') = 0, 'ratings cascade on account delete';
  assert (select added_by from public.watchlist_entries where group_id = '00000000-0000-0000-0000-0000000000e2') = '00000000-0000-0000-0000-0000000000c1', 'unrelated added_by untouched';
end $$;

do $$ begin raise notice 'ALL OK'; end $$;
rollback;
