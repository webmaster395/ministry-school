begin;

-- Statistiques agrégées des projets et formations. Cette RPC donne aux
-- administrateurs une vision de pilotage sans leur accorder les droits de
-- consultation ou de modification des fiches de gestion.
create or replace function public.admin_opportunity_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  with initiatives as (
    select
      o.id,
      o.title,
      o.is_project,
      o.is_training,
      case
        when o.archived_at is not null or o.publication_status = 'archived' then 'archived'
        when review.status = 'pending' then 'pending'
        when review.status = 'changes_requested' then 'changes_requested'
        when dates.last_date < current_date and dates.session_count > 0 then 'past'
        else o.publication_status
      end as status,
      coalesce(dates.session_count, 0)::integer as session_count,
      coalesce(dates.capacity, 0)::integer as capacity,
      coalesce(dates.sessions_with_capacity, 0)::integer as sessions_with_capacity,
      coalesce(dates.registrations, 0)::integer as registrations,
      coalesce(dates.participants, 0)::integer as participants,
      coalesce(resources.resource_count, 0)::integer as resource_count
    from public.opportunities o
    left join public.opportunity_review_requests review on review.opportunity_id = o.id
    left join lateral (
      select
        count(*) as session_count,
        max(d.session_date) as last_date,
        coalesce(sum(d.capacity) filter (where d.capacity is not null), 0) as capacity,
        count(*) filter (where d.capacity is not null) as sessions_with_capacity,
        (select count(*)
          from public.opportunity_date_registrations registration
          join public.opportunity_dates registered_date on registered_date.id = registration.opportunity_date_id
          where registered_date.opportunity_id = o.id) as registrations,
        (select count(distinct registration.user_id)
          from public.opportunity_date_registrations registration
          join public.opportunity_dates registered_date on registered_date.id = registration.opportunity_date_id
          where registered_date.opportunity_id = o.id) as participants
      from public.opportunity_dates d
      where d.opportunity_id = o.id
    ) dates on true
    left join lateral (
      select count(*) as resource_count
      from public.opportunity_resources resource
      where resource.opportunity_id = o.id
    ) resources on true
  )
  select jsonb_build_object(
    'total', count(*),
    'projects', count(*) filter (where is_project and not is_training),
    'trainings', count(*) filter (where is_training and not is_project),
    'combined', count(*) filter (where is_project and is_training),
    'draft', count(*) filter (where status in ('draft', 'unpublished')),
    'pending', count(*) filter (where status = 'pending'),
    'changesRequested', count(*) filter (where status = 'changes_requested'),
    'scheduled', count(*) filter (where status = 'scheduled'),
    'published', count(*) filter (where status = 'published'),
    'past', count(*) filter (where status = 'past'),
    'archived', count(*) filter (where status = 'archived'),
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
      'id', id,
      'title', title,
      'type', case when is_project and is_training then 'both' when is_project then 'project' else 'training' end,
      'status', status,
      'sessions', session_count,
      'capacity', capacity,
      'registrations', registrations,
      'participants', participants,
      'resources', resource_count
    ) order by registrations desc, title) filter (where status <> 'archived'), '[]'::jsonb)
  ) into result
  from initiatives;

  return result;
end;
$$;

revoke all on function public.admin_opportunity_analytics() from public;
grant execute on function public.admin_opportunity_analytics() to authenticated;

-- Un contributeur peut compléter les cours de son périmètre, mais la création
-- d'un nouveau cours est réservée au responsable explicitement désigné. Les
-- super administratrices conservent leur droit global de correction.
create or replace function public.create_ministry_course(
  p_ministry uuid, p_title text, p_session_date date, p_location text,
  p_room text default null, p_speaker text default null,
  p_summary text default null, p_objectives text default null,
  p_show_parking boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not (
    public.is_super_admin()
    or exists (
      select 1 from public.profiles profile
      where profile.id = auth.uid() and profile.ministry_lead_of = p_ministry
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (
    select 1 from public.ministries ministry
    where ministry.id = p_ministry
      and ministry.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
  ) then
    raise exception 'FORBIDDEN';
  end if;
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

commit;
