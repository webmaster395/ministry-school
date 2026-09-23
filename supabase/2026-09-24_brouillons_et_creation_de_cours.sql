-- Cours créés par le pilotage, et brouillons invisibles des étudiants.
-- À exécuter une seule fois dans Supabase > SQL Editor, dans cet ordre, AVANT de mettre
-- SESSIONS_HAVE_DRAFTS=1 dans Vercel.

begin;

-- 1. Le drapeau « brouillon » (faux par défaut : les séances existantes restent publiées).
alter table public.sessions
  add column if not exists is_draft boolean not null default false;

-- 2. Le pilotage (pasteur ou secrétaire délégué) peut créer un cours dans un ministère qu'il pilote.
--    Les règles existantes ne changent pas : seule la création par un administrateur existait.
create policy "séances créées par le pilotage"
  on public.sessions
  for insert
  to authenticated
  with check (
    session_type = 'ministere'
    and ministry_id in (select public.steering_ministries())
  );

-- 3. Un brouillon n'est lisible que de l'administrateur, du formateur assigné et du pilotage du
--    ministère. Règle « restrictive » : elle s'ajoute (ET) à « sessions readable by authenticated »
--    sans la remplacer.
create policy "brouillons réservés au pilotage"
  on public.sessions
  as restrictive
  for select
  to authenticated
  using (
    not is_draft
    or public.is_admin()
    or teacher_id = auth.uid()
    or ministry_id in (select public.steering_ministries())
  );

commit;

-- Pour annuler :
--   drop policy "brouillons réservés au pilotage" on public.sessions;
--   drop policy "séances créées par le pilotage" on public.sessions;
--   alter table public.sessions drop column is_draft;
