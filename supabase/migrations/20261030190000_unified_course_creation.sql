begin;

-- Un cours pédagogique peut appartenir à une initiative sans dupliquer les
-- séances d'inscription propres à l'initiative.
alter table public.sessions
  add column if not exists opportunity_id uuid references public.opportunities(id) on delete set null;

create index if not exists sessions_opportunity_id_idx
  on public.sessions(opportunity_id, session_date);

-- Les cours internes rattachés aux initiatives ne rejoignent pas implicitement
-- l'espace étudiant : cette intervention ne change aucun parcours étudiant.
drop policy if exists "sessions readable by authenticated" on public.sessions;
create policy sessions_readable_by_authenticated on public.sessions for select to authenticated
using (
  opportunity_id is null
  or public.is_platform_admin()
  or public.can_view_opportunity(opportunity_id)
);

drop policy if exists materials_opportunity_visibility on public.materials;
create policy materials_opportunity_visibility on public.materials
  as restrictive for select to authenticated using (exists(
    select 1 from public.sessions session where session.id=materials.session_id
      and (session.opportunity_id is null or public.is_platform_admin() or public.can_view_opportunity(session.opportunity_id))
  ));
drop policy if exists assignments_opportunity_visibility on public.assignments;
create policy assignments_opportunity_visibility on public.assignments
  as restrictive for select to authenticated using (exists(
    select 1 from public.sessions session where session.id=assignments.session_id
      and (session.opportunity_id is null or public.is_platform_admin() or public.can_view_opportunity(session.opportunity_id))
  ));
drop policy if exists session_videos_opportunity_visibility on public.session_videos;
create policy session_videos_opportunity_visibility on public.session_videos
  as restrictive for select to authenticated using (exists(
    select 1 from public.sessions session where session.id=session_videos.session_id
      and (session.opportunity_id is null or public.is_platform_admin() or public.can_view_opportunity(session.opportunity_id))
  ));
drop policy if exists assignment_steps_opportunity_visibility on public.assignment_steps;
create policy assignment_steps_opportunity_visibility on public.assignment_steps
  as restrictive for select to authenticated using (exists(
    select 1 from public.assignments assignment join public.sessions session on session.id=assignment.session_id
    where assignment.id=assignment_steps.assignment_id
      and (session.opportunity_id is null or public.is_platform_admin() or public.can_view_opportunity(session.opportunity_id))
  ));

-- Le nom historique est conservé car toutes les écritures pédagogiques
-- l'utilisent déjà. Il couvre désormais les deux périmètres opérationnels.
create or replace function public.can_edit_ministry_course(
  p_session uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.sessions session
    where session.id = p_session
      and (
        (
          session.session_type = 'ministere'
          and (
            public.is_ministry_lead_for(session.ministry_id, p_user)
            or exists(
              select 1 from public.ministry_delegates delegate
              where delegate.user_id = p_user
                and delegate.ministry_id = session.ministry_id
                and delegate.can_edit
            )
          )
        )
        or (
          session.opportunity_id is not null
          and public.can_edit_opportunity(session.opportunity_id, p_user)
        )
      )
  )
$$;

