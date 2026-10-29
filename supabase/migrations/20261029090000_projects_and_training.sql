begin;

-- Refonte additive : les lignes et inscriptions historiques sont conservées.
alter table public.profiles
  add column if not exists is_projects_training_member boolean not null default false;

update public.profiles
set is_projects_training_member = coalesce(is_service_lead, false) or coalesce(is_project_lead, false)
where coalesce(is_service_lead, false) or coalesce(is_project_lead, false);
update public.profiles set is_service_lead = false, is_project_lead = false;

-- Le rôle Formateur/Enseignant disparaît. Les liens teacher_id des séances restent intacts
-- afin de préserver l'historique des contenus et des intervenants.
update public.profiles set role = 'student' where role = 'teacher';
update public.profiles set is_teacher = false where coalesce(is_teacher, false);
update auth.users u
set raw_app_meta_data = jsonb_set(coalesce(u.raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(p.role::text), true)
from public.profiles p where p.id = u.id;

alter table public.opportunities
  add column if not exists is_project boolean not null default false,
  add column if not exists is_training boolean not null default false,
  add column if not exists short_description text,
  add column if not exists objectives text,
  add column if not exists speakers text,
  add column if not exists prerequisites text,
  add column if not exists location text,
  add column if not exists organization_material text,
  add column if not exists participant_material text,
  add column if not exists publication_status text not null default 'draft',
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists cancellation_allowed boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.opportunities
set is_project = kind = 'projet',
    is_training = kind = 'formation',
    short_description = coalesce(short_description, left(description, 240)),
    publication_status = case when registration_open then 'published' else 'draft' end,
    published_at = case when registration_open then coalesce(published_at, created_at, now()) else published_at end
where not is_project and not is_training;

alter table public.opportunities drop constraint if exists opportunities_type_required;
alter table public.opportunities
  add constraint opportunities_type_required check (is_project or is_training),
  drop constraint if exists opportunities_publication_status_check;
alter table public.opportunities
  add constraint opportunities_publication_status_check
  check (publication_status in ('draft', 'published', 'scheduled', 'unpublished', 'archived'));

alter table public.opportunity_dates
  add column if not exists location text;

create table if not exists public.opportunity_assignments (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  responsibility text not null check (responsibility in ('manager', 'contributor')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  primary key (opportunity_id, user_id)
);

-- Les créateurs historiques deviennent responsables, sans perdre leurs accès.
insert into public.opportunity_assignments (opportunity_id, user_id, responsibility, created_by)
select id, created_by, 'manager', created_by
from public.opportunities
where created_by is not null
on conflict (opportunity_id, user_id) do nothing;

create or replace function public.is_platform_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = p_user and role = 'admin') $$;

create or replace function public.can_manage_opportunity(p_opportunity uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_platform_admin(p_user) or exists(
    select 1 from public.opportunity_assignments
    where opportunity_id = p_opportunity and user_id = p_user and responsibility = 'manager'
  )
$$;

create or replace function public.can_contribute_opportunity(p_opportunity uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select public.can_manage_opportunity(p_opportunity, p_user) or exists(
    select 1 from public.opportunity_assignments
    where opportunity_id = p_opportunity and user_id = p_user
  )
$$;

create or replace function public.is_pilotage_for(p_ministry uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_platform_admin(p_user) or (
    p_ministry is not null and (
      exists(select 1 from public.profiles where id = p_user and ministry_lead_of = p_ministry)
      or exists(select 1 from public.ministry_delegates where user_id = p_user and ministry_id = p_ministry)
    )
  )
$$;

create or replace function public.opportunity_is_visible(o public.opportunities)
returns boolean language sql stable
as $$
  select o.archived_at is null and (
    o.publication_status = 'published'
    or (o.publication_status = 'scheduled' and o.published_at <= now())
  )
$$;

-- Toutes les anciennes politiques sont retirées : aucune règle permissive historique
-- ne doit continuer à autoriser la création par les anciens rôles.
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
           where schemaname = 'public'
             and tablename in ('opportunities', 'opportunity_dates', 'opportunity_assignments', 'opportunity_registrations')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.opportunities enable row level security;
alter table public.opportunity_dates enable row level security;
alter table public.opportunity_assignments enable row level security;
alter table public.opportunity_registrations enable row level security;

-- Les droits d'édition pédagogique passent du rôle supprimé au pilotage ministériel.
create policy sessions_pilotage_update on public.sessions for update to authenticated
using (public.is_pilotage_for(ministry_id)) with check (public.is_pilotage_for(ministry_id));
create policy materials_pilotage_insert on public.materials for insert to authenticated
with check (created_by = auth.uid() and exists(
  select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)
));
create policy materials_pilotage_update on public.materials for update to authenticated
using (exists(select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)));
create policy materials_pilotage_delete on public.materials for delete to authenticated
using (exists(select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)));
create policy assignments_pilotage_insert on public.assignments for insert to authenticated
with check (created_by = auth.uid() and exists(
  select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)
));
create policy assignments_pilotage_update on public.assignments for update to authenticated
using (exists(select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)));
create policy assignments_pilotage_delete on public.assignments for delete to authenticated
using (exists(select 1 from public.sessions s where s.id = session_id and public.is_pilotage_for(s.ministry_id)));
create policy announcements_pilotage_insert on public.announcements for insert to authenticated
with check (author_id = auth.uid() and (public.is_platform_admin() or public.is_pilotage_for(ministry_id)));
create policy announcements_pilotage_delete on public.announcements for delete to authenticated
using (author_id = auth.uid() and (public.is_platform_admin() or public.is_pilotage_for(ministry_id)));

