begin;

-- Le contexte « Pilotage ministère » est volontairement plus étroit que le rôle
-- administrateur. Cette fonction n'accorde jamais de passe-droit aux admins : elle
-- décrit uniquement une responsabilité ministérielle explicite.
create or replace function public.is_strict_pilotage_for(
  p_ministry uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select p_ministry is not null
    and exists (
      select 1 from public.ministries m
      where m.id = p_ministry
        and m.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
    )
    and (
      exists(select 1 from public.profiles p where p.id = p_user and p.ministry_lead_of = p_ministry)
      or exists(select 1 from public.ministry_delegates d where d.user_id = p_user and d.ministry_id = p_ministry)
    )
$$;

create or replace function public.strict_pilotage_ministries()
returns table(ministry_id uuid) language sql stable security definer set search_path = public as $$
  select m.id
  from public.ministries m
  where m.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
    and public.is_strict_pilotage_for(m.id)
  order by m.name
$$;

create or replace function public.can_review_editorial_content(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select lower(coalesce((select u.email from auth.users u where u.id = p_user), '')) in (
    'nathalie.boudehent@eglisemlk.fr',
    'flora.demerle@mlkgrandparis.com'
  )
$$;

alter table public.sessions
  add column if not exists editorial_status text not null default 'draft',
  add column if not exists publication_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists revision_of uuid references public.sessions(id) on delete set null;

alter table public.sessions drop constraint if exists sessions_editorial_status_check;
alter table public.sessions add constraint sessions_editorial_status_check
  check (editorial_status in ('draft', 'pending', 'changes_requested', 'scheduled', 'published', 'superseded'));

-- Les séances historiques déjà publiées restent disponibles. Aucune donnée n'est supprimée.
update public.sessions
set editorial_status = case when coalesce(is_draft, false) then 'draft' else 'published' end,
    publication_at = case when coalesce(is_draft, false) then publication_at else coalesce(publication_at, created_at, now()) end
where session_type = 'ministere'
  and editorial_status = 'draft'
  and (not coalesce(is_draft, false) or publication_at is null);

create index if not exists sessions_ministry_editorial_idx
  on public.sessions(ministry_id, editorial_status, publication_at, session_date)
  where session_type = 'ministere';

create table if not exists public.ministry_course_review_requests (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'changes_requested', 'approved', 'cancelled')),
  resolved_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.ministry_course_annotations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  requires_action boolean not null default false,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ministry_course_annotations_session_idx
  on public.ministry_course_annotations(session_id, created_at);

alter table public.ministry_course_review_requests enable row level security;
alter table public.ministry_course_annotations enable row level security;

create or replace function public.ministry_course_is_visible(s public.sessions)
returns boolean language sql stable set search_path = public as $$
  select s.session_type = 'ministere'
    and (
      s.editorial_status = 'published'
      or (s.editorial_status = 'scheduled' and s.publication_at <= now())
    )
$$;

-- Politique restrictive : même une URL directe vers une séance ou un contenu ne
-- révèle rien avant publication ni à un étudiant d'une autre sensibilité.
drop policy if exists sessions_ministry_editorial_visibility on public.sessions;
create policy sessions_ministry_editorial_visibility on public.sessions
  as restrictive for select to authenticated using (
    session_type <> 'ministere'
    or public.is_platform_admin()
    or public.can_review_editorial_content()
    or public.is_strict_pilotage_for(ministry_id)
    or (
      public.ministry_course_is_visible(sessions)
      and exists(
        select 1 from public.profiles p
        where p.id = auth.uid() and p.ministry_id = sessions.ministry_id
      )
    )
  );

drop policy if exists materials_ministry_editorial_visibility on public.materials;
create policy materials_ministry_editorial_visibility on public.materials
  as restrictive for select to authenticated using (
    exists(
      select 1 from public.sessions s
      where s.id = materials.session_id
        and (
          s.session_type <> 'ministere'
          or public.is_platform_admin()
          or public.can_review_editorial_content()
          or public.is_strict_pilotage_for(s.ministry_id)
          or (public.ministry_course_is_visible(s) and exists(
            select 1 from public.profiles p where p.id = auth.uid() and p.ministry_id = s.ministry_id
          ))
        )
    )
  );

drop policy if exists assignments_ministry_editorial_visibility on public.assignments;
create policy assignments_ministry_editorial_visibility on public.assignments
  as restrictive for select to authenticated using (
    exists(
      select 1 from public.sessions s
      where s.id = assignments.session_id
        and (
          s.session_type <> 'ministere'
          or public.is_platform_admin()
          or public.can_review_editorial_content()
          or public.is_strict_pilotage_for(s.ministry_id)
          or (public.ministry_course_is_visible(s) and exists(
            select 1 from public.profiles p where p.id = auth.uid() and p.ministry_id = s.ministry_id
          ))
        )
    )
  );

drop policy if exists videos_ministry_editorial_visibility on public.session_videos;
create policy videos_ministry_editorial_visibility on public.session_videos
  as restrictive for select to authenticated using (
    exists(
      select 1 from public.sessions s
      where s.id = session_videos.session_id
        and (
          s.session_type <> 'ministere'
          or public.is_platform_admin()
          or public.can_review_editorial_content()
          or public.is_strict_pilotage_for(s.ministry_id)
          or (public.ministry_course_is_visible(s) and exists(
            select 1 from public.profiles p where p.id = auth.uid() and p.ministry_id = s.ministry_id
          ))
        )
    )
  );

create or replace function public.create_ministry_course(
  p_ministry uuid, p_title text, p_session_date date, p_location text,
  p_room text default null, p_speaker text default null,
  p_summary text default null, p_objectives text default null,
  p_show_parking boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_strict_pilotage_for(p_ministry) then raise exception 'FORBIDDEN'; end if;
  if p_session_date < date '2027-01-01' or extract(isodow from p_session_date) <> 6 then
    raise exception 'INVALID_MINISTRY_TRAINING_DAY';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_location), '') = '' then
    raise exception 'REQUIRED_FIELDS';
  end if;
  insert into public.sessions(
    session_type, ministry_id, session_date, start_time, end_time, location,
    room, day, description, speaker_name, summary, objectives,
    show_parking_notice, is_draft, editorial_status
  ) values (
    'ministere', p_ministry, p_session_date, time '10:30', time '13:00', trim(p_location),
    nullif(trim(p_room), ''), 'samedi', trim(p_title), nullif(trim(p_speaker), ''),
    nullif(trim(p_summary), ''), nullif(trim(p_objectives), ''),
    p_show_parking, true, 'draft'
  ) returning id into v_id;
  return v_id;
