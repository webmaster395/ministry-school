begin;

-- Structure additive : aucun cours, aucune séance et aucune ressource existante
-- n'est supprimé. Les anciennes colonnes track/session_type restent compatibles.
create table if not exists public.formation_categories (
  key text primary key check (key in ('heart','character','sensitivity','deepening')),
  label text not null,
  display_order integer not null
);
insert into public.formation_categories(key,label,display_order) values
  ('heart','Formation du cœur',10),
  ('character','Formation du caractère',20),
  ('sensitivity','Formation des sensibilités',30),
  ('deepening','Formations d’approfondissement',40)
on conflict(key) do update set label=excluded.label,display_order=excluded.display_order;

create table if not exists public.formations (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.formation_categories(key),
  slug text not null unique,
  title text not null check (length(trim(title)) between 1 and 180),
  description text,
  ministry_id uuid references public.ministries(id) on delete set null,
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.formations(category_key,slug,title,status)
values
  ('heart','formation-du-coeur','Formation du cœur','published'),
  ('character','formation-du-caractere','Formation du caractère','published')
on conflict(slug) do nothing;

insert into public.formations(category_key,slug,title,ministry_id,status)
select 'sensitivity','sensibilite-'||ministry.slug,'Sensibilité '||ministry.name,ministry.id,'published'
from public.ministries ministry
where ministry.slug in ('apotre','prophete','evangeliste','pasteur','docteur')
on conflict(slug) do nothing;

alter table public.courses add column if not exists formation_id uuid references public.formations(id) on delete set null;
alter table public.sessions add column if not exists formation_id uuid references public.formations(id) on delete set null;

create index if not exists sessions_formation_date_idx on public.sessions(formation_id,session_date,start_time);
create index if not exists courses_formation_idx on public.courses(formation_id);

-- Trace chiffrée de la migration : elle permet de comparer le classement
-- historique avec le rattachement explicite, sans copier de données métier.
create table if not exists public.formation_migration_audit (
  migration_key text not null,
  stage text not null check(stage in ('before','after')),
  category_key text not null,
  course_count integer not null,
  session_count integer not null,
  recorded_at timestamptz not null default now(),
  primary key(migration_key,stage,category_key)
);

insert into public.formation_migration_audit(migration_key,stage,category_key,course_count,session_count)
select '20261113113000','before',category_key,count(distinct course_id)::integer,count(*)::integer
from (
  select session.course_id,
    case
      when lower(coalesce(session.track,'')) like '%cœur%' or lower(coalesce(session.track,'')) like '%coeur%' then 'heart'
      when lower(coalesce(session.track,'')) like '%caractère%' or lower(coalesce(session.track,'')) like '%caractere%' then 'character'
      when session.ministry_id is not null then 'sensitivity'
      else 'unclassified'
    end category_key
  from public.sessions session
) inventory group by category_key
on conflict(migration_key,stage,category_key) do update set course_count=excluded.course_count,session_count=excluded.session_count,recorded_at=now();

-- Rattachement conservateur des séances dont le libellé est explicite. Les lignes
-- ambiguës restent volontairement non rattachées pour éviter une attribution fausse.
update public.sessions session set formation_id=formation.id
from public.formations formation
where session.formation_id is null and (
  (formation.slug='formation-du-coeur' and (lower(coalesce(session.track,'')) like '%cœur%' or lower(coalesce(session.track,'')) like '%coeur%'))
  or (formation.slug='formation-du-caractere' and (lower(coalesce(session.track,'')) like '%caractère%' or lower(coalesce(session.track,'')) like '%caractere%'))
  or (formation.ministry_id is not null and formation.category_key='sensitivity' and formation.ministry_id=session.ministry_id)
);

update public.courses course set formation_id=session.formation_id
from public.sessions session
where course.formation_id is null and session.course_id=course.id and session.formation_id is not null;

-- Ces deux appellations désignent le même créneau pédagogique. Toutes les
-- séances et associations sont conservées : seul le libellé est harmonisé.
update public.sessions
set track='Projets et formations'
where lower(trim(track)) in ('accélérateur de projet','accelerateur de projet');

insert into public.formation_migration_audit(migration_key,stage,category_key,course_count,session_count)
select '20261113113000','after',coalesce(formation.category_key,'unclassified'),count(distinct session.course_id)::integer,count(*)::integer
from public.sessions session left join public.formations formation on formation.id=session.formation_id
group by coalesce(formation.category_key,'unclassified')
on conflict(migration_key,stage,category_key) do update set course_count=excluded.course_count,session_count=excluded.session_count,recorded_at=now();

create table if not exists public.formation_category_assignments (
  category_key text not null references public.formation_categories(key) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('responsible','contributor')),
  can_publish boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(category_key,user_id)
);
create table if not exists public.formation_assignments (
  formation_id uuid not null references public.formations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('responsible','contributor')),
  can_publish boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(formation_id,user_id)
);
create table if not exists public.course_assignments (
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('responsible','contributor')),
  can_publish boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(course_id,user_id)
);
create table if not exists public.session_assignments (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('responsible','contributor')),
  can_publish boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key(session_id,user_id)
);

