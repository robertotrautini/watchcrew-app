-- M9 part 2 (Group-Settings screen): adds a SECURITY DEFINER RPC for
-- "Invite-Link neu generieren", rather than having the client compute a new
-- UUID itself (`crypto.randomUUID()`) and send a plain
-- `UPDATE watch_groups SET invite_token = ...`.
--
-- Both approaches would have worked -- the existing M9-part-1
-- `watch_groups_update_owner_only` RLS policy (20260919120000) already
-- covers a plain owner-only client UPDATE of `invite_token`/`invite_enabled`,
-- and this task's brief explicitly left the choice open (see
-- docs/interim-decisions.md "M9 Teil 2 — Invite-Link-Regenerierung"). This
-- migration picks the RPC route for consistency with the SECURITY DEFINER
-- pattern already established for every other group-mutating write path in
-- this schema (`create_watch_group`, `join_watch_group_by_token`,
-- `handle_owner_succession`) -- generating the new UUID server-side with
-- `gen_random_uuid()` also sidesteps any doubt about `crypto.randomUUID()`
-- availability across this app's actual RN/Hermes runtime, which was never
-- otherwise verified in this codebase.
--
-- "Regenerieren impliziert Re-Aktivieren" -- same rule already documented in
-- 20260920130000's comment block: a regenerate always sets
-- `invite_enabled = true` in the same update, even if invites had been
-- toggled off before.

create or replace function public.regenerate_invite_token(p_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_token uuid := gen_random_uuid();
begin
  if not public.is_group_owner(p_group_id) then
    raise exception 'regenerate_invite_token requires group ownership'
      using errcode = 'WC004';
  end if;

  update public.watch_groups
     set invite_token = v_new_token,
         invite_enabled = true
   where id = p_group_id;

  return v_new_token;
end;
$$;

grant execute on function public.regenerate_invite_token(uuid) to authenticated;