create or replace function public.can_view_managed_course(
  p_session uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin(p_user) or exists(
    select 1 from public.sessions session
    where session.id=p_session and (
      (session.session_type='ministere' and public.is_strict_pilotage_for(session.ministry_id,p_user))
      or (session.opportunity_id is not null and public.can_view_opportunity(session.opportunity_id,p_user))
    )
  )
$$;

-- Création atomique : l'identité du parent et les horaires imposés sont
-- dérivés côté base, jamais approuvés sur la seule foi du formulaire.
create or replace function public.create_course_draft(
  p_context text,
  p_parent uuid,
  p_payload jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_title text := trim(coalesce(p_payload->>'title',''));
  v_date date;
  v_start time;
  v_end time;
  v_location text := trim(coalesce(p_payload->>'location',''));
  v_ministry uuid;
  v_opportunity uuid;
  v_course uuid;
  v_session uuid;
  v_trainer uuid;
  v_teacher uuid;
  v_track text;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN'; end if;
  begin v_date := (p_payload->>'session_date')::date; exception when others then raise exception 'REQUIRED_FIELDS'; end;
  if v_title='' or v_location='' or v_date is null then raise exception 'REQUIRED_FIELDS'; end if;

  if p_context='admin' then
    if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
    v_track := nullif(trim(coalesce(p_payload->>'track','')), '');
    if v_track='Sensibilité ministérielle' then
      begin v_ministry := nullif(p_payload->>'ministry_id','')::uuid; exception when others then raise exception 'FORBIDDEN'; end;
      if not exists(select 1 from public.ministries where id=v_ministry) then raise exception 'FORBIDDEN'; end if;
    end if;
  elsif p_context='ministry' then
    v_ministry := p_parent;
    if not public.is_ministry_lead_for(v_ministry) then raise exception 'FORBIDDEN'; end if;
    if not exists(select 1 from public.ministries where id=v_ministry and slug in ('apotre','prophete','evangeliste','pasteur','docteur')) then raise exception 'FORBIDDEN'; end if;
    if v_date<date '2027-01-01' or extract(isodow from v_date)<>6 then raise exception 'INVALID_MINISTRY_TRAINING_DAY'; end if;
    v_track := 'Sensibilité ministérielle';
  elsif p_context='opportunity' then
    v_opportunity := p_parent;
    if not public.can_submit_opportunity(v_opportunity) then raise exception 'FORBIDDEN'; end if;
    if not exists(select 1 from public.opportunities where id=v_opportunity) then raise exception 'FORBIDDEN'; end if;
    select case when is_project and is_training then 'Projet et formation' when is_training then 'Formation' else 'Projet' end
      into v_track from public.opportunities where id=v_opportunity;
  else
    raise exception 'FORBIDDEN';
  end if;

  if p_context='ministry' then
    v_start := time '10:30'; v_end := time '13:00';
  else
    begin
      v_start := (p_payload->>'start_time')::time;
      v_end := (p_payload->>'end_time')::time;
    exception when others then raise exception 'INVALID_TIME'; end;
    if v_start is null or v_end is null or v_end<=v_start then raise exception 'INVALID_TIME'; end if;
  end if;

  begin v_trainer := nullif(p_payload->>'trainer_id','')::uuid; exception when others then v_trainer := null; end;
  if v_trainer is not null then
    select profile_id into v_teacher from public.trainers where id=v_trainer and is_active=true;
    if not found then raise exception 'INVALID_TRAINER'; end if;
  end if;

  insert into public.courses(title,ministry_id,description,objectives)
  values(v_title,v_ministry,nullif(trim(coalesce(p_payload->>'summary','')),''),nullif(trim(coalesce(p_payload->>'objectives','')),''))
  returning id into v_course;

  insert into public.sessions(
    session_type,ministry_id,opportunity_id,course_id,teacher_id,session_date,
    start_time,end_time,location,room,day,description,track,speaker_name,
    summary,objectives,bible_refs,show_parking_notice,is_draft,editorial_status
  ) values(
    case when v_ministry is not null then 'ministere' else 'commun' end,
    v_ministry,v_opportunity,v_course,v_teacher,v_date,v_start,v_end,v_location,
    nullif(trim(coalesce(p_payload->>'room','')),''),
    case when extract(isodow from v_date)=7 then 'dimanche' else 'samedi' end,
    v_title,v_track,nullif(trim(coalesce(p_payload->>'speaker_name','')),''),
    nullif(trim(coalesce(p_payload->>'summary','')),''),
    nullif(trim(coalesce(p_payload->>'objectives','')),''),
    nullif(trim(coalesce(p_payload->>'bible_refs','')),''),
    coalesce((p_payload->>'show_parking_notice')::boolean,false),true,'draft'
  ) returning id into v_session;

  if v_trainer is not null then
    insert into public.session_trainers(session_id,trainer_id,position) values(v_session,v_trainer,0);
  end if;
  return v_session;
end $$;

-- Les mêmes règles RLS couvrent maintenant les contenus des cours rattachés à
-- une initiative. Les super admins continuent à agir depuis Admin.
drop policy if exists sessions_strict_insert on public.sessions;
create policy sessions_strict_insert on public.sessions for insert to authenticated
with check (
  public.is_platform_admin()
  or (session_type='ministere' and public.is_ministry_lead_for(ministry_id))
  or (opportunity_id is not null and public.can_submit_opportunity(opportunity_id))
);

drop policy if exists sessions_strict_update on public.sessions;
create policy sessions_strict_update on public.sessions for update to authenticated
using (public.is_platform_admin() or public.can_edit_ministry_course(id))
with check (public.is_platform_admin() or public.can_edit_ministry_course(id));

drop policy if exists sessions_strict_delete on public.sessions;
create policy sessions_strict_delete on public.sessions for delete to authenticated
using (
  public.is_platform_admin()
  or (session_type='ministere' and public.is_ministry_lead_for(ministry_id))
  or (opportunity_id is not null and public.can_submit_opportunity(opportunity_id))
);

-- Le circuit éditorial existant devient commun aux cours ministériels et aux
-- cours d'initiative. Aucune annonce immédiate n'est créée par ces mutations.
create or replace function public.submit_ministry_course_review(p_session uuid)
returns void language plpgsql security definer set search_path = public,auth as $$
declare session_row public.sessions%rowtype;
begin
  select * into session_row from public.sessions where id=p_session for update;
  if not found or not (
    (session_row.session_type='ministere' and public.is_ministry_lead_for(session_row.ministry_id))
    or (session_row.opportunity_id is not null and public.can_submit_opportunity(session_row.opportunity_id))
  ) then raise exception 'FORBIDDEN'; end if;
  if session_row.editorial_status in ('published','scheduled','superseded') then raise exception 'REVISION_REQUIRED'; end if;
  insert into public.ministry_course_review_requests(session_id,requested_by,requested_at,status,resolved_at,reviewed_by,updated_at)
  values(p_session,auth.uid(),now(),'pending',null,null,now())
  on conflict(session_id) do update set requested_by=excluded.requested_by,requested_at=now(),status='pending',resolved_at=null,reviewed_by=null,updated_at=now();
  update public.ministry_course_annotations set resolved_at=now(),resolved_by=auth.uid()
    where session_id=p_session and requires_action and resolved_at is null;
  update public.sessions set editorial_status='pending',submitted_at=now(),submitted_by=auth.uid(),is_draft=true where id=p_session;
end $$;

create or replace function public.ministry_course_review_state(p_session uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare session_row public.sessions%rowtype; result jsonb;
begin
  select * into session_row from public.sessions where id=p_session;
  if not found or not (
    public.is_platform_admin()
    or (session_row.session_type='ministere' and public.is_strict_pilotage_for(session_row.ministry_id))
    or (session_row.opportunity_id is not null and public.can_view_opportunity(session_row.opportunity_id))
  ) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'status',session.editorial_status,'publicationAt',session.publication_at,
    'submittedAt',session.submitted_at,
    'canSubmit',(
      (session.session_type='ministere' and public.is_ministry_lead_for(session.ministry_id))
      or (session.opportunity_id is not null and public.can_submit_opportunity(session.opportunity_id))
    ),
    'canDecide',public.is_super_admin(),
    'annotations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',annotation.id,'body',annotation.body,'requiresAction',annotation.requires_action,
      'resolvedAt',annotation.resolved_at,'createdAt',annotation.created_at,
      'authorName',coalesce(profile.full_name,'Équipe Ministry School')) order by annotation.created_at)
      from public.ministry_course_annotations annotation left join public.profiles profile on profile.id=annotation.author_id
      where annotation.session_id=p_session),'[]'::jsonb)
  ) into result from public.sessions session where session.id=p_session;
  return result;
