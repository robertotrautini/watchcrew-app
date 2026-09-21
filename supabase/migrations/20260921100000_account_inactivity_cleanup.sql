-- M11 part 2, Job 1 — Account inactivity cleanup (ADR 0004, deferred since
-- M4). Verbatim spec: "If a user has not logged in for over 1 YEAR (Supabase
-- Auth already natively tracks `last_sign_in_at`), a scheduled job sends a
-- warning email ('your account will be deleted in 14 days'); if no login
-- occurs within that 14-day grace period, a cleanup job deletes the
-- account."
--
-- ============================================================================
-- ⚠️ EXPLICITLY OUT OF SCOPE: the actual email send. ADR 0004 itself flags
-- the transactional-email-provider choice (Supabase's own Auth email system
-- vs. a third party like Resend) as a genuinely open architecture question
-- ("noch nicht final festgelegt, bei Bedarf erneut vorlegen") that must be
-- explicitly confirmed before implementing this feature -- NOT a cheap/
-- reversible implementation detail (it involves external service selection,
-- API keys, and cost), so it is NOT silently decided here. Everything below
-- is built EXCEPT that one call: `send_inactivity_warning_email()` only
-- logs (via `raise notice` + a row in the new `email_notification_log`
-- ledger table), with a clear TODO marking the real send as unresolved. See
-- docs/interim-decisions.md's "M11 part 2 — Job 1" entry, flagged (not a
-- routine decision) for the user's explicit confirmation once the email
-- provider is chosen.
-- ============================================================================
--
-- Wiring for the second half (actual account deletion) reuses the exact
-- Vault-secret-based `pg_net` calling convention already established and
-- verified in supabase/migrations/20260920150000_push_notifications.sql's
-- `enqueue_push_notification()` -- see that migration's own header comment
-- for the full reasoning on why `pg_net` + Vault (not Dashboard Database
-- Webhooks, not a queue+poller) was chosen; this migration does not
-- re-litigate that, it only reuses the same pattern for a new, unrelated
-- Edge Function (`cleanup-inactive-accounts`) since a plain SQL function
-- cannot call `auth.admin.deleteUser` itself (no service-role/admin API
-- access from inside Postgres).

-- ============================================================================
-- profiles.inactivity_warning_sent_at — extends the existing M5-fast-follow
-- `profiles` table (one row per user already exists there) rather than
-- creating a new table, per this task's explicit instruction. NULL means
-- "no warning currently outstanding" -- either never warned, or warned and
-- then the user logged back in during the grace period (see
-- `run_inactivity_warnings()` below, which clears it in that case so a
-- later new inactivity period can warn again).
-- ============================================================================

alter table public.profiles
  add column inactivity_warning_sent_at timestamptz;

-- ============================================================================
-- email_notification_log — pure internal ledger recording that a
-- notification WOULD have been sent, standing in for the real send until
-- ADR 0004's open email-provider question is resolved. Same "RLS enabled,
-- zero policies" convention as `release_reminder_log`
-- (20260920150000_push_notifications.sql) -- never touched by any client,
-- only by SECURITY DEFINER functions.
-- ============================================================================

create table public.email_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_type text not null check (email_type in ('inactivity_warning')),
  created_at timestamptz not null default now()
);

alter table public.email_notification_log enable row level security;
-- Intentionally no policies at all -- see comment above.

-- ============================================================================
-- send_inactivity_warning_email — STUBBED per this task's explicit scope
-- (see the file header). Never raises: a logging failure must not be able
-- to break the warning job's own bookkeeping (`inactivity_warning_sent_at`).
-- ============================================================================

