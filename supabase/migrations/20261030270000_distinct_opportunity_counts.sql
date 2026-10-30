begin;

-- Une initiative combinée reste une seule ressource métier. Les anciennes
-- demandes de cours qui pointaient vers cette même initiative sont conservées,
-- mais sorties de la file active afin de ne plus créer une seconde validation.
update public.ministry_course_review_requests request
set status = 'cancelled',
    resolved_at = coalesce(request.resolved_at, now()),
    updated_at = now()
from public.sessions session
where session.id = request.session_id
  and session.opportunity_id is not null
  and request.status = 'pending';

-- Le badge global compte des identifiants distincts. Les cours ministériels
-- restent une famille indépendante ; les anciens cours associés à une
-- initiative ne sont jamais additionnés à sa demande de validation.
create or replace function public.pending_validation_count()
returns integer language sql stable security definer set search_path = public as $$
  select case when public.is_super_admin() then
    (
      (select count(distinct request.opportunity_id)
       from public.opportunity_review_requests request
       where request.status = 'pending')
      +
      (select count(distinct request.session_id)
       from public.ministry_course_review_requests request
       join public.sessions session on session.id = request.session_id
       where request.status = 'pending'
         and session.opportunity_id is null)
    )::integer
  else 0 end
$$;

-- Les soumissions de cours sont réservées aux véritables cours ministériels.
-- Une initiative utilise exclusivement opportunity_review_requests, dont la
-- clé primaire opportunity_id garantit une seule demande courante.
create or replace function public.submit_ministry_course_review(p_session uuid)
returns void language plpgsql security definer set search_path = public,auth as $$
declare session_row public.sessions%rowtype;
begin
  select * into session_row from public.sessions where id = p_session for update;
  if not found
    or session_row.opportunity_id is not null
    or session_row.session_type <> 'ministere'
    or not public.is_ministry_lead_for(session_row.ministry_id)
  then
    raise exception 'FORBIDDEN';
  end if;
  if session_row.editorial_status in ('published','scheduled','superseded') then
    raise exception 'REVISION_REQUIRED';
  end if;
  insert into public.ministry_course_review_requests(
    session_id, requested_by, requested_at, status, resolved_at, reviewed_by, updated_at
  ) values (
    p_session, auth.uid(), now(), 'pending', null, null, now()
  )
  on conflict(session_id) do update set
    requested_by = excluded.requested_by,
    requested_at = now(),
    status = 'pending',
    resolved_at = null,
    reviewed_by = null,
    updated_at = now();
  update public.ministry_course_annotations
  set resolved_at = now(), resolved_by = auth.uid()
  where session_id = p_session and requires_action and resolved_at is null;
  update public.sessions
  set editorial_status = 'pending', submitted_at = now(), submitted_by = auth.uid(), is_draft = true
  where id = p_session;
end
$$;

-- La file renvoie une seule ligne par identifiant. Un élément mixte conserve
-- contentType=both : il est filtrable dans les deux catégories, sans être
-- dupliqué dans « Tout » ni dans le badge global.
create or replace function public.validation_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'opportunities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', row.id, 'title', row.title, 'submittedAt', row.requested_at,
        'responsible', row.responsible, 'status', row.status,
        'contentType', row.content_type
      ) order by row.requested_at)
      from (
        select distinct on (opportunity.id)
          opportunity.id, opportunity.title, request.requested_at,
          coalesce(profile.full_name, 'Équipe projet') as responsible,
          request.status,
          case
            when opportunity.is_project and opportunity.is_training then 'both'
            when opportunity.is_project then 'project'
            else 'training'
          end as content_type
        from public.opportunity_review_requests request
        join public.opportunities opportunity on opportunity.id = request.opportunity_id
        left join public.profiles profile on profile.id = request.requested_by
        where request.status = 'pending'
        order by opportunity.id, request.requested_at desc
      ) row
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', row.id, 'title', row.title, 'submittedAt', row.requested_at,
        'responsible', row.responsible, 'ministry', row.ministry,
        'ministrySlug', row.ministry_slug, 'status', row.status,
        'contentType', 'course', 'opportunityId', null
      ) order by row.requested_at)
      from (
        select distinct on (session.id)
          session.id, coalesce(session.description, 'Cours sans titre') as title,
          request.requested_at, coalesce(profile.full_name, 'Responsable') as responsible,
          ministry.name as ministry, ministry.slug as ministry_slug, request.status
        from public.ministry_course_review_requests request
        join public.sessions session on session.id = request.session_id
        join public.ministries ministry on ministry.id = session.ministry_id
        left join public.profiles profile on profile.id = request.requested_by
        where request.status = 'pending'
          and session.opportunity_id is null
        order by session.id, request.requested_at desc
      ) row
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(row_to_json(history_row) order by history_row."decidedAt" desc)
      from (
        select opportunity.id, opportunity.title, request.requested_at as "submittedAt",
          coalesce(requester.full_name, 'Équipe projet') as responsible, request.status,
          case
            when opportunity.is_project and opportunity.is_training then 'both'
            when opportunity.is_project then 'project'
            else 'training'
          end as "contentType",
          request.resolved_at as "decidedAt", reviewer.full_name as reviewer,
          null::text as ministry, null::text as "ministrySlug", null::uuid as "opportunityId"
        from public.opportunity_review_requests request
        join public.opportunities opportunity on opportunity.id = request.opportunity_id
        left join public.profiles requester on requester.id = request.requested_by
        left join public.profiles reviewer on reviewer.id = request.resolved_by
        where request.status in ('approved','changes_requested')
        union all
        select session.id, coalesce(session.description, 'Cours sans titre'), request.requested_at,
          coalesce(requester.full_name, 'Responsable'), request.status, 'course',
          request.resolved_at, reviewer.full_name, ministry.name, ministry.slug,
          null::uuid
        from public.ministry_course_review_requests request
        join public.sessions session on session.id = request.session_id
        join public.ministries ministry on ministry.id = session.ministry_id
        left join public.profiles requester on requester.id = request.requested_by
        left join public.profiles reviewer on reviewer.id = request.reviewed_by
        where request.status in ('approved','changes_requested')
          and session.opportunity_id is null
      ) history_row
    ), '[]'::jsonb)
  ) into result;
  return result;
