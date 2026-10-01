-- One-off backfill (DRAFT, NOT applied): existing accounts such as
-- robintrautmann@gmx.de render as "Mitglied <id>" because their profiles row
-- is missing or has an empty display_name. Seeds both from the e-mail
-- local-part (auth.users is readable inside a migration). Users can then
-- rename themselves in Settings. Idempotent.

insert into public.profiles (id, display_name)
select u.id, coalesce(nullif(split_part(u.email, '@', 1), ''), 'Mitglied')
from auth.users u
on conflict (id) do nothing;

update public.profiles p
   set display_name = coalesce(nullif(split_part(u.email, '@', 1), ''), 'Mitglied')
  from auth.users u
 where u.id = p.id
   and btrim(p.display_name) = '';