end $$;

create or replace function public.add_ministry_course_annotation(p_session uuid,p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare session_row public.sessions%rowtype;
begin
  select * into session_row from public.sessions where id=p_session;
  if not found or not (
    public.is_super_admin()
    or (session_row.session_type='ministere' and public.is_ministry_lead_for(session_row.ministry_id))
    or (session_row.opportunity_id is not null and public.can_submit_opportunity(session_row.opportunity_id))
  ) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_body),'')='' then raise exception 'MESSAGE_REQUIRED'; end if;
  insert into public.ministry_course_annotations(session_id,author_id,body,requires_action)
  values(p_session,auth.uid(),trim(p_body),false);
end $$;

create or replace function public.review_ministry_course(
  p_session uuid,p_decision text,p_message text default null,
  p_publish_mode text default null,p_publish_at timestamptz default null
) returns void language plpgsql security definer set search_path = public,auth as $$
declare request_row public.ministry_course_review_requests%rowtype; session_row public.sessions%rowtype;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select * into request_row from public.ministry_course_review_requests where session_id=p_session for update;
  select * into session_row from public.sessions where id=p_session for update;
  if not found or request_row.status<>'pending' or session_row.editorial_status<>'pending' then raise exception 'NO_PENDING_REVIEW'; end if;
  if p_decision='changes_requested' then
    if coalesce(trim(p_message),'')='' then raise exception 'MESSAGE_REQUIRED'; end if;
    insert into public.ministry_course_annotations(session_id,author_id,body,requires_action) values(p_session,auth.uid(),trim(p_message),true);
    update public.ministry_course_review_requests set status='changes_requested',resolved_at=now(),reviewed_by=auth.uid(),updated_at=now() where session_id=p_session;
    update public.sessions set editorial_status='changes_requested',is_draft=true where id=p_session;
    return;
  end if;
  if p_decision<>'approve' or p_publish_mode not in ('now','scheduled') then raise exception 'INVALID_DECISION'; end if;
  if p_publish_mode='scheduled' and (p_publish_at is null or p_publish_at<=now()) then raise exception 'INVALID_SCHEDULE'; end if;
  update public.ministry_course_review_requests set status='approved',resolved_at=now(),reviewed_by=auth.uid(),updated_at=now() where session_id=p_session;
  if session_row.revision_of is not null then update public.sessions set editorial_status='superseded',is_draft=true where id=session_row.revision_of; end if;
  update public.sessions set editorial_status=case when p_publish_mode='now' then 'published' else 'scheduled' end,
    publication_at=case when p_publish_mode='now' then now() else p_publish_at end,
    approved_at=now(),approved_by=auth.uid(),is_draft=false where id=p_session;
