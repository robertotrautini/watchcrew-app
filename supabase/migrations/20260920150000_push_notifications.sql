-- M10 (part) — Push notification infrastructure.
--
-- Builds the BACKGROUND/CLOSED delivery path from ADR 0006's three-way push
-- behavior ("app foreground+on-screen = silent update, foreground+other-
-- screen = in-app toast, background/closed = real push") -- the two
-- foreground cases are the PARALLEL Realtime task's job
-- (src/hooks/useGroupRealtimeSync.ts, src/lib/realtimeSync.ts, already
-- landed) and are entirely untouched by this migration.
--
-- ============================================================================
-- DECISION: trigger -> Edge Function wiring approach (pg_net direct call,
-- NOT Supabase "Database Webhooks" dashboard config, NOT a notification_queue
-- + poller) -- flagged explicitly for user confirmation, see
-- docs/interim-decisions.md "M10 — Push-Infrastruktur: pg_net direkt statt
-- Database-Webhooks/Queue-Poller" for the full write-up. Short version:
--
--   - "Database Webhooks" (Supabase dashboard-configured triggers) are NOT
--     expressible in a git-committed SQL migration at all -- they live in
--     project config outside the `supabase/migrations` history, which would
--     leave this milestone's core wiring completely undocumented in the
--     repo. Rejected for that reason alone, independent of any other
--     tradeoff.
--   - A `notification_queue` table + a separate pg_cron poller was the
--     task's suggested fallback if pg_net "isn't a clean fit" -- but pg_net
--     IS a clean fit here: it is already vendored into every Supabase
--     Postgres instance (confirmed locally: `pg_net` 0.20.4 is listed in
--     `pg_available_extensions`, just not pre-enabled), and its `http_post`
--     calls are themselves already async/non-blocking (queued to a
--     background worker, same mechanism Supabase's own dashboard Database
--     Webhooks feature is built on internally) -- so calling it directly
--     from an `AFTER INSERT`/`AFTER UPDATE` trigger does not hold the
--     triggering transaction open on network I/O, and needs no extra queue
--     table or polling cadence to get that property. A queue+poller would
--     only trade one kind of latency (near-instant, pg_net's own worker) for
--     another (up to one poll interval) for no upside here, since instant
--     delivery is exactly what a "someone just rated/added a movie" push
--     should feel like (unlike the M10 part 3 release-reminder job below,
--     which genuinely IS schedule-driven and DOES use pg_cron, appropriately).
--   - The Edge Function URL + service-role key the trigger needs to call
--     `send-push` are deliberately NOT hardcoded into this migration's SQL
--     (that would commit a secret into git, contradicting ADR 0009's "no
--     secrets in the repo" rule even though ADR 0009 itself only names
--     Edge Function Secrets / GitHub Actions Secrets / EAS Secrets as the
--     approved stores, not Postgres Vault -- this is flagged in
--     docs/interim-decisions.md as a genuinely new secret-storage mechanism
--     ADR 0009 didn't anticipate, worth the user's explicit sign-off).
--     Instead, `enqueue_push_notification()` below reads them from Postgres
--     Vault (`supabase_vault`, already installed by default on every
--     Supabase project, confirmed locally) at call time via
--     `vault.decrypted_secrets`. Vault secret VALUES are never written by
--     any migration; an operator must run this ONCE per environment
--     (locally via `supabase db execute` / Studio SQL editor, or on the
--     hosted project via the SQL editor -- NEVER committed to git):
--
--       select vault.create_secret(
--         'https://<project-ref>.supabase.co/functions/v1/send-push',
--         'push_edge_function_url'
--       );
--       select vault.create_secret(
--         '<the project''s service_role key>',
--         'push_service_role_key'
--       );
--
--     Until both secrets exist, `enqueue_push_notification()` logs a
--     `warning` and returns without erroring -- so applying this migration
--     on a fresh environment (e.g. a brand-new local `supabase db reset`)
--     never breaks the `watchlist_entries`/`ratings` writes that already
--     work today, it just silently skips the push side until configured.
-- ============================================================================

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ============================================================================
-- push_tokens — one row per (user, device). A user can have multiple tokens
-- (multiple devices) per the task brief. No SELECT policy for `authenticated`
-- -- only service-role Edge Functions (RLS-bypassing) ever read across users
-- to send notifications; a user only ever needs to write/replace/delete
-- their OWN token rows, never read any token value back.
-- ============================================================================

create table public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, expo_push_token)
);

alter table public.push_tokens enable row level security;

