-- Restores base-table GRANTs that every table's existing RLS policies already
-- assume. No migration ever set these explicitly; the project's default
-- privileges for objects created by the `postgres` role only ever included
-- TRUNCATE/REFERENCES/TRIGGER for authenticated/service_role, never
-- SELECT/INSERT/UPDATE/DELETE -- confirmed via pg_default_acl on the remote
-- project. `anon` is deliberately untouched: no RLS policy anywhere targets
-- anon/public.

-- watch_groups / watch_group_members: no INSERT grant -- the only INSERT
-- paths are the SECURITY DEFINER RPCs (create_watch_group,
-- join_watch_group_by_token), which run as `postgres` and don't need it.
grant select, update, delete on public.watch_groups to authenticated;
grant select, update, delete on public.watch_group_members to authenticated;

-- Shared read-only catalog / cache tables.
grant select on public.movies to authenticated;
grant select on public.genres to authenticated;
grant select on public.movie_genres to authenticated;
grant select on public.movie_metadata_cache to authenticated;
grant select on public.streaming_availability_cache to authenticated;

-- Group-scoped read/write table with full CRUD RLS.
grant select, insert, update, delete on public.watchlist_entries to authenticated;

-- ratings: no DELETE grant -- no DELETE RLS policy exists yet.
grant select, insert, update on public.ratings to authenticated;

-- profiles: read-only for authenticated (write path is the SECURITY
-- DEFINER handle_new_user trigger only).
grant select on public.profiles to authenticated;

-- push_tokens: no SELECT grant -- intentionally write-only from the client.
grant insert, update, delete on public.push_tokens to authenticated;

-- push_subscriptions: no UPDATE grant -- no UPDATE RLS policy exists.
grant select, insert, delete on public.push_subscriptions to authenticated;

-- release_reminder_log / email_notification_log: intentionally NOT granted
-- to authenticated/anon/service_role -- zero RLS policies, touched only by
-- SECURITY DEFINER functions owned by postgres.

-- service_role: Edge Functions (tmdb-proxy, cleanup-inactive-accounts) call
-- these tables directly via PostgREST with the service_role key and hit the
-- identical missing-grant problem -- BYPASSRLS bypasses row-level security,
-- not base table GRANTs.
grant select, insert, update, delete on public.movies to service_role;
grant select, insert, update, delete on public.genres to service_role;
grant select, insert, update, delete on public.movie_genres to service_role;
grant select, insert, update, delete on public.movie_metadata_cache to service_role;
grant select, insert, update, delete on public.streaming_availability_cache to service_role;
grant select on public.profiles to service_role;
grant select on public.push_tokens to service_role;

-- Root-cause fix: repairs default privileges for FUTURE tables created by
-- the postgres role, so the next migration's create table doesn't silently
-- reproduce this bug. Does NOT retroactively change existing tables.
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