end $$;

-- La file de validation conserve une seule entrée par cours et accepte un
-- libellé d'initiative lorsque le cours n'appartient pas à un ministère.
create or replace function public.validation_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'opportunities',coalesce((select jsonb_agg(jsonb_build_object(
      'id',opportunity.id,'title',opportunity.title,'submittedAt',request.requested_at,
      'responsible',coalesce(profile.full_name,'Équipe projet'),'status',request.status,
      'contentType',case when opportunity.is_project and opportunity.is_training then 'both' when opportunity.is_project then 'project' else 'training' end
    ) order by request.requested_at) from public.opportunity_review_requests request
      join public.opportunities opportunity on opportunity.id=request.opportunity_id
      left join public.profiles profile on profile.id=request.requested_by where request.status='pending'),'[]'::jsonb),
    'courses',coalesce((select jsonb_agg(jsonb_build_object(
      'id',session.id,'title',coalesce(session.description,'Cours sans titre'),'submittedAt',request.requested_at,
      'responsible',coalesce(profile.full_name,'Responsable'),'ministry',coalesce(ministry.name,opportunity.title),
      'ministrySlug',ministry.slug,'status',request.status,'contentType','course'
    ) order by request.requested_at) from public.ministry_course_review_requests request
      join public.sessions session on session.id=request.session_id
      left join public.ministries ministry on ministry.id=session.ministry_id
      left join public.opportunities opportunity on opportunity.id=session.opportunity_id
      left join public.profiles profile on profile.id=request.requested_by where request.status='pending'),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(row_to_json(history_row) order by history_row."decidedAt" desc) from (
      select opportunity.id,opportunity.title,request.requested_at as "submittedAt",
        coalesce(requester.full_name,'Équipe projet') as responsible,request.status,
        case when opportunity.is_project and opportunity.is_training then 'both' when opportunity.is_project then 'project' else 'training' end as "contentType",
        request.resolved_at as "decidedAt",reviewer.full_name as reviewer,
        null::text as ministry,null::text as "ministrySlug"
      from public.opportunity_review_requests request
      join public.opportunities opportunity on opportunity.id=request.opportunity_id
      left join public.profiles requester on requester.id=request.requested_by
      left join public.profiles reviewer on reviewer.id=request.resolved_by
      where request.status in ('approved','changes_requested')
      union all
      select session.id,coalesce(session.description,'Cours sans titre'),request.requested_at,
        coalesce(requester.full_name,'Responsable'),request.status,'course',request.resolved_at,
        reviewer.full_name,coalesce(ministry.name,opportunity.title),ministry.slug
      from public.ministry_course_review_requests request
      join public.sessions session on session.id=request.session_id
      left join public.ministries ministry on ministry.id=session.ministry_id
      left join public.opportunities opportunity on opportunity.id=session.opportunity_id
      left join public.profiles requester on requester.id=request.requested_by
      left join public.profiles reviewer on reviewer.id=request.reviewed_by
      where request.status in ('approved','changes_requested')
    ) history_row),'[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.create_course_draft(text,uuid,jsonb) from public;
revoke all on function public.can_view_managed_course(uuid,uuid) from public;
grant execute on function public.create_course_draft(text,uuid,jsonb) to authenticated;
grant execute on function public.can_view_managed_course(uuid,uuid) to authenticated;
grant execute on function public.can_edit_ministry_course(uuid,uuid) to authenticated;

commit;