end $$;

create or replace function public.submit_ministry_course_review(p_session uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_session public.sessions%rowtype; v_title text; v_reviewer record;
begin
  select * into v_session from public.sessions where id = p_session for update;
  if not found or v_session.session_type <> 'ministere' or not public.is_strict_pilotage_for(v_session.ministry_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_session.editorial_status in ('published', 'scheduled', 'superseded') then
    raise exception 'REVISION_REQUIRED';
  end if;
  insert into public.ministry_course_review_requests(session_id, requested_by, requested_at, status, resolved_at, reviewed_by, updated_at)
  values(p_session, auth.uid(), now(), 'pending', null, null, now())
  on conflict(session_id) do update set requested_by = excluded.requested_by,
    requested_at = now(), status = 'pending', resolved_at = null, reviewed_by = null, updated_at = now();
  update public.ministry_course_annotations
    set resolved_at = now(), resolved_by = auth.uid()
    where session_id = p_session and requires_action and resolved_at is null;
  update public.sessions set editorial_status = 'pending', submitted_at = now(), submitted_by = auth.uid(),
    is_draft = true where id = p_session;

  select description into v_title from public.sessions where id = p_session;
  for v_reviewer in
    select p.id from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) in ('nathalie.boudehent@eglisemlk.fr', 'flora.demerle@mlkgrandparis.com')
  loop
    insert into public.announcements(
      title, body, author_id, recipient_id, session_id, is_system,
      target_url, target_type, target_id, cta_label
    ) values (
      'Cours ministériel à valider : ' || coalesce(v_title, 'Sans titre'),
      'Ce cours attend votre validation avant publication.', auth.uid(), v_reviewer.id, p_session, true,
      '/gestion/a-valider?onglet=cours', 'ministry_course_review_required', p_session, 'Examiner le cours'
    );
  end loop;
end $$;

create or replace function public.review_ministry_course(
  p_session uuid, p_decision text, p_message text default null,
  p_publish_mode text default null, p_publish_at timestamptz default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare v_request public.ministry_course_review_requests%rowtype; v_session public.sessions%rowtype; v_person record;
begin
  if not public.can_review_editorial_content() then raise exception 'FORBIDDEN'; end if;
  select * into v_request from public.ministry_course_review_requests where session_id = p_session for update;
  select * into v_session from public.sessions where id = p_session for update;
  if not found or v_request.status <> 'pending' or v_session.editorial_status <> 'pending' then
    raise exception 'NO_PENDING_REVIEW';
  end if;
  if p_decision = 'changes_requested' then
    if coalesce(trim(p_message), '') = '' then raise exception 'MESSAGE_REQUIRED'; end if;
    insert into public.ministry_course_annotations(session_id, author_id, body, requires_action)
      values(p_session, auth.uid(), trim(p_message), true);
    update public.ministry_course_review_requests set status = 'changes_requested', resolved_at = now(),
      reviewed_by = auth.uid(), updated_at = now() where session_id = p_session;
    update public.sessions set editorial_status = 'changes_requested', is_draft = true where id = p_session;
    for v_person in
      select distinct person_id from (
        select p.id person_id from public.profiles p where p.ministry_lead_of = v_session.ministry_id
        union select d.user_id from public.ministry_delegates d where d.ministry_id = v_session.ministry_id
      ) people
    loop
      insert into public.announcements(title, body, author_id, recipient_id, session_id, is_system,
        target_url, target_type, target_id, cta_label)
      values('Corrections demandées : ' || coalesce(v_session.description, 'Cours ministériel'), trim(p_message),
        auth.uid(), v_person.person_id, p_session, true,
        '/gestion/pilotage/preparation/' || p_session::text, 'ministry_course_changes_requested', p_session, 'Voir les corrections');
    end loop;
    return;
  end if;
  if p_decision <> 'approve' or p_publish_mode not in ('now', 'scheduled') then raise exception 'INVALID_DECISION'; end if;
  if p_publish_mode = 'scheduled' and (p_publish_at is null or p_publish_at <= now()) then raise exception 'INVALID_SCHEDULE'; end if;
  update public.ministry_course_review_requests set status = 'approved', resolved_at = now(),
    reviewed_by = auth.uid(), updated_at = now() where session_id = p_session;
  if v_session.revision_of is not null then
    update public.sessions set editorial_status = 'superseded', is_draft = true
      where id = v_session.revision_of and session_type = 'ministere';
  end if;
  update public.sessions set
    editorial_status = case when p_publish_mode = 'now' then 'published' else 'scheduled' end,
    publication_at = case when p_publish_mode = 'now' then now() else p_publish_at end,
    approved_at = now(), approved_by = auth.uid(), is_draft = false
  where id = p_session;
end $$;

create or replace function public.add_ministry_course_annotation(p_session uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ministry uuid;
begin
  select ministry_id into v_ministry from public.sessions where id = p_session and session_type = 'ministere';
  if v_ministry is null or not (public.can_review_editorial_content() or public.is_strict_pilotage_for(v_ministry)) then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.ministry_course_annotations(session_id, author_id, body, requires_action)
  values(p_session, auth.uid(), trim(p_body), false);
end $$;

create or replace function public.ministry_course_review_state(p_session uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ministry uuid; v_result jsonb;
begin
  select ministry_id into v_ministry from public.sessions where id = p_session and session_type = 'ministere';
  if v_ministry is null or not (
    public.can_review_editorial_content() or public.is_strict_pilotage_for(v_ministry) or public.is_platform_admin()
  ) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'status', s.editorial_status,
    'publicationAt', s.publication_at,
    'submittedAt', s.submitted_at,
    'canSubmit', public.is_strict_pilotage_for(s.ministry_id),
    'canDecide', public.can_review_editorial_content(),
    'annotations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'body', a.body, 'requiresAction', a.requires_action,
        'resolvedAt', a.resolved_at, 'createdAt', a.created_at,
        'authorName', coalesce(p.full_name, 'Équipe Ministry School')
      ) order by a.created_at)
      from public.ministry_course_annotations a left join public.profiles p on p.id = a.author_id
      where a.session_id = p_session
    ), '[]'::jsonb)
  ) into v_result from public.sessions s where s.id = p_session;
  return v_result;