create or replace function public.send_inactivity_warning_email(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- TODO: wire to real email provider once ADR 0004's open email-provider
  -- question is resolved (Supabase Auth's own email system vs. a third
  -- party like Resend). Until then, this only logs that a warning email
  -- WOULD have been sent.
  raise notice 'send_inactivity_warning_email: STUB -- would send "your account will be deleted in 14 days" to user %', p_user_id;

  insert into public.email_notification_log (user_id, email_type)
  values (p_user_id, 'inactivity_warning');
exception
  when others then
    raise warning 'send_inactivity_warning_email: logging failed for user % -- %', p_user_id, sqlerrm;
end;
$$;

-- ============================================================================
-- run_inactivity_warnings — pg_cron job function, step 1 of 2.
--
-- Step A (grace-period recovery): a user who was warned and then logged
-- back in (their `last_sign_in_at` advanced past the moment they were
-- warned) has their flag cleared -- both so the 14-day deletion job below
-- correctly leaves them alone (it only re-derives eligibility from
-- `inactivity_warning_sent_at`/`last_sign_in_at`, so this isn't strictly
-- required for that job's own correctness, since it independently checks
-- `last_sign_in_at`), AND so that a FUTURE new inactivity period (a year
-- from whenever they log in again) can warn them again -- without this
-- clear step, `inactivity_warning_sent_at` would stay permanently non-null
-- after the first warning ever sent, and step B's "no warning sent yet"
-- condition would never fire for that user again.
--
-- Step B: any user whose `last_sign_in_at` is over a year old and who has
-- no outstanding warning yet gets warned now.
--
-- Users who have never signed in at all (`last_sign_in_at is null` -- e.g.
-- an unconfirmed sign-up) are excluded from step B: there is no login
-- baseline to measure "over a year of inactivity" against, and depending on
-- ADR 0004's confirmation-email flow, warning/deleting someone who never
-- even confirmed their email would be premature.
-- ============================================================================

create or replace function public.run_inactivity_warnings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Step A: grace-period recovery.
  update public.profiles p
     set inactivity_warning_sent_at = null
    from auth.users u
   where p.id = u.id
     and p.inactivity_warning_sent_at is not null
     and u.last_sign_in_at is not null
     and u.last_sign_in_at > p.inactivity_warning_sent_at;

  -- Step B: warn newly-inactive users.
  perform public.send_inactivity_warning_email(u.id)
    from auth.users u
    join public.profiles p on p.id = u.id
   where u.last_sign_in_at is not null
     and u.last_sign_in_at < now() - interval '1 year'
     and p.inactivity_warning_sent_at is null;

  update public.profiles p
     set inactivity_warning_sent_at = now()
    from auth.users u
   where p.id = u.id
     and u.last_sign_in_at is not null
     and u.last_sign_in_at < now() - interval '1 year'
     and p.inactivity_warning_sent_at is null;
end;
$$;

-- ============================================================================
-- invoke_inactivity_cleanup — pg_cron job function, step 2 of 2. Mirrors
-- `enqueue_push_notification()`'s exact Vault-read + `net.http_post`
-- structure (see that function in 20260920150000_push_notifications.sql),
-- but calls a DIFFERENT Edge Function (`cleanup-inactive-accounts`) on a
-- SCHEDULE rather than from a row-level trigger -- the eligibility query
-- itself (who is actually past their 14-day grace period) lives in that
-- Edge Function, not here, because it needs `auth.admin.deleteUser`
-- (service-role/admin API), which a plain SQL function cannot call.
--
-- New, separate Vault secret pair (`inactivity_cleanup_edge_function_url` /
-- `inactivity_cleanup_service_role_key`) rather than reusing the push
-- job's `push_edge_function_url`/`push_service_role_key` names -- same
-- literal secret VALUE (a project's service-role key is the same key
-- everywhere), but a distinct name per concern, consistent with how the
-- push migration itself named its pair after its own Edge Function. An
-- operator must set these once per environment (never committed to git):
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/cleanup-inactive-accounts',
--     'inactivity_cleanup_edge_function_url'
--   );
--   select vault.create_secret(
--     '<the project''s service_role key>',
--     'inactivity_cleanup_service_role_key'
--   );
--
-- Until both secrets exist, this only logs a `warning` and returns --
-- applying this migration on a fresh environment never errors, it just
-- silently skips the cleanup call until configured (same fresh-environment
-- safety property as `enqueue_push_notification()`).
-- ============================================================================

create or replace function public.invoke_inactivity_cleanup()
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
   where name = 'inactivity_cleanup_edge_function_url'
   limit 1;

  select decrypted_secret into v_service_role_key
    from vault.decrypted_secrets
   where name = 'inactivity_cleanup_service_role_key'
   limit 1;

  if v_edge_function_url is null or v_service_role_key is null then
    raise warning
      'invoke_inactivity_cleanup: Vault secrets "inactivity_cleanup_edge_function_url"/"inactivity_cleanup_service_role_key" are not configured yet -- skipping cleanup-inactive-accounts call';
    return;
  end if;

  perform net.http_post(
    url := v_edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := '{}'::jsonb
  );
exception
  when others then
    raise warning 'invoke_inactivity_cleanup: net.http_post failed -- %', sqlerrm;
end;
$$;

-- Interim decision (docs/interim-decisions.md): both jobs run once daily,
-- staggered 05:00/05:15 UTC (warnings first, then the deletion sweep) --
-- cheap, reversible schedule choices (two cron expression strings), not
-- business rules. `cron.schedule` is idempotent-by-name, safe to re-apply.
select cron.schedule(
  'inactivity-warnings-daily',
  '0 5 * * *',
  $$select public.run_inactivity_warnings();$$
);

select cron.schedule(
  'inactivity-cleanup-daily',
  '15 5 * * *',
  $$select public.invoke_inactivity_cleanup();$$
);
