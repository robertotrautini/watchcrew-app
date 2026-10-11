-- Phase 2 apply script for Supabase DEV (project vketnadfeyovguikpaao). NOT applied automatically.
-- ADR 0014 / docs/plan-user-movie-ratings.md Phase 2: push trigger moves from public.ratings
-- to public.user_movie_ratings. Paste into the SQL editor and run once. Idempotent.
-- Prerequisite: Phase 0 (docs/dev-apply-phase0.sql) already applied.
--
-- Effects:
--   1. New function notify_first_user_movie_rating() + trigger on user_movie_ratings
--      (fires on the NULL/0 -> real rating transition only; corrections do not fire).
--      One event per group that contains the movie and in which the rater is a member.
--   2. Old trigger trg_ratings_notify_first_rating on public.ratings is dropped (the app no
--      longer writes public.ratings; old app builds writing there will no longer push).
--      Table public.ratings and function notify_first_rating() stay (Phase 4 drops them).
--
-- Dedupe note (ADR 0014 open point 4, "once per recipient"): the unchanged send-push Edge
-- Function resolves recipients per groupId, so a user subscribed to TWO shared groups that
-- both contain the movie would still get two pushes. The payload therefore already carries
-- 'dedupeKey' (user_id:movie_id); the unchanged send-push ignores extra fields. To finish
-- the dedupe, send-push needs the small change described at the end of this file. Until
-- then: at most one push per (recipient, shared group containing the movie).
--
-- Legacy import (Phase 3): run
--   alter table public.user_movie_ratings disable trigger trg_user_movie_ratings_notify_first_rating;
-- before the import and re-enable afterwards, otherwise the import fires pushes.

create or replace function public.notify_first_user_movie_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tmdb_id integer;
  v_was_rated boolean;
  v_is_rated boolean;
  g record;
begin
  v_is_rated := new.rating is not null and new.rating <> 0;
  v_was_rated := tg_op = 'UPDATE' and old.rating is not null and old.rating <> 0;
  if v_was_rated or not v_is_rated then
    return new;
  end if;

  select tmdb_id into v_tmdb_id from public.movies where id = new.movie_id;

  for g in
    select we.group_id, we.id as watchlist_entry_id
      from public.watchlist_entries we
      join public.watch_group_members m
        on m.group_id = we.group_id and m.user_id = new.user_id
     where we.movie_id = new.movie_id
  loop
    perform public.enqueue_push_notification(
      jsonb_build_object(
        'eventType', 'first_rating',
        'groupId', g.group_id,
        'watchlistEntryId', g.watchlist_entry_id,
        'tmdbId', v_tmdb_id,
        'actingUserId', new.user_id,
        'dedupeKey', new.user_id::text || ':' || new.movie_id::text
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_user_movie_ratings_notify_first_rating on public.user_movie_ratings;
create trigger trg_user_movie_ratings_notify_first_rating
after insert or update on public.user_movie_ratings
for each row
execute function public.notify_first_user_movie_rating();

-- Old trigger off (function and table stay until Phase 4).
drop trigger if exists trg_ratings_notify_first_rating on public.ratings;

-- ------------------------------------------------------------
-- Check (SELECT only): expect 1 row on user_movie_ratings, 0 rows on ratings.
-- ------------------------------------------------------------
select event_object_table, trigger_name
  from information_schema.triggers
 where trigger_name in ('trg_user_movie_ratings_notify_first_rating', 'trg_ratings_notify_first_rating');

-- ------------------------------------------------------------
-- Follow-up (code, NOT part of this script; send-push is deliberately not changed/deployed
-- here because Deno is not available to run its tests):
-- supabase/functions/send-push: accept the optional 'dedupeKey' (string). In the HTTP entry
-- point, hold events with the same dedupeKey for a short window (or: have the trigger send a
-- single event with 'groupIds' uuid[] instead) and in sendPushForEvent resolve
-- getSubscribedUserIds across ALL groupIds, de-duplicate user ids (Set) before
-- getTokensForUsers. Smallest variant: trigger sends one event with
-- 'groupIds' = array of all affected groups plus 'groupId' = first one (deep link), and
-- PushSenderDb.getSubscribedUserIds takes groupIds: string[] (.in("group_id", groupIds),
-- Set-dedupe). Then replace the loop above by one enqueue_push_notification call.
-- ------------------------------------------------------------
