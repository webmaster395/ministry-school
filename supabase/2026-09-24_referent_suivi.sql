-- Référent du suivi pour les projets (fiche chef de projet et fiche étudiant).
-- À exécuter dans Supabase > SQL Editor.

alter table public.opportunities
  add column if not exists referent_id uuid references public.profiles(id);

-- Nom du référent de suivi affiché sur la fiche projet
create or replace function public.opportunity_referent(p_opp uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.full_name
  from public.opportunities o
  join public.profiles p on p.id = o.referent_id
  where o.id = p_opp;
$$;

-- Pour annuler :
--   drop function if exists public.opportunity_referent(uuid);
--   alter table public.opportunities drop column if exists referent_id;
