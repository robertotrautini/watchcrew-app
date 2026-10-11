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
