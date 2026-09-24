-- Ajout du genre (homme / femme) sur les profils et synchronisation à l'inscription
-- À exécuter dans Supabase > SQL Editor

alter table public.profiles
  add column if not exists gender text check (gender in ('homme', 'femme') or gender is null);

comment on column public.profiles.gender is 'Genre de l''utilisateur : homme ou femme';

-- Mise à jour ou création du trigger d'inscription pour copier le genre depuis auth.users (raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  default_ministry_id uuid;
  raw_gender text;
begin
  if new.raw_user_meta_data->>'ministry_slug' is not null and new.raw_user_meta_data->>'ministry_slug' <> '' then
    select id into default_ministry_id
    from public.ministries
    where slug = new.raw_user_meta_data->>'ministry_slug'
    limit 1;
  end if;

  raw_gender := new.raw_user_meta_data->>'gender';
  if raw_gender not in ('homme', 'femme') then
    raw_gender := null;
  end if;

  insert into public.profiles (
    id,
    full_name,
    ministry_id,
    role,
    gender,
    created_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    default_ministry_id,
    'student',
    raw_gender,
    now()
  )
  on conflict (id) do update set
    full_name = case
      when excluded.full_name is not null and excluded.full_name <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    ministry_id = coalesce(excluded.ministry_id, public.profiles.ministry_id),
    gender = coalesce(excluded.gender, public.profiles.gender);

  return new;
end;
$$ language plpgsql security definer;

-- Rattrapage des profils existants si le genre est déjà stocké dans les métadonnées auth
update public.profiles p
set gender = u.raw_user_meta_data->>'gender'
from auth.users u
where p.id = u.id
  and p.gender is null
  and u.raw_user_meta_data->>'gender' in ('homme', 'femme');