end
$$;

-- Les totaux globaux utilisent l'identifiant de l'initiative. Les compteurs
-- de catégories sont exclusifs (projet, formation, mixte) et ne sont jamais
-- additionnés pour former le total.
create or replace function public.admin_opportunity_analytics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  with initiatives as (
    select distinct on (opportunity.id)
      opportunity.id,
      opportunity.title,
      opportunity.is_project,
      opportunity.is_training,
      case
        when opportunity.archived_at is not null or opportunity.publication_status = 'archived' then 'archived'
        when review.status = 'pending' then 'pending'
        when review.status = 'changes_requested' then 'changes_requested'
        when dates.last_date < current_date and dates.session_count > 0 then 'past'
        else opportunity.publication_status
      end as status,
      coalesce(dates.session_count, 0)::integer as session_count,
      coalesce(dates.capacity, 0)::integer as capacity,
      coalesce(dates.sessions_with_capacity, 0)::integer as sessions_with_capacity,
      coalesce(dates.registrations, 0)::integer as registrations,
      coalesce(dates.participants, 0)::integer as participants,
      coalesce(resources.resource_count, 0)::integer as resource_count
    from public.opportunities opportunity
    left join public.opportunity_review_requests review on review.opportunity_id = opportunity.id
    left join lateral (
      select count(*) as session_count,
        max(date.session_date) as last_date,
        coalesce(sum(date.capacity) filter (where date.capacity is not null), 0) as capacity,
        count(*) filter (where date.capacity is not null) as sessions_with_capacity,
        (select count(*) from public.opportunity_date_registrations registration
          join public.opportunity_dates registered_date on registered_date.id = registration.opportunity_date_id
          where registered_date.opportunity_id = opportunity.id) as registrations,
        (select count(distinct registration.user_id) from public.opportunity_date_registrations registration
          join public.opportunity_dates registered_date on registered_date.id = registration.opportunity_date_id
          where registered_date.opportunity_id = opportunity.id) as participants
      from public.opportunity_dates date
      where date.opportunity_id = opportunity.id
    ) dates on true
    left join lateral (
      select count(*) as resource_count
      from public.opportunity_resources resource
      where resource.opportunity_id = opportunity.id
    ) resources on true
    order by opportunity.id
  )
  select jsonb_build_object(
    'total', count(distinct id),
    'projects', count(distinct id) filter (where is_project and not is_training),
    'trainings', count(distinct id) filter (where is_training and not is_project),
    'combined', count(distinct id) filter (where is_project and is_training),
    'draft', count(distinct id) filter (where status in ('draft','unpublished')),
    'pending', count(distinct id) filter (where status = 'pending'),
    'changesRequested', count(distinct id) filter (where status = 'changes_requested'),
    'scheduled', count(distinct id) filter (where status = 'scheduled'),
    'published', count(distinct id) filter (where status = 'published'),
    'past', count(distinct id) filter (where status = 'past'),
    'archived', count(distinct id) filter (where status = 'archived'),
    'sessions', coalesce(sum(session_count), 0),
    'capacity', coalesce(sum(capacity), 0),
    'sessionsWithCapacity', coalesce(sum(sessions_with_capacity), 0),
    'registrations', coalesce(sum(registrations), 0),
    'uniqueParticipants', coalesce((
      select count(distinct registration.user_id)
      from public.opportunity_date_registrations registration
      join public.opportunity_dates date on date.id = registration.opportunity_date_id
    ), 0),
    'resources', coalesce(sum(resource_count), 0),
    'initiatives', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'title', title,
      'type', case when is_project and is_training then 'both' when is_project then 'project' else 'training' end,
      'status', status, 'sessions', session_count, 'capacity', capacity,
      'registrations', registrations, 'participants', participants, 'resources', resource_count
    ) order by registrations desc, title) filter (where status <> 'archived'), '[]'::jsonb)
  ) into result
  from initiatives;
  return result;
end
$$;

revoke all on function public.pending_validation_count() from public;
revoke all on function public.validation_queue() from public;
revoke all on function public.submit_ministry_course_review(uuid) from public;
revoke all on function public.admin_opportunity_analytics() from public;
grant execute on function public.pending_validation_count() to authenticated;
grant execute on function public.validation_queue() to authenticated;
grant execute on function public.submit_ministry_course_review(uuid) to authenticated;
grant execute on function public.admin_opportunity_analytics() to authenticated;

commit;