create table if not exists public.deepening_enrollments (
  id uuid primary key default gen_random_uuid(),
  formation_id uuid not null references public.formations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','removed','completed')),
  assigned_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  unique(formation_id,user_id)
);

-- L'autorisation générale et l'inscription à une formation précise restent
-- deux décisions distinctes. Les deux sont nécessaires côté étudiant.
create table if not exists public.deepening_access (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null default auth.uid(),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.session_attendance (
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'unknown' check (status in ('unknown','present','absent')),
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(session_id,user_id)
);
create table if not exists public.session_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_status text,
  new_status text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);

create or replace function public.audit_session_attendance() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.session_attendance_audit(session_id,user_id,old_status,new_status,actor_id)
  values(new.session_id,new.user_id,case when tg_op='UPDATE' then old.status end,new.status,auth.uid());
  new.recorded_by=auth.uid(); new.recorded_at=now(); new.updated_at=now();
  return new;
end $$;
drop trigger if exists session_attendance_audit_trigger on public.session_attendance;
create trigger session_attendance_audit_trigger before insert or update on public.session_attendance
for each row execute function public.audit_session_attendance();

alter table public.materials add column if not exists audience text not null default 'authorized'
  check (audience in ('authorized','enrolled','present'));
alter table public.assignments add column if not exists audience text not null default 'authorized'
  check (audience in ('authorized','enrolled','present'));

create table if not exists public.assignment_submissions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted','late','validated')),
  text_response text,
  link_url text,
  file_path text,
  file_name text,
  submitted_at timestamptz not null default now(),
  validated_at timestamptz,
  validated_by uuid references public.profiles(id) on delete set null,
  primary key(assignment_id,user_id)
);

create or replace function public.can_manage_formation(p_formation uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.formations formation where formation.id=p_formation and (
      exists(select 1 from public.formation_category_assignments assignment where assignment.category_key=formation.category_key and assignment.user_id=p_user)
      or exists(select 1 from public.formation_assignments assignment where assignment.formation_id=formation.id and assignment.user_id=p_user)
    )
  )
$$;

create or replace function public.can_publish_formation(p_formation uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.formations formation where formation.id=p_formation and (
      exists(select 1 from public.formation_category_assignments assignment where assignment.category_key=formation.category_key and assignment.user_id=p_user and assignment.role='responsible' and assignment.can_publish)
      or exists(select 1 from public.formation_assignments assignment where assignment.formation_id=formation.id and assignment.user_id=p_user and assignment.role='responsible' and assignment.can_publish)
    )
  )
$$;

create or replace function public.enforce_formation_publication() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status and new.status in ('published','archived') and not public.can_publish_formation(new.id) then
    raise exception 'FORMATION_PUBLISH_FORBIDDEN' using errcode='42501';
  end if;
  new.updated_at=now();
  return new;
end $$;
drop trigger if exists formations_publication_guard on public.formations;
create trigger formations_publication_guard before update on public.formations
for each row execute function public.enforce_formation_publication();

create or replace function public.can_manage_formation_session(p_session uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.sessions session where session.id=p_session and (
      public.can_manage_formation(session.formation_id,p_user)
      or exists(select 1 from public.course_assignments assignment where assignment.course_id=session.course_id and assignment.user_id=p_user)
      or exists(select 1 from public.session_assignments assignment where assignment.session_id=session.id and assignment.user_id=p_user)
    )
  )
$$;

