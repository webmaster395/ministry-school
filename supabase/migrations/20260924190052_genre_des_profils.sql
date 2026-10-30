alter table public.profiles
  add column if not exists gender text check (gender in ('homme', 'femme') or gender is null);

comment on column public.profiles.gender is 'Genre de l''utilisateur : homme ou femme (Monsieur / Madame à l''inscription)';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  chosen_ministry uuid;
  chosen_gender text;
begin
  -- Le ministère est transmis par son slug depuis le formulaire d'inscription
  select id into chosen_ministry
  from ministries
  where slug = new.raw_user_meta_data ->> 'ministry_slug';

  chosen_gender := new.raw_user_meta_data ->> 'gender';
  if chosen_gender not in ('homme', 'femme') then
    chosen_gender := null;
  end if;

  insert into profiles (id, full_name, role, ministry_id, preferred_day, has_paid, gender)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    'student',
    chosen_ministry,
    nullif(new.raw_user_meta_data ->> 'preferred_day', ''),
    false,
    chosen_gender
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

-- Rattrapage : profils existants dont le genre est déjà dans les métadonnées d'inscription
update public.profiles p
set gender = u.raw_user_meta_data ->> 'gender'
from auth.users u
where p.id = u.id
  and p.gender is null
  and u.raw_user_meta_data ->> 'gender' in ('homme', 'femme');;
