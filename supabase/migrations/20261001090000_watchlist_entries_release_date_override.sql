-- Per-group release date override for a watchlist entry.
--
-- Users may edit ONLY the release date of a watchlist entry (the title stays
-- fixed, it comes from TMDB). The date is stored PER GROUP on the entry, so
-- another group's entry for the same movie and the shared `movies` row (TMDB
-- data, written only by the service-role `upsert_movie` action) stay
-- untouched. NULL = no override, use `movies.release_date`.
--
-- No RLS/grant change needed: `watchlist_entries_update_group_members`
-- (migration 20260919120000) already lets any group member UPDATE entries of
-- their group, and 20260930090000 grants UPDATE to `authenticated`.

alter table public.watchlist_entries
  add column release_date_override date;

-- Release reminders must follow the effective date: the entry's override if
-- set, else the movie's TMDB date. Body identical to the version in
-- 20260920150000_push_notifications.sql except for the COALESCE below.
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
    select we.id as watchlist_entry_id, we.group_id, we.added_at, m.tmdb_id,
           coalesce(we.release_date_override, m.release_date) as release_date
      from public.watchlist_entries we
      join public.movies m on m.id = we.movie_id
     where coalesce(we.release_date_override, m.release_date) is not null
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
