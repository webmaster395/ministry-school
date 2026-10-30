-- 1. Rôles indépendants : enseignant devient un drapeau comme les autres, l'admin peut le cumuler
alter table public.profiles
  add column if not exists is_teacher boolean not null default false,
  add column if not exists deactivated boolean not null default false;
update public.profiles set is_teacher = true where role = 'teacher';

create or replace function public.protect_profile_privileges() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if new.role is distinct from old.role
       or new.is_teacher is distinct from old.is_teacher
       or new.deactivated is distinct from old.deactivated
       or new.service_id is distinct from old.service_id
       or new.is_service_lead is distinct from old.is_service_lead
       or new.is_project_lead is distinct from old.is_project_lead
       or new.ministry_lead_of is distinct from old.ministry_lead_of
       or new.has_paid is distinct from old.has_paid then
      raise exception 'Modification réservée aux administrateurs';
    end if;
  end if;
  return new;
end $$;

drop function if exists public.set_user_access(uuid, text, boolean, boolean, uuid, uuid);
create or replace function public.set_user_access(
  target uuid, p_admin boolean, p_teacher boolean, p_service_lead boolean, p_project_lead boolean,
  p_service uuid, p_ministry_lead uuid
) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  jwt_role text := case when p_admin then 'admin' when p_teacher then 'teacher' else 'student' end;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  update public.profiles set
    role = jwt_role,
    is_teacher = p_teacher,
    is_service_lead = p_service_lead,
    is_project_lead = p_project_lead,
    service_id = p_service,
    ministry_lead_of = p_ministry_lead
  where id = target;
  update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', jwt_role)
  where id = target;
end $$;

-- 2. Désactivation d'un compte : connexion refusée, session existante coupée par l'application
create or replace function public.set_user_active(target uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;
  if target = auth.uid() and not p_active then
    raise exception 'Vous ne pouvez pas désactiver votre propre compte';
  end if;
  update public.profiles set deactivated = not p_active where id = target;
  update auth.users set banned_until = case when p_active then null else 'infinity'::timestamptz end where id = target;
end $$;

-- 3. Dates précises des formations et projets (les premiers samedis du mois)
create table public.opportunity_dates (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  session_date date not null,
  start_time time not null default '14:00',
  end_time time not null default '17:00',
  room text,
  primary key (opportunity_id, session_date)
);
alter table public.opportunity_dates enable row level security;
create policy "dates lisibles" on public.opportunity_dates for select to authenticated using (true);
create policy "dates gérées par l'auteur" on public.opportunity_dates for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())));

insert into public.opportunity_dates (opportunity_id, session_date, room)
select o.id, d::date, v.room
from (values
  ('Parcours régie vidéo', array['2026-09-05','2026-10-03','2026-11-07'], null),
  ('Développer Bible+', array['2026-10-03','2026-11-07','2026-12-05','2027-01-02','2027-02-06','2027-03-06','2027-04-03','2027-05-01','2027-06-05'], 'Salle projet'),
  ('Refonte du site de l''Église MLK', array['2026-10-03','2026-11-07','2026-12-05'], 'Salle 3'),
  ('Les bases du sous-titrage', array['2026-10-03','2026-11-07'], null),
  ('Accueillir et accompagner les nouveaux', array['2026-11-07'], 'Hall'),
  ('Organiser un événement à MLK', array['2026-12-05'], null),
  ('Créer une structure d''accompagnement pour les enfants victimes de prostitution', array['2027-01-02','2027-02-06','2027-03-06'], null)
) as v(title, dates, room)
join public.opportunities o on o.title = v.title
cross join lateral unnest(v.dates) as d;

-- 4. Comptes rendus (PDF ou PowerPoint) remis après chaque date
create table public.opportunity_reports (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  session_date date not null,
  file_path text not null,
  file_name text not null,
  submitted_by uuid not null default auth.uid() references auth.users(id),
  submitted_at timestamptz not null default now(),
  primary key (opportunity_id, session_date),
  foreign key (opportunity_id, session_date) references public.opportunity_dates(opportunity_id, session_date) on delete cascade
);
alter table public.opportunity_reports enable row level security;
create policy "comptes rendus lus par l'auteur et l'admin" on public.opportunity_reports for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus remis par l'auteur et l'admin" on public.opportunity_reports for insert to authenticated
  with check (submitted_by = auth.uid() and exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus remplacés par l'auteur et l'admin" on public.opportunity_reports for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus retirés par l'auteur et l'admin" on public.opportunity_reports for delete to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and (o.created_by = auth.uid() or public.is_admin())));

-- Stockage privé des fichiers
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comptes-rendus', 'comptes-rendus', false, 20971520,
  array['application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.oasis.opendocument.presentation'])
on conflict (id) do nothing;

create policy "comptes rendus : dépôt" on storage.objects for insert to authenticated
  with check (bucket_id = 'comptes-rendus' and exists (
    select 1 from public.opportunities o
    where o.id::text = (storage.foldername(name))[1] and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'comptes-rendus' and exists (
    select 1 from public.opportunities o
    where o.id::text = (storage.foldername(name))[1] and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus : remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'comptes-rendus' and exists (
    select 1 from public.opportunities o
    where o.id::text = (storage.foldername(name))[1] and (o.created_by = auth.uid() or public.is_admin())));
create policy "comptes rendus : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'comptes-rendus' and exists (
    select 1 from public.opportunities o
    where o.id::text = (storage.foldername(name))[1] and (o.created_by = auth.uid() or public.is_admin())));

revoke execute on function public.set_user_access(uuid, boolean, boolean, boolean, boolean, uuid, uuid) from public, anon;
revoke execute on function public.set_user_active(uuid, boolean) from public, anon;
grant execute on function public.set_user_access(uuid, boolean, boolean, boolean, boolean, uuid, uuid) to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;;
