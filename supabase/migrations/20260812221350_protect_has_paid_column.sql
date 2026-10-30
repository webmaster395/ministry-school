
create or replace function public.protect_has_paid()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.has_paid is distinct from old.has_paid
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    new.has_paid := old.has_paid;
  end if;
  return new;
end;
$$;

create trigger protect_has_paid_trigger
  before update on profiles
  for each row
  execute function public.protect_has_paid();
;