create policy opportunities_read on public.opportunities for select to authenticated
using (public.opportunity_is_visible(opportunities) or public.can_contribute_opportunity(id));
create policy opportunities_admin_insert on public.opportunities for insert to authenticated
with check (public.is_platform_admin() and created_by = auth.uid());
create policy opportunities_manager_update on public.opportunities for update to authenticated
using (public.can_manage_opportunity(id)) with check (public.can_manage_opportunity(id));
create policy opportunities_admin_delete on public.opportunities for delete to authenticated
using (public.is_platform_admin());

create policy opportunity_dates_read on public.opportunity_dates for select to authenticated
using (exists(select 1 from public.opportunities o where o.id = opportunity_id));
create policy opportunity_dates_write on public.opportunity_dates for all to authenticated
using (public.can_manage_opportunity(opportunity_id))
with check (public.can_manage_opportunity(opportunity_id));

create policy opportunity_assignments_read on public.opportunity_assignments for select to authenticated
using (public.can_contribute_opportunity(opportunity_id));
create policy opportunity_assignments_admin_write on public.opportunity_assignments for all to authenticated
using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy opportunity_registrations_read on public.opportunity_registrations for select to authenticated
using (user_id = auth.uid() or public.can_contribute_opportunity(opportunity_id));

create or replace function public.register_for_opportunity(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare o public.opportunities%rowtype; taken integer;
begin
  select * into o from public.opportunities where id = p_opportunity for update;
  if not found or not public.opportunity_is_visible(o) or not o.registration_open then
    raise exception 'INSCRIPTIONS_CLOSED';
  end if;
  if exists(select 1 from public.opportunity_registrations where opportunity_id = p_opportunity and user_id = auth.uid()) then
    raise exception 'ALREADY_REGISTERED';
  end if;
  select count(*) into taken from public.opportunity_registrations where opportunity_id = p_opportunity;
  if o.capacity is not null and taken >= o.capacity then raise exception 'CAPACITY_REACHED'; end if;
  insert into public.opportunity_registrations(opportunity_id, user_id) values (p_opportunity, auth.uid());
end $$;

create or replace function public.cancel_opportunity_registration(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not exists(select 1 from public.opportunities where id = p_opportunity and cancellation_allowed) then
    raise exception 'CANCELLATION_NOT_ALLOWED';
  end if;
  delete from public.opportunity_registrations where opportunity_id = p_opportunity and user_id = auth.uid();
end $$;

create or replace function public.update_opportunity_content(
  p_opportunity uuid, p_description text, p_objectives text, p_speakers text,
  p_prerequisites text, p_organization_material text, p_participant_material text
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_contribute_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  update public.opportunities set
    description = p_description, objectives = p_objectives, speakers = p_speakers,
    prerequisites = p_prerequisites, organization_material = p_organization_material,
    participant_material = p_participant_material, updated_at = now()
  where id = p_opportunity;
end $$;

create or replace function public.create_opportunity_admin(
  p_payload jsonb, p_dates jsonb, p_managers uuid[], p_contributors uuid[]
) returns uuid language plpgsql security definer set search_path = public
as $$
declare new_id uuid; person uuid; d jsonb;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_payload->>'title'), '') = '' or coalesce(trim(p_payload->>'description'), '') = '' then
    raise exception 'REQUIRED_FIELDS';
  end if;
  if not coalesce((p_payload->>'is_project')::boolean, false)
     and not coalesce((p_payload->>'is_training')::boolean, false) then
    raise exception 'TYPE_REQUIRED';
  end if;

  insert into public.opportunities(
    kind, is_project, is_training, title, short_description, description, objectives,
    service_id, organizer_label, speakers, prerequisites, location, organization_material,
    participant_material, schedule_label, starts_on, ends_on, capacity, registration_open,
    cancellation_allowed, publication_status, published_at, created_by
  ) values (
    p_payload->>'kind', (p_payload->>'is_project')::boolean, (p_payload->>'is_training')::boolean,
    p_payload->>'title', p_payload->>'short_description', p_payload->>'description', p_payload->>'objectives',
    nullif(p_payload->>'service_id', '')::uuid, p_payload->>'organizer_label', p_payload->>'speakers',
    p_payload->>'prerequisites', p_payload->>'location', p_payload->>'organization_material',
    p_payload->>'participant_material', p_payload->>'schedule_label', nullif(p_payload->>'starts_on', '')::date,
    nullif(p_payload->>'ends_on', '')::date, nullif(p_payload->>'capacity', '')::integer,
    coalesce((p_payload->>'registration_open')::boolean, false),
    coalesce((p_payload->>'cancellation_allowed')::boolean, true), p_payload->>'publication_status',
    nullif(p_payload->>'published_at', '')::timestamptz, auth.uid()
  ) returning id into new_id;

  for d in select value from jsonb_array_elements(coalesce(p_dates, '[]'::jsonb)) loop
    insert into public.opportunity_dates(opportunity_id, session_date, start_time, end_time, room, location)
    values (new_id, (d->>'session_date')::date, (d->>'start_time')::time, (d->>'end_time')::time,
            nullif(d->>'room', ''), nullif(d->>'location', ''));
  end loop;

  foreach person in array coalesce(p_managers, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(new_id, person, 'manager', auth.uid())
    on conflict(opportunity_id, user_id) do update set responsibility = 'manager';
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
  foreach person in array coalesce(p_contributors, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(new_id, person, 'contributor', auth.uid())
    on conflict(opportunity_id, user_id) do nothing;
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
  return new_id;
end $$;

create or replace function public.replace_opportunity_dates(p_opportunity uuid, p_dates jsonb)
returns void language plpgsql security definer set search_path = public
as $$
declare d jsonb;
begin
  if not public.can_manage_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  delete from public.opportunity_dates where opportunity_id = p_opportunity;
  for d in select value from jsonb_array_elements(coalesce(p_dates, '[]'::jsonb)) loop
    insert into public.opportunity_dates(opportunity_id, session_date, start_time, end_time, room, location)
    values (p_opportunity, (d->>'session_date')::date, (d->>'start_time')::time, (d->>'end_time')::time,
            nullif(d->>'room', ''), nullif(d->>'location', ''));
  end loop;
  update public.opportunities set
    starts_on = (select min(session_date) from public.opportunity_dates where opportunity_id = p_opportunity),
    ends_on = (select max(session_date) from public.opportunity_dates where opportunity_id = p_opportunity),
    updated_at = now()
  where id = p_opportunity;
end $$;

create or replace function public.replace_opportunity_assignments(
  p_opportunity uuid, p_managers uuid[], p_contributors uuid[]
) returns void language plpgsql security definer set search_path = public
as $$
declare person uuid;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.opportunity_assignments where opportunity_id = p_opportunity;
  foreach person in array coalesce(p_managers, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(p_opportunity, person, 'manager', auth.uid());
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
  foreach person in array coalesce(p_contributors, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(p_opportunity, person, 'contributor', auth.uid()) on conflict do nothing;
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
end $$;

create or replace function public.opportunity_team(p_opportunity uuid)
returns table(user_id uuid, full_name text, avatar_path text, responsibility text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.avatar_path, a.responsibility
  from public.opportunity_assignments a join public.profiles p on p.id = a.user_id
  where a.opportunity_id = p_opportunity and public.can_contribute_opportunity(p_opportunity)
  order by case a.responsibility when 'manager' then 0 else 1 end, p.full_name
$$;

create or replace function public.opportunity_counts()
returns table(opportunity_id uuid, taken bigint)
language sql stable security definer set search_path = public
as $$
  select o.id, count(r.user_id)
  from public.opportunities o
  left join public.opportunity_registrations r on r.opportunity_id = o.id
  where public.opportunity_is_visible(o) or public.can_contribute_opportunity(o.id)
  group by o.id
$$;

create or replace function public.opportunity_participants(p_opp uuid)
returns table(full_name text, avatar_path text)
language sql stable security definer set search_path = public
as $$
  select p.full_name, p.avatar_path
  from public.opportunity_registrations r join public.profiles p on p.id = r.user_id
  where r.opportunity_id = p_opp and public.can_contribute_opportunity(p_opp)
  order by p.full_name
$$;

create or replace function public.set_user_access_v2(
  target uuid, p_admin boolean, p_projects_training boolean,
  p_service uuid, p_ministry_lead uuid
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  update public.profiles set
    role = case when p_admin then 'admin' else 'student' end,
    is_projects_training_member = p_projects_training,
    service_id = p_service,
    ministry_lead_of = p_ministry_lead,
    is_teacher = false,
    is_service_lead = false,
    is_project_lead = false
  where id = target;
end $$;

grant execute on function public.register_for_opportunity(uuid) to authenticated;
grant execute on function public.cancel_opportunity_registration(uuid) to authenticated;
grant execute on function public.update_opportunity_content(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.create_opportunity_admin(jsonb,jsonb,uuid[],uuid[]) to authenticated;
grant execute on function public.replace_opportunity_dates(uuid,jsonb) to authenticated;
grant execute on function public.replace_opportunity_assignments(uuid,uuid[],uuid[]) to authenticated;
grant execute on function public.opportunity_team(uuid) to authenticated;
grant execute on function public.opportunity_counts() to authenticated;
grant execute on function public.opportunity_participants(uuid) to authenticated;
grant execute on function public.set_user_access_v2(uuid,boolean,boolean,uuid,uuid) to authenticated;

commit;