create or replace function public.can_view_formation(p_formation uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.can_manage_formation(p_formation,p_user) or exists(
    select 1 from public.sessions session where session.formation_id=p_formation and (
      exists(select 1 from public.course_assignments assignment where assignment.course_id=session.course_id and assignment.user_id=p_user)
      or exists(select 1 from public.session_assignments assignment where assignment.session_id=session.id and assignment.user_id=p_user)
    )
  )
$$;

create or replace function public.managed_formation_session_ids(p_user uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path=public as $$
  select session.id from public.sessions session
  where session.formation_id is not null and public.can_manage_formation_session(session.id,p_user)
$$;

-- Extension du droit existant : les formulaires de séance, supports et devoirs
-- réutilisent tous ce point de contrôle côté serveur.
create or replace function public.can_edit_ministry_course(
  p_session uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.sessions session where session.id=p_session and (
      (session.formation_id is not null and public.can_manage_formation_session(session.id,p_user))
      or (session.session_type='ministere' and (
        public.is_ministry_lead_for(session.ministry_id,p_user)
        or exists(select 1 from public.ministry_delegates delegate where delegate.user_id=p_user and delegate.ministry_id=session.ministry_id and delegate.can_edit)
      ))
      or (session.opportunity_id is not null and public.can_edit_opportunity(session.opportunity_id,p_user))
    )
  )
$$;

create or replace function public.create_formation_course_draft(
  p_formation uuid,
  p_payload jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_formation public.formations%rowtype;
  v_title text := trim(coalesce(p_payload->>'title',''));
  v_date date;
  v_start time;
  v_end time;
  v_location text := trim(coalesce(p_payload->>'location',''));
  v_course uuid;
  v_session uuid;
  v_trainer uuid;
  v_teacher uuid;
begin
  select * into v_formation from public.formations where id=p_formation;
  if not found or not public.can_manage_formation(p_formation) then raise exception 'FORBIDDEN'; end if;
  begin
    v_date := (p_payload->>'session_date')::date;
    v_start := (p_payload->>'start_time')::time;
    v_end := (p_payload->>'end_time')::time;
  exception when others then raise exception 'INVALID_TIME'; end;
  if v_title='' or v_location='' or v_date is null then raise exception 'REQUIRED_FIELDS'; end if;
  if v_start is null or v_end is null or v_end<=v_start then raise exception 'INVALID_TIME'; end if;
  begin v_trainer := nullif(p_payload->>'trainer_id','')::uuid; exception when others then v_trainer := null; end;
  if v_trainer is not null then
    select profile_id into v_teacher from public.trainers where id=v_trainer and is_active=true;
    if not found then raise exception 'INVALID_TRAINER'; end if;
  end if;

  insert into public.courses(title,ministry_id,description,objectives,formation_id)
  values(v_title,v_formation.ministry_id,nullif(trim(coalesce(p_payload->>'summary','')),''),nullif(trim(coalesce(p_payload->>'objectives','')),''),p_formation)
  returning id into v_course;

  insert into public.sessions(
    session_type,ministry_id,course_id,teacher_id,formation_id,session_date,start_time,end_time,
    location,room,day,description,track,speaker_name,summary,objectives,bible_refs,
    show_parking_notice,is_draft,editorial_status
  ) values(
    case when v_formation.category_key='sensitivity' then 'ministere' else 'commun' end,
    v_formation.ministry_id,v_course,v_teacher,p_formation,v_date,v_start,v_end,v_location,
    nullif(trim(coalesce(p_payload->>'room','')),''),
    case when extract(isodow from v_date)=7 then 'dimanche' else 'samedi' end,
    v_title,v_formation.title,nullif(trim(coalesce(p_payload->>'speaker_name','')),''),
    nullif(trim(coalesce(p_payload->>'summary','')),''),
    nullif(trim(coalesce(p_payload->>'objectives','')),''),
    nullif(trim(coalesce(p_payload->>'bible_refs','')),''),
    coalesce((p_payload->>'show_parking_notice')::boolean,false),true,'draft'
  ) returning id into v_session;

  if v_trainer is not null then insert into public.session_trainers(session_id,trainer_id,position) values(v_session,v_trainer,0); end if;
  return v_session;
end $$;

drop policy if exists sessions_strict_insert on public.sessions;
create policy sessions_strict_insert on public.sessions for insert to authenticated with check(
  public.is_platform_admin()
  or (formation_id is not null and public.can_manage_formation(formation_id))
  or (session_type='ministere' and public.is_ministry_lead_for(ministry_id))
  or (opportunity_id is not null and public.can_submit_opportunity(opportunity_id))
);
drop policy if exists sessions_strict_update on public.sessions;
create policy sessions_strict_update on public.sessions for update to authenticated
using(public.is_platform_admin() or public.can_edit_ministry_course(id))
with check(public.is_platform_admin() or public.can_edit_ministry_course(id));
drop policy if exists sessions_strict_delete on public.sessions;
create policy sessions_strict_delete on public.sessions for delete to authenticated using(
  public.is_platform_admin()
  or (formation_id is not null and public.can_manage_formation(formation_id))
  or (session_type='ministere' and public.is_ministry_lead_for(ministry_id))
  or (opportunity_id is not null and public.can_submit_opportunity(opportunity_id))
);

create or replace function public.can_access_deepening_session(p_session uuid,p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select public.can_manage_formation_session(p_session,p_user) or exists(
    select 1 from public.sessions session
    join public.formations formation on formation.id=session.formation_id and formation.category_key='deepening'
    join public.deepening_enrollments enrollment on enrollment.formation_id=formation.id and enrollment.user_id=p_user and enrollment.status='active'
    join public.deepening_access access on access.user_id=p_user and access.enabled=true
    where session.id=p_session
  )
$$;

create or replace function public.formation_access_summary()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'categoryKeys',case when public.is_super_admin() then '["heart","character","sensitivity","deepening"]'::jsonb else coalesce((
      select jsonb_agg(distinct category_key) from (
        select assignment.category_key from public.formation_category_assignments assignment where assignment.user_id=auth.uid()
        union all
        select formation.category_key from public.formation_assignments assignment join public.formations formation on formation.id=assignment.formation_id where assignment.user_id=auth.uid()
        union all
        select formation.category_key from public.course_assignments assignment join public.courses course on course.id=assignment.course_id join public.formations formation on formation.id=course.formation_id where assignment.user_id=auth.uid()
        union all
        select formation.category_key from public.session_assignments assignment join public.sessions session on session.id=assignment.session_id join public.formations formation on formation.id=session.formation_id where assignment.user_id=auth.uid()
      ) access
    ),'[]'::jsonb) end,
    'hasDeepeningEnrollment',exists(
      select 1 from public.deepening_enrollments enrollment
      join public.deepening_access access on access.user_id=enrollment.user_id and access.enabled=true
      where enrollment.user_id=auth.uid() and enrollment.status='active'
    )
  )
$$;

alter table public.formation_categories enable row level security;
alter table public.formations enable row level security;
alter table public.formation_category_assignments enable row level security;
alter table public.formation_assignments enable row level security;
alter table public.course_assignments enable row level security;
alter table public.session_assignments enable row level security;
alter table public.deepening_enrollments enable row level security;
alter table public.deepening_access enable row level security;
alter table public.session_attendance enable row level security;
alter table public.session_attendance_audit enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.formation_migration_audit enable row level security;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('formation-private-resources','formation-private-resources',false,20971520,array[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'audio/mpeg','audio/mp4','video/mp4'
]) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy formation_private_resources_insert on storage.objects for insert to authenticated with check(
  bucket_id='formation-private-resources'
  and public.can_manage_formation_session(((storage.foldername(name))[1])::uuid)
);
create policy formation_private_resources_manage on storage.objects for update to authenticated
using(bucket_id='formation-private-resources' and public.can_manage_formation_session(((storage.foldername(name))[1])::uuid))
with check(bucket_id='formation-private-resources' and public.can_manage_formation_session(((storage.foldername(name))[1])::uuid));
create policy formation_private_resources_delete on storage.objects for delete to authenticated using(
  bucket_id='formation-private-resources' and public.can_manage_formation_session(((storage.foldername(name))[1])::uuid)
);

create policy formation_categories_read on public.formation_categories for select to authenticated using(true);
create policy formation_migration_audit_super_read on public.formation_migration_audit for select to authenticated using(public.is_super_admin());
create policy formations_read on public.formations for select to authenticated using(
  public.can_view_formation(id) or exists(
    select 1 from public.deepening_enrollments enrollment
    join public.deepening_access access on access.user_id=enrollment.user_id and access.enabled=true
    where enrollment.formation_id=id and enrollment.user_id=auth.uid() and enrollment.status='active'
  )
);
create policy formations_manage on public.formations for all to authenticated using(public.can_manage_formation(id)) with check(public.is_super_admin() or public.can_manage_formation(id));

create policy formation_category_assignments_admin on public.formation_category_assignments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy formation_assignments_admin on public.formation_assignments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy course_assignments_admin on public.course_assignments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy session_assignments_admin on public.session_assignments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy formation_assignments_self_read on public.formation_assignments for select to authenticated using(user_id=auth.uid());
create policy formation_category_assignments_self_read on public.formation_category_assignments for select to authenticated using(user_id=auth.uid());
create policy course_assignments_self_read on public.course_assignments for select to authenticated using(user_id=auth.uid());
create policy session_assignments_self_read on public.session_assignments for select to authenticated using(user_id=auth.uid());

create policy deepening_enrollments_read on public.deepening_enrollments for select to authenticated using(user_id=auth.uid() or public.is_super_admin() or public.can_manage_formation(formation_id));
create policy deepening_enrollments_admin on public.deepening_enrollments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy deepening_access_read on public.deepening_access for select to authenticated using(user_id=auth.uid() or public.is_super_admin());
create policy deepening_access_admin on public.deepening_access for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
create policy session_attendance_read on public.session_attendance for select to authenticated using(user_id=auth.uid() or public.can_manage_formation_session(session_id));
create policy session_attendance_manage on public.session_attendance for all to authenticated using(public.can_manage_formation_session(session_id)) with check(public.can_manage_formation_session(session_id));
create policy session_attendance_audit_read on public.session_attendance_audit for select to authenticated using(public.can_manage_formation_session(session_id));

create policy profiles_formation_managers_read on public.profiles for select to authenticated using(
  exists(
    select 1 from public.deepening_enrollments enrollment
    where enrollment.user_id=profiles.id and public.can_manage_formation(enrollment.formation_id)
  )
);

create policy assignment_submissions_self_read on public.assignment_submissions for select to authenticated using(user_id=auth.uid() or exists(select 1 from public.assignments assignment where assignment.id=assignment_id and public.can_manage_formation_session(assignment.session_id)));
create policy assignment_submissions_self_write on public.assignment_submissions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.assignments assignment where assignment.id=assignment_id and public.can_access_deepening_session(assignment.session_id)));
create policy assignment_submissions_self_update on public.assignment_submissions for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid() and status in ('submitted','late') and validated_at is null and validated_by is null);
create policy assignment_submissions_manager_update on public.assignment_submissions for update to authenticated
using(exists(select 1 from public.assignments assignment where assignment.id=assignment_id and public.can_manage_formation_session(assignment.session_id)))
with check(exists(select 1 from public.assignments assignment where assignment.id=assignment_id and public.can_manage_formation_session(assignment.session_id)));

