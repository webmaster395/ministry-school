-- Validation des projets et formations par les administrateurs
-- À exécuter dans Supabase > SQL Editor

alter table public.opportunities
  add column if not exists is_validated boolean not null default false,
  add column if not exists validated_at timestamptz,
  add column if not exists validated_by uuid references public.profiles(id);

-- Les propositions existantes déjà publiées sont considérées comme validées
update public.opportunities
set is_validated = true
where registration_open = true;

-- Pour annuler :
--   alter table public.opportunities drop column if exists is_validated, drop column if exists validated_at, drop column if exists validated_by;
