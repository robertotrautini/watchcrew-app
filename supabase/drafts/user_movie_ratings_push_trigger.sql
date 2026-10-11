-- ENTWURF (Phase 2, NICHT in supabase/migrations/, wird nicht angewendet).
-- ADR 0014: Push bei erster Bewertung, pro Empfaenger einmal dedupliziert.
-- Der Alt-Trigger trg_ratings_notify_first_rating auf public.ratings bleibt
-- bis Phase 2 unveraendert.
--
-- Problem: send-push loest Empfaenger ueber push_subscriptions(group_id) auf,
-- ein Event pro Gruppe wuerde Nutzer in mehreren gemeinsamen Gruppen mehrfach
-- benachrichtigen. Dedupe darum in send-push (Phase 2): Trigger sendet EIN
-- Event je betroffener Gruppe mit gleichem 'dedupeKey' (= user_id:movie_id),
-- send-push merged Empfaenger ueber alle Events desselben Keys. Alternative:
-- Trigger sendet ein Event mit 'groupIds' (Array). Entscheidung in Phase 2.
-- Backfill/Seed darf nicht feuern: Trigger erst NACH dem Backfill anlegen.

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
      join public.watch_group_members m on m.group_id = we.group_id and m.user_id = new.user_id
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

-- create trigger trg_user_movie_ratings_notify_first_rating
-- after insert or update on public.user_movie_ratings
-- for each row execute function public.notify_first_user_movie_rating();