-- Les règles restrictives ne modifient pas les cours historiques. Elles ne
-- s'activent que pour les formations d'approfondissement.
create policy sessions_deepening_access on public.sessions as restrictive for select to authenticated using(
  not exists(select 1 from public.formations formation where formation.id=sessions.formation_id and formation.category_key='deepening')
  or public.can_access_deepening_session(id)
);
create policy materials_deepening_access on public.materials as restrictive for select to authenticated using(
  not exists(select 1 from public.sessions session join public.formations formation on formation.id=session.formation_id where session.id=materials.session_id and formation.category_key='deepening')
  or public.can_manage_formation_session(session_id)
  or (
    audience in ('authorized','enrolled') and public.can_access_deepening_session(session_id)
  )
  or (
    audience='present' and exists(select 1 from public.session_attendance attendance where attendance.session_id=materials.session_id and attendance.user_id=auth.uid() and attendance.status='present')
  )
);
create policy assignments_deepening_access on public.assignments as restrictive for select to authenticated using(
  not exists(select 1 from public.sessions session join public.formations formation on formation.id=session.formation_id where session.id=assignments.session_id and formation.category_key='deepening')
  or public.can_manage_formation_session(session_id)
  or (audience in ('authorized','enrolled') and public.can_access_deepening_session(session_id))
  or (audience='present' and exists(select 1 from public.session_attendance attendance where attendance.session_id=assignments.session_id and attendance.user_id=auth.uid() and attendance.status='present'))
);

