
alter table profiles add column email_confirmed boolean not null default false;

-- Reprise de l'existant
update profiles p
set email_confirmed = (u.email_confirmed_at is not null)
from auth.users u
where u.id = p.id;

-- Maintien à jour lors de la confirmation
create or replace function public.sync_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set email_confirmed = (new.email_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.sync_email_confirmed();
;