end $$;

create or replace function public.validation_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.can_review_editorial_content() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'opportunities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'title', o.title, 'submittedAt', r.requested_at,
        'responsible', coalesce(p.full_name, 'Équipe projet'), 'status', r.status
      ) order by r.requested_at)
      from public.opportunity_review_requests r
      join public.opportunities o on o.id = r.opportunity_id
      left join public.profiles p on p.id = r.requested_by
      where r.status = 'pending'
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', coalesce(s.description, 'Cours sans titre'),
        'submittedAt', r.requested_at, 'responsible', coalesce(p.full_name, 'Responsable ministériel'),
        'ministry', m.name, 'ministrySlug', m.slug, 'status', r.status
      ) order by r.requested_at)
      from public.ministry_course_review_requests r
      join public.sessions s on s.id = r.session_id
      join public.ministries m on m.id = s.ministry_id
      left join public.profiles p on p.id = r.requested_by
      where r.status = 'pending'
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

create or replace function public.clone_ministry_course_revision(p_session uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_source public.sessions%rowtype; v_new uuid; v_assignment record; v_new_assignment uuid;
begin
  select * into v_source from public.sessions where id = p_session for update;
  if not found or v_source.session_type <> 'ministere' or not public.is_strict_pilotage_for(v_source.ministry_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_source.editorial_status not in ('published', 'scheduled') then raise exception 'NOT_PUBLISHED'; end if;
  if exists(select 1 from public.sessions where revision_of = p_session and editorial_status in ('draft','pending','changes_requested')) then
    select id into v_new from public.sessions where revision_of = p_session and editorial_status in ('draft','pending','changes_requested') limit 1;
    return v_new;
  end if;
  insert into public.sessions(
    session_date,start_time,end_time,location,room,day,session_type,ministry_id,description,objectives,
    course_id,teacher_id,speaker_name,track,summary,bible_refs,show_parking_notice,service_id,
    is_draft,editorial_status,revision_of
  ) values (
    v_source.session_date,v_source.start_time,v_source.end_time,v_source.location,v_source.room,v_source.day,
    v_source.session_type,v_source.ministry_id,v_source.description,v_source.objectives,v_source.course_id,
    v_source.teacher_id,v_source.speaker_name,v_source.track,v_source.summary,v_source.bible_refs,
    v_source.show_parking_notice,v_source.service_id,true,'draft',p_session
  ) returning id into v_new;
  insert into public.session_videos(session_id,url,visible_at,updated_at,updated_by)
    select v_new,url,visible_at,now(),auth.uid() from public.session_videos where session_id = p_session;
  insert into public.materials(session_id,title,description,resource_type,link_url,file_url,visible_at,sort_order,created_by)
    select v_new,title,description,resource_type,link_url,file_url,visible_at,sort_order,auth.uid()
    from public.materials where session_id = p_session;
  for v_assignment in select * from public.assignments where session_id = p_session order by created_at loop
    insert into public.assignments(session_id,title,description,instructions,content_type,resource_url,file_url,phase,sort_order,kind,duration_min,due_at,visible_at,created_by)
    values(v_new,v_assignment.title,v_assignment.description,v_assignment.instructions,v_assignment.content_type,
      v_assignment.resource_url,v_assignment.file_url,v_assignment.phase,v_assignment.sort_order,v_assignment.kind,
      v_assignment.duration_min,v_assignment.due_at,v_assignment.visible_at,auth.uid()) returning id into v_new_assignment;
    insert into public.assignment_steps(assignment_id,title,instructions,sort_order)
      select v_new_assignment,title,instructions,sort_order from public.assignment_steps where assignment_id = v_assignment.id;
  end loop;
  insert into public.session_trainers(session_id,trainer_id,position)
    select v_new,trainer_id,position from public.session_trainers where session_id = p_session;
  return v_new;
end $$;

-- Le viewer ne dérive plus le pilotage du rôle administrateur.
create or replace function public.student_viewer_context()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'full_name', p.full_name, 'role', p.role, 'is_teacher', p.is_teacher,
    'deactivated', p.deactivated, 'avatar_path', p.avatar_path, 'created_at', p.created_at,
    'preferred_day', p.preferred_day, 'ministry_id', p.ministry_id,
    'notifications_seen_at', p.notifications_seen_at, 'notification_prefs', p.notification_prefs,
    'welcome_seen_at', p.welcome_seen_at, 'is_service_lead', p.is_service_lead,
    'is_project_lead', p.is_project_lead, 'ministry_slug', m.slug, 'ministry_name', m.name,
    'steering_ministry_ids', coalesce((select jsonb_agg(x.ministry_id) from public.strict_pilotage_ministries() x), '[]'::jsonb),
    'editorial_reviewer', public.can_review_editorial_content(),
    'course_notes_enabled', exists(select 1 from public.feature_preview_users f where f.feature_key = 'course_notes' and f.user_id = auth.uid()),
    'unread_messages', coalesce((select count(*) from public.announcements a where a.created_at > coalesce(p.notifications_seen_at, '1970-01-01'::timestamptz)), 0)
      + case when p.created_at >= coalesce(p.notifications_seen_at, '1970-01-01'::timestamptz)
        then coalesce((select count(*) from public.announcements a where a.is_welcome = true), 0) else 0 end
  )
  from public.profiles p left join public.ministries m on m.id = p.ministry_id
  where p.id = auth.uid()
$$;

revoke all on function public.student_viewer_context() from public;
grant execute on function public.student_viewer_context() to authenticated;
grant execute on function public.is_strict_pilotage_for(uuid,uuid) to authenticated;
grant execute on function public.strict_pilotage_ministries() to authenticated;
grant execute on function public.can_review_editorial_content(uuid) to authenticated;
grant execute on function public.create_ministry_course(uuid,text,date,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.submit_ministry_course_review(uuid) to authenticated;
grant execute on function public.review_ministry_course(uuid,text,text,text,timestamptz) to authenticated;
grant execute on function public.add_ministry_course_annotation(uuid,text) to authenticated;
grant execute on function public.ministry_course_review_state(uuid) to authenticated;
grant execute on function public.validation_queue() to authenticated;
grant execute on function public.clone_ministry_course_revision(uuid) to authenticated;

commit;