-- Les privilèges SQL complètent la RLS pour les nouvelles tables.
grant select,insert,update,delete on public.formation_categories to authenticated;
grant select,insert,update,delete on public.formations to authenticated;
grant select,insert,update,delete on public.formation_category_assignments to authenticated;
grant select,insert,update,delete on public.formation_assignments to authenticated;
grant select,insert,update,delete on public.course_assignments to authenticated;
grant select,insert,update,delete on public.session_assignments to authenticated;
grant select,insert,update,delete on public.deepening_access to authenticated;
grant select,insert,update,delete on public.deepening_enrollments to authenticated;
grant select,insert,update,delete on public.session_attendance to authenticated;
grant select on public.session_attendance_audit to authenticated;
grant select,insert,update,delete on public.assignment_submissions to authenticated;
grant select on public.formation_migration_audit to authenticated;

grant execute on function public.formation_access_summary() to authenticated;
grant execute on function public.can_manage_formation(uuid,uuid) to authenticated;
grant execute on function public.can_manage_formation_session(uuid,uuid) to authenticated;
grant execute on function public.can_access_deepening_session(uuid,uuid) to authenticated;
grant execute on function public.can_publish_formation(uuid,uuid) to authenticated;
grant execute on function public.can_view_formation(uuid,uuid) to authenticated;
grant execute on function public.managed_formation_session_ids(uuid) to authenticated;
grant execute on function public.create_formation_course_draft(uuid,jsonb) to authenticated;

commit;
