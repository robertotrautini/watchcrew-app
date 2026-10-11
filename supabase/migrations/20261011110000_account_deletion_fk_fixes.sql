-- Account deletion fix (ADR 0004 / ADR 0014 open point 6): FKs onto
-- auth.users without ON DELETE action blocked deleting a user.
--   watchlist_entries.added_by          -> ON DELETE SET NULL (now nullable)
--   watchlist_entries.paid_by_member_id -> ON DELETE SET NULL
--   ratings.member_id                   -> ON DELETE CASCADE
-- All other FKs onto auth.users (profiles, watch_group_members,
-- email_notification_log, push_tokens, push_subscriptions,
-- user_movie_ratings) already cascade.
-- Idempotent: drop-if-exists then add.

alter table public.watchlist_entries
  alter column added_by drop not null;

alter table public.watchlist_entries
  drop constraint if exists watchlist_entries_added_by_fkey;
alter table public.watchlist_entries
  add constraint watchlist_entries_added_by_fkey
  foreign key (added_by) references auth.users(id) on delete set null;

alter table public.watchlist_entries
  drop constraint if exists watchlist_entries_paid_by_member_id_fkey;
alter table public.watchlist_entries
  add constraint watchlist_entries_paid_by_member_id_fkey
  foreign key (paid_by_member_id) references auth.users(id) on delete set null;

alter table public.ratings
  drop constraint if exists ratings_member_id_fkey;
alter table public.ratings
  add constraint ratings_member_id_fkey
  foreign key (member_id) references auth.users(id) on delete cascade;