create policy "push_tokens_insert_own_row_only"
  on public.push_tokens
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_tokens_update_own_row_only"
  on public.push_tokens
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_tokens_delete_own_row_only"
  on public.push_tokens
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- push_subscriptions — per-group opt-in (NOT global, per the task brief's
-- requirement 1). SELECT is allowed for a user's own rows (needed so the
-- Settings-hub UI can show current subscription state), unlike push_tokens.
--
-- Beyond the literal spec: INSERT additionally requires the caller to
-- actually be a member of the group being subscribed to
-- (`public.is_group_member`, the same helper every other group-scoped
-- table's RLS already uses) -- a cheap, reversible extra guard consistent
-- with ADR 0003 ("Watch-Group is the only shareable unit"); logged as an
-- addition beyond the literal task spec in docs/interim-decisions.md.
-- ============================================================================

create table public.push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.watch_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own_rows"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own_row_only"
  on public.push_subscriptions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_member(group_id)
  );

create policy "push_subscriptions_delete_own_row_only"
  on public.push_subscriptions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- release_reminder_log — pure internal dedup ledger for the M10 part 3
-- scheduled release-reminder job below (never read/written by any client;
-- RLS enabled with ZERO policies, same "default-deny for authenticated,
-- service-role/SECURITY DEFINER only" convention already used for
-- `movie_metadata_cache`'s write side in the M1 migration).
-- ============================================================================

create table public.release_reminder_log (
  watchlist_entry_id uuid not null references public.watchlist_entries(id) on delete cascade,
  reminder_type text not null check (
    reminder_type in ('14_days', '7_days', '1_day', 'day_of', 'newly_added')
  ),
  sent_at timestamptz not null default now(),
  primary key (watchlist_entry_id, reminder_type)
);

alter table public.release_reminder_log enable row level security;
-- Intentionally no policies at all -- see comment above.

-- ============================================================================
-- enqueue_push_notification — the single choke point every trigger/cron job
-- below calls through. Looks up the Edge Function URL + service-role key
-- from Vault (see the DECISION block at the top of this file) and fires an
-- async `net.http_post` to the `send-push` Edge Function. Never raises: a
-- missing Vault config or a network-level failure only logs a `warning`,
-- so a push-delivery problem can never break the underlying
-- watchlist/rating write that triggered it.
-- ============================================================================

create or replace function public.enqueue_push_notification(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_edge_function_url text;
  v_service_role_key text;
begin
  select decrypted_secret into v_edge_function_url
    from vault.decrypted_secrets
   where name = 'push_edge_function_url'
   limit 1;

  select decrypted_secret into v_service_role_key
    from vault.decrypted_secrets
   where name = 'push_service_role_key'
   limit 1;

  if v_edge_function_url is null or v_service_role_key is null then
    raise warning
      'enqueue_push_notification: Vault secrets "push_edge_function_url"/"push_service_role_key" are not configured yet -- skipping send-push call for payload %',
      p_payload;
    return;
  end if;

  perform net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := p_payload
  );
exception
  when others then
    raise warning 'enqueue_push_notification: net.http_post failed for payload % -- %', p_payload, sqlerrm;
end;
$$;

-- ============================================================================
-- Trigger 1/2: new watchlist_entries row -> notify all OTHER subscribed
-- group members (requirement 2, bullet 1).
-- ============================================================================

create or replace function public.notify_new_watchlist_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tmdb_id integer;
begin
  select tmdb_id into v_tmdb_id from public.movies where id = new.movie_id;

  perform public.enqueue_push_notification(
    jsonb_build_object(
      'eventType', 'new_entry',
      'groupId', new.group_id,
      'watchlistEntryId', new.id,
      'tmdbId', v_tmdb_id,
      'actingUserId', new.added_by
    )
  );

  return new;
end;
$$;

create trigger trg_watchlist_entries_notify_new_entry
after insert on public.watchlist_entries
for each row
execute function public.notify_new_watchlist_entry();

-- ============================================================================
-- Trigger 2/2: first-time rating -> notify all OTHER subscribed group
-- members (requirement 2, bullet 2). "First-time" means the `rating`
-- column transitions from NULL/0 to a real value -- explicitly NOT a
-- correction of an already-real rating.
--
-- Fires on BOTH INSERT and UPDATE of `ratings`, not UPDATE alone: a rating
-- row's very first real value is very often set via a single INSERT (no
-- prior row existed for that (watchlist_entry_id, member_id) pair at all --
-- e.g. "Direkt Bewerten" on a movie nobody in the group has touched yet),
-- which is a plain INSERT at the Postgres level, not an
-- `INSERT ... ON CONFLICT DO UPDATE` -- see src/lib/movieDetailMutations.ts's
-- `saveRating` doc comment, which already flags this exact fact ("a real
-- UPSERT ... so a future server-side NULL->value push trigger can correctly
-- observe a NULL->value ... transition"). Relying on `AFTER UPDATE` alone
-- would silently MISS that common case and only catch the rarer path where a
-- `ratings` row already exists with `rating IS NULL` (e.g. created earlier by
-- a like-toggle-without-rating) and is later upgraded to a real value via the
-- upsert's `ON CONFLICT DO UPDATE` path.
-- ============================================================================

create or replace function public.notify_first_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_tmdb_id integer;
  v_was_rated boolean;
  v_is_rated boolean;
begin
  v_is_rated := new.rating is not null and new.rating <> 0;

  if tg_op = 'UPDATE' then
    v_was_rated := old.rating is not null and old.rating <> 0;
  else
    -- Brand-new row (plain INSERT, no prior conflicting row): there is no
    -- "before" rating at all, so any real NEW.rating is a first-time rating.
    v_was_rated := false;
  end if;

  if v_was_rated or not v_is_rated then
    return new;
  end if;

  select we.group_id, m.tmdb_id
    into v_group_id, v_tmdb_id
    from public.watchlist_entries we
    join public.movies m on m.id = we.movie_id
   where we.id = new.watchlist_entry_id;

  perform public.enqueue_push_notification(
    jsonb_build_object(
      'eventType', 'first_rating',
      'groupId', v_group_id,
      'watchlistEntryId', new.watchlist_entry_id,
      'tmdbId', v_tmdb_id,
      'actingUserId', new.member_id
    )
  );

  return new;
end;
$$;

create trigger trg_ratings_notify_first_rating
after insert or update on public.ratings
for each row
execute function public.notify_first_rating();

-- ============================================================================
-- M10 part 3: scheduled release-date reminder job (requirement 2, bullet 3).
-- Reuses `enqueue_push_notification()` (and therefore the exact same
-- `send-push` Edge Function / sending logic as the two row-triggers above)
-- rather than duplicating any sending logic -- only the ELIGIBILITY query is
-- new here.
--
-- Fires for a `watchlist_entries` row when its movie's `release_date` is
-- exactly 14/7/1 days away, or today ("day_of"), OR the entry was added
-- within the last 14 days AND its release is still <14 days out
-- ("newly_added") -- exactly the task brief's two bullet points, as two
-- independent conditions (a movie can legitimately fire "newly_added" on the
-- day it's added AND, days later, one of the exact-countdown milestones too).
--
-- `release_reminder_log` dedupes so a given (watchlist_entry_id,
-- reminder_type) pair only ever fires once, ever -- the job is meant to run
-- once daily (see the `cron.schedule` call below); without this, "day_of"
-- would otherwise refire every run of the same day, and a movie sitting at a
-- fixed release date across multiple days wouldn't accidentally double-count
-- either. `actingUserId` is NULL here (nobody "acted" to cause a scheduled
-- reminder, so nobody is excluded from receiving it) -- see
-- supabase/functions/send-push's own handling of a null actingUserId.
-- ============================================================================

create or replace function public.run_release_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_reminder_type text;
begin
  for r in
    select we.id as watchlist_entry_id, we.group_id, we.added_at, m.tmdb_id, m.release_date
      from public.watchlist_entries we
      join public.movies m on m.id = we.movie_id
     where m.release_date is not null
  loop
    v_reminder_type := null;

    if r.release_date - current_date = 14 then
      v_reminder_type := '14_days';
    elsif r.release_date - current_date = 7 then
      v_reminder_type := '7_days';
    elsif r.release_date - current_date = 1 then
      v_reminder_type := '1_day';
    elsif r.release_date - current_date = 0 then
      v_reminder_type := 'day_of';
    end if;

    if v_reminder_type is not null then
      insert into public.release_reminder_log (watchlist_entry_id, reminder_type)
      values (r.watchlist_entry_id, v_reminder_type)
      on conflict (watchlist_entry_id, reminder_type) do nothing;

      if found then
        perform public.enqueue_push_notification(
          jsonb_build_object(
            'eventType', 'release_reminder',
            'groupId', r.group_id,
            'watchlistEntryId', r.watchlist_entry_id,
            'tmdbId', r.tmdb_id,
            'actingUserId', null,
            'reminderType', v_reminder_type
          )
        );
      end if;
    end if;

    -- Independent second condition -- see doc comment above.
    if r.release_date >= current_date
      and r.release_date - current_date < 14
      and r.added_at >= now() - interval '14 days'
    then
      insert into public.release_reminder_log (watchlist_entry_id, reminder_type)
      values (r.watchlist_entry_id, 'newly_added')
      on conflict (watchlist_entry_id, reminder_type) do nothing;

      if found then
        perform public.enqueue_push_notification(
          jsonb_build_object(
            'eventType', 'release_reminder',
            'groupId', r.group_id,
            'watchlistEntryId', r.watchlist_entry_id,
            'tmdbId', r.tmdb_id,
            'actingUserId', null,
            'reminderType', 'newly_added'
          )
        );
      end if;
    end if;
  end loop;
end;
$$;

-- Interim decision (docs/interim-decisions.md): runs once daily at 09:00 UTC
-- -- a cheap, reversible schedule choice (a single cron expression string),
-- not a business rule. `cron.schedule` is idempotent-by-name on re-running
-- this migration (it upserts by job name), so this is safe to apply more
-- than once.
select cron.schedule(
  'release-reminders-daily',
  '0 9 * * *',
  $$select public.run_release_reminders();$$
);
