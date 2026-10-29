-- Disponibilité indépendante des vidéos, supports et devoirs, et fermeture des
-- anciennes permissions d'enseignant. Toutes les données éditoriales sont conservées.

alter table public.assignments
  add column if not exists visible_at timestamptz;
update public.assignments
set visible_at = coalesce(created_at, now())
where visible_at is null;
alter table public.assignments
  alter column visible_at set default now(),
  alter column visible_at set not null;
create index if not exists assignments_session_visible_idx
  on public.assignments(session_id, visible_at, sort_order);

create table if not exists public.session_videos (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  url text not null check (length(trim(url)) > 0),
  visible_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

-- Reprise sans perte des vidéos historiques, puis retrait de l'URL de la ligne séance :
-- une lecture directe de sessions ne peut plus révéler une vidéo programmée.
insert into public.session_videos (session_id, url, visible_at)
select id, trim(video_url), coalesce(created_at, now())
from public.sessions
where nullif(trim(video_url), '') is not null
on conflict (session_id) do nothing;
update public.sessions set video_url = null where video_url is not null;

alter table public.session_videos enable row level security;

-- Retire toutes les règles permissives historiques sur les contenus. Une politique
-- PostgreSQL est additive : en laisser une seule suffirait à contourner la restriction.
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('materials', 'assignments', 'session_videos')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;

  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('sessions', 'assignment_steps', 'session_trainers')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- Une personne en pilotage ne gère que les séances ministérielles de son ministère.
-- L'administrateur est testé séparément et garde donc toujours la totalité des droits.
create policy sessions_strict_insert on public.sessions for insert to authenticated
with check (
  public.is_platform_admin()
  or (session_type = 'ministere' and ministry_id is not null and public.is_pilotage_for(ministry_id))
);
create policy sessions_strict_update on public.sessions for update to authenticated
using (
  public.is_platform_admin()
  or (session_type = 'ministere' and ministry_id is not null and public.is_pilotage_for(ministry_id))
)
with check (
  public.is_platform_admin()
  or (session_type = 'ministere' and ministry_id is not null and public.is_pilotage_for(ministry_id))
);
create policy sessions_strict_delete on public.sessions for delete to authenticated
using (
  public.is_platform_admin()
  or (session_type = 'ministere' and ministry_id is not null and public.is_pilotage_for(ministry_id))
);

create policy materials_scoped_read on public.materials for select to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.sessions s
    where s.id = materials.session_id
      and s.session_type = 'ministere'
      and s.ministry_id is not null
      and public.is_pilotage_for(s.ministry_id)
  )
  or (
    visible_at <= now()
    and exists (
      select 1 from public.sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = materials.session_id
        and (s.session_type = 'commun' or s.ministry_id = p.ministry_id)
        and (p.preferred_day is null or s.session_type = 'commun' or s.day = p.preferred_day)
    )
  )
);
create policy materials_scoped_insert on public.materials for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.sessions s where s.id = session_id and (
      public.is_platform_admin()
      or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
    )
  )
);
create policy materials_scoped_update on public.materials for update to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));
create policy materials_scoped_delete on public.materials for delete to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));

create policy assignments_scoped_read on public.assignments for select to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.sessions s
    where s.id = assignments.session_id
      and s.session_type = 'ministere'
      and s.ministry_id is not null
      and public.is_pilotage_for(s.ministry_id)
  )
  or (
    visible_at <= now()
    and exists (
      select 1 from public.sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = assignments.session_id
        and (s.session_type = 'commun' or s.ministry_id = p.ministry_id)
        and (p.preferred_day is null or s.session_type = 'commun' or s.day = p.preferred_day)
    )
  )
);
create policy assignments_scoped_insert on public.assignments for insert to authenticated
with check (
  created_by = auth.uid() and exists (
    select 1 from public.sessions s where s.id = session_id and (
      public.is_platform_admin()
      or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
    )
  )
);
create policy assignments_scoped_update on public.assignments for update to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));
create policy assignments_scoped_delete on public.assignments for delete to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));

create policy session_videos_scoped_read on public.session_videos for select to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.sessions s
    where s.id = session_videos.session_id
      and s.session_type = 'ministere'
      and s.ministry_id is not null
      and public.is_pilotage_for(s.ministry_id)
  )
  or (
    visible_at <= now()
    and exists (
      select 1 from public.sessions s
      join public.profiles p on p.id = auth.uid()
      where s.id = session_videos.session_id
        and (s.session_type = 'commun' or s.ministry_id = p.ministry_id)
        and (p.preferred_day is null or s.session_type = 'commun' or s.day = p.preferred_day)
    )
  )
);
create policy session_videos_scoped_write on public.session_videos for all to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
))
with check (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));

create policy assignment_steps_strict_write on public.assignment_steps for all to authenticated
using (exists (
  select 1 from public.assignments a join public.sessions s on s.id = a.session_id
  where a.id = assignment_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
))
with check (exists (
  select 1 from public.assignments a join public.sessions s on s.id = a.session_id
  where a.id = assignment_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));

create policy session_trainers_strict_write on public.session_trainers for all to authenticated
using (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
))
with check (exists (
  select 1 from public.sessions s where s.id = session_id and (
    public.is_platform_admin()
    or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
  )
));

-- Les inscriptions nominatives : soi-même, administrateur, ou pilotage du ministère exact.
drop policy if exists "enrollments teacher reads for own sessions" on public.enrollments;
drop policy if exists "profiles teacher reads enrolled students" on public.profiles;
drop policy if exists enrollments_pilotage_read on public.enrollments;
create policy enrollments_pilotage_read on public.enrollments for select to authenticated
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.sessions s
    where s.id = enrollments.session_id
      and s.session_type = 'ministere'
      and s.ministry_id is not null
      and public.is_pilotage_for(s.ministry_id)
  )
);
drop policy if exists profiles_pilotage_ministry_read on public.profiles;
create policy profiles_pilotage_ministry_read on public.profiles for select to authenticated
using (
  public.is_platform_admin()
  or (ministry_id is not null and public.is_pilotage_for(ministry_id))
);

create or replace function public.session_headcounts(p_ids uuid[])
returns table (session_id uuid, students bigint)
language sql stable security definer set search_path = public as $$
  select s.id,
    (select count(*) from public.profiles p
      where p.role = 'student'
        and p.email_confirmed
        and p.ministry_id = s.ministry_id
        and (p.preferred_day is null or p.preferred_day = s.day))
  from public.sessions s
  where s.id = any(p_ids)
    and (
      public.is_platform_admin()
      or (s.session_type = 'ministere' and s.ministry_id is not null and public.is_pilotage_for(s.ministry_id))
    );
$$;
revoke execute on function public.session_headcounts(uuid[]) from public, anon;
grant execute on function public.session_headcounts(uuid[]) to authenticated;

