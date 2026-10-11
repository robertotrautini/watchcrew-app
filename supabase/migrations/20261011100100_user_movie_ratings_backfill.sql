-- ADR 0014 Phase 0: backfill user_movie_ratings from legacy public.ratings.
-- Idempotent (on conflict do nothing); no push notifications (no trigger on
-- the new table in Phase 0).
--
-- Conflict rule (one row per user+movie across all groups):
--   rating/rated_at: row with a rating first, then newest rated_at, then
--                    newest seen_at, then ratings.id (deterministic)
--   liked:           OR over all rows
--   seen_at:         EARLIEST non-null seen_at
-- Rows without any content (no rating, not liked, no seen_at) are skipped.

do $$
declare
  v_pairs bigint;
  v_conflicts bigint;
  v_rating_conflicts bigint;
  v_seen_conflicts bigint;
begin
  select count(*),
         count(*) filter (where n > 1),
         count(*) filter (where n_rating > 1),
         count(*) filter (where n_seen > 1)
    into v_pairs, v_conflicts, v_rating_conflicts, v_seen_conflicts
    from (
      select count(*) as n,
             count(distinct r.rating) as n_rating,
             count(distinct r.seen_at) as n_seen
        from public.ratings r
        join public.watchlist_entries we on we.id = r.watchlist_entry_id
       where r.rating is not null or r.liked or r.seen_at is not null
       group by r.member_id, we.movie_id
    ) t;
  raise notice 'user_movie_ratings backfill: % user/movie pairs, % with multiple source rows, % with differing rating, % with differing seen_at',
    v_pairs, v_conflicts, v_rating_conflicts, v_seen_conflicts;
end;
$$;

insert into public.user_movie_ratings (user_id, movie_id, rating, liked, seen_at, rated_at)
select ranked.member_id,
       ranked.movie_id,
       ranked.rating,
       ranked.any_liked,
       ranked.min_seen_at,
       ranked.rated_at
  from (
    select r.member_id,
           we.movie_id,
           r.rating,
           r.rated_at,
           bool_or(r.liked) over (partition by r.member_id, we.movie_id) as any_liked,
           min(r.seen_at) over (partition by r.member_id, we.movie_id) as min_seen_at,
           row_number() over (
             partition by r.member_id, we.movie_id
             order by (r.rating is not null) desc,
                      r.rated_at desc nulls last,
                      r.seen_at desc nulls last,
                      r.id
           ) as rn
      from public.ratings r
      join public.watchlist_entries we on we.id = r.watchlist_entry_id
     where r.rating is not null or r.liked or r.seen_at is not null
  ) ranked
 where ranked.rn = 1
on conflict (user_id, movie_id) do nothing;
