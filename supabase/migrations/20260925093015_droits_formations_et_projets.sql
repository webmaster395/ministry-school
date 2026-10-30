-- Responsable attribué à une formation (c'est Flora, administratrice, qui l'attribue)
alter table public.opportunities add column if not exists lead_id uuid references public.profiles(id);
update public.opportunities set lead_id = created_by where kind = 'formation' and lead_id is null;

-- « Est propriétaire » : l'auteur, le responsable attribué, ou un administrateur
create or replace function public.owns_opportunity(p_opp uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin() or exists (
    select 1 from public.opportunities o
    where o.id = p_opp and (o.created_by = auth.uid() or o.lead_id = auth.uid())
  );
$$;
revoke execute on function public.owns_opportunity(uuid) from public, anon;
grant execute on function public.owns_opportunity(uuid) to authenticated;

-- Seul un administrateur crée une formation ; un chef de projet crée des projets
create or replace function public.can_propose(p_kind text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin()
    or (p_kind = 'projet' and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_project_lead
    ));
$$;

-- Lecture : une offre non publiée n'est visible que de son auteur, de son responsable, des administrateurs
-- et des personnes déjà inscrites
drop policy if exists "offres lisibles" on public.opportunities;
create policy "offres visibles selon leur état" on public.opportunities
  for select to authenticated
  using (
    registration_open
    or public.is_admin()
    or created_by = auth.uid()
    or lead_id = auth.uid()
    or exists (select 1 from public.opportunity_registrations r where r.opportunity_id = opportunities.id and r.user_id = auth.uid())
  );

drop policy if exists "offres proposées par les responsables" on public.opportunities;
create policy "offres proposées par les responsables" on public.opportunities
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_propose(kind) and (lead_id is null or public.is_admin()));

drop policy if exists "offres modifiées par leur auteur" on public.opportunities;
create policy "offres modifiées par leur auteur ou responsable" on public.opportunities
  for update to authenticated
  using (created_by = auth.uid() or lead_id = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or lead_id = auth.uid() or public.is_admin());

-- Les champs de contrôle restent aux administrateurs
create or replace function public.protect_opportunity_fields()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.created_by is distinct from old.created_by
       or new.lead_id is distinct from old.lead_id
       or new.is_validated is distinct from old.is_validated
       or new.validated_at is distinct from old.validated_at
       or new.validated_by is distinct from old.validated_by then
      raise exception 'Modification réservée aux administrateurs';
    end if;
    if new.registration_open and not old.registration_open and not old.is_validated then
      raise exception 'Seul un administrateur peut ouvrir les inscriptions d''une proposition non validée';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists protect_opportunity_fields on public.opportunities;
create trigger protect_opportunity_fields before update on public.opportunities
  for each row execute function public.protect_opportunity_fields();

-- Dates : lisibles si la fiche l'est ; gérées par le propriétaire
drop policy if exists "dates lisibles" on public.opportunity_dates;
create policy "dates lisibles selon la fiche" on public.opportunity_dates
  for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_dates.opportunity_id));

drop policy if exists "dates gérées par l'auteur" on public.opportunity_dates;
create policy "dates gérées par le propriétaire" on public.opportunity_dates
  for all to authenticated
  using (public.owns_opportunity(opportunity_id))
  with check (public.owns_opportunity(opportunity_id));

-- Comptes rendus : le propriétaire (auteur ou responsable attribué) et les administrateurs
drop policy if exists "comptes rendus retirés par l'auteur et l'admin" on public.opportunity_reports;
create policy "comptes rendus retirés par le propriétaire" on public.opportunity_reports
  for delete to authenticated using (public.owns_opportunity(opportunity_id));
drop policy if exists "comptes rendus remis par l'auteur et l'admin" on public.opportunity_reports;
create policy "comptes rendus remis par le propriétaire" on public.opportunity_reports
  for insert to authenticated with check (submitted_by = auth.uid() and public.owns_opportunity(opportunity_id));
drop policy if exists "comptes rendus lus par l'auteur et l'admin" on public.opportunity_reports;
create policy "comptes rendus lus par le propriétaire" on public.opportunity_reports
  for select to authenticated using (public.owns_opportunity(opportunity_id));
drop policy if exists "comptes rendus remplacés par l'auteur et l'admin" on public.opportunity_reports;
create policy "comptes rendus remplacés par le propriétaire" on public.opportunity_reports
  for update to authenticated using (public.owns_opportunity(opportunity_id));

-- Liste des inscrits : le propriétaire et les administrateurs
create or replace function public.opportunity_participants(p_opp uuid)
returns table(full_name text, avatar_path text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.full_name, case when public.is_admin() then p.avatar_path end
  from public.opportunity_registrations r
  join public.profiles p on p.id = r.user_id
  where r.opportunity_id = p_opp and public.owns_opportunity(p_opp)
  order by r.created_at;
$$;

-- Nom affiché du responsable : celui qui est attribué, sinon l'auteur
create or replace function public.opportunity_lead(p_opp uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.full_name
  from public.opportunities o
  join public.profiles p on p.id = coalesce(o.lead_id, o.created_by)
  where o.id = p_opp;
$$;
revoke execute on function public.opportunity_lead(uuid) from public, anon;
grant execute on function public.opportunity_lead(uuid) to authenticated;;
