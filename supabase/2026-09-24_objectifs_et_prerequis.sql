-- Objectifs et prérequis des formations et projets (fiche détaillée côté étudiant).
-- À exécuter une seule fois dans Supabase > SQL Editor, AVANT de mettre
-- OPPORTUNITIES_HAVE_DETAILS=1 dans Vercel. Les règles de sécurité existantes s'appliquent
-- telles quelles à ces deux colonnes.

alter table public.opportunities
  add column if not exists objectives text,
  add column if not exists prerequisites text;

-- Nom du responsable affiché aux étudiants : un étudiant ne peut pas lire le profil d'un autre, cette
-- fonction ne donne que le nom de la personne qui a créé la formation ou le projet.
create or replace function public.opportunity_lead(p_opp uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.full_name
  from public.opportunities o
  join public.profiles p on p.id = o.created_by
  where o.id = p_opp;
$$;

-- Pour annuler :
--   drop function public.opportunity_lead(uuid);
--   alter table public.opportunities drop column objectives, drop column prerequisites;
