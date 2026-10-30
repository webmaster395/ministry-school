
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_ministry uuid;
begin
  -- Le ministère est transmis par son slug depuis le formulaire d'inscription
  select id into chosen_ministry
  from ministries
  where slug = new.raw_user_meta_data ->> 'ministry_slug';

  insert into profiles (id, full_name, role, ministry_id, preferred_day, has_paid)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'student',
    chosen_ministry,
    nullif(new.raw_user_meta_data ->> 'preferred_day', ''),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
;
