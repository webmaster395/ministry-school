begin;

-- Une fiche déjà publiée reste la source publique tant que sa nouvelle version
-- n'a pas été validée. Les espaces de gestion travaillent sur ce brouillon privé.
create table if not exists public.opportunity_draft_revisions (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  payload jsonb not null,
  dates jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.opportunity_draft_revisions enable row level security;

drop policy if exists opportunity_draft_revisions_read on public.opportunity_draft_revisions;
create policy opportunity_draft_revisions_read on public.opportunity_draft_revisions
for select to authenticated using (
  public.can_view_opportunity(opportunity_id)
);

create or replace function public.opportunity_management_revision(p_opportunity uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.can_view_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'payload', revision.payload,
    'dates', revision.dates,
    'updatedAt', revision.updated_at,
    'updatedByName', profile.full_name
  ) into result
  from public.opportunity_draft_revisions revision
  left join public.profiles profile on profile.id=revision.updated_by
  where revision.opportunity_id=p_opportunity;
  return result;
end $$;

create or replace function public.save_opportunity_revision(
  p_opportunity uuid, p_payload jsonb, p_dates jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare axes text[];
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_dates, '[]'::jsonb)) <> 'array'
  then raise exception 'INVALID_REVISION'; end if;

  axes := array(select jsonb_array_elements_text(coalesce(p_payload->'strategic_axes','[]'::jsonb)));
  if cardinality(axes)=0 or not (axes <@ array['former','auberge','fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  if nullif(trim(p_payload->>'title'),'') is null then raise exception 'TITLE_REQUIRED'; end if;
  if nullif(p_payload->>'capacity','')::integer is not null
    and nullif(p_payload->>'capacity','')::integer < 1
  then raise exception 'INVALID_CAPACITY'; end if;

  insert into public.opportunity_draft_revisions(
    opportunity_id,payload,dates,created_by,created_at,updated_by,updated_at
  ) values (
    p_opportunity,p_payload,p_dates,auth.uid(),now(),auth.uid(),now()
  ) on conflict(opportunity_id) do update set
    payload=excluded.payload,dates=excluded.dates,updated_by=auth.uid(),updated_at=now();
end $$;

-- La première décision d'une super administratrice reste suffisante. Lors d'une
-- approbation, le brouillon privé est appliqué atomiquement avant publication.
create or replace function public.review_opportunity(
  p_opportunity uuid, p_decision text, p_message text default null,
  p_publish_mode text default null, p_publish_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  request_row public.opportunity_review_requests%rowtype;
  revision_row public.opportunity_draft_revisions%rowtype;
  revision_date jsonb;
  revision_date_id uuid;
  retained_date_ids uuid[] := array[]::uuid[];
  revision_axes text[];
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select * into request_row from public.opportunity_review_requests
  where opportunity_id=p_opportunity for update;
  if not found or request_row.status<>'pending' then raise exception 'NO_PENDING_REVIEW'; end if;

  if p_decision='changes_requested' then
    if nullif(trim(p_message), '') is null then raise exception 'MESSAGE_REQUIRED'; end if;
    update public.opportunity_review_requests set
      status='changes_requested', correction_message=trim(p_message), resolved_at=now(),
      resolved_by=auth.uid(), decision='changes_requested', updated_at=now()
    where opportunity_id=p_opportunity;
    insert into public.opportunity_review_history(
      opportunity_id,requested_at,requested_by,decision,message,decided_by,decided_at
    ) values (
      p_opportunity,request_row.requested_at,request_row.requested_by,
      'changes_requested',trim(p_message),auth.uid(),now()
    );
    delete from public.opportunity_review_approvals where opportunity_id=p_opportunity;
    update public.opportunities set publication_status='draft',published_at=null,updated_at=now()
    where id=p_opportunity and publication_status not in ('published','scheduled');
    return;
  end if;

  if p_decision<>'approve' or p_publish_mode not in ('now','scheduled') then
    raise exception 'INVALID_DECISION';
  end if;
  if p_publish_mode='scheduled' and (p_publish_at is null or p_publish_at<=now()) then
    raise exception 'INVALID_SCHEDULE';
  end if;

  select * into revision_row from public.opportunity_draft_revisions
  where opportunity_id=p_opportunity for update;
  if found then
    revision_axes := array(select jsonb_array_elements_text(coalesce(revision_row.payload->'strategic_axes','[]'::jsonb)));
    update public.opportunities set
      kind=case when revision_row.payload->>'kind'='formation' then 'formation' else 'projet' end,
      is_project=coalesce((revision_row.payload->>'is_project')::boolean,false),
      is_training=coalesce((revision_row.payload->>'is_training')::boolean,false),
      title=trim(revision_row.payload->>'title'),
      description=coalesce(revision_row.payload->>'description',''),
      objectives=nullif(revision_row.payload->>'objectives',''),
      speakers=nullif(revision_row.payload->>'speakers',''),
      prerequisites=nullif(revision_row.payload->>'prerequisites',''),
      participant_material=nullif(revision_row.payload->>'participant_material',''),
      capacity=nullif(revision_row.payload->>'capacity','')::integer,
      strategic_axes=revision_axes,
      service_id=nullif(revision_row.payload->>'service_id','')::uuid,
      organizer_label=nullif(revision_row.payload->>'organizer_label',''),
      location=nullif(revision_row.payload->>'location',''),
      registration_open=coalesce((revision_row.payload->>'registration_open')::boolean,false),
      cancellation_allowed=coalesce((revision_row.payload->>'cancellation_allowed')::boolean,false),
      banner_emoji=coalesce(nullif(revision_row.payload->>'banner_emoji',''),'⭐'),
      strategic_contribution_former=null,
      strategic_contribution_auberge=null,
      strategic_contribution_fundraising=null,
      strategic_axes_connection=null,
      updated_at=now()
    where id=p_opportunity;

    for revision_date in select value from jsonb_array_elements(coalesce(revision_row.dates,'[]'::jsonb)) loop
      revision_date_id := nullif(revision_date->>'id','')::uuid;
      if revision_date_id is not null and exists(
        select 1 from public.opportunity_dates
        where id=revision_date_id and opportunity_id=p_opportunity
      ) then
        update public.opportunity_dates set
          session_date=(revision_date->>'session_date')::date,
          start_time=(revision_date->>'start_time')::time,
          end_time=(revision_date->>'end_time')::time,
          room=nullif(revision_date->>'room',''),
          location=nullif(revision_date->>'location',''),
          capacity=nullif(revision_date->>'capacity','')::integer
        where id=revision_date_id;
      else
        insert into public.opportunity_dates(
          opportunity_id,session_date,start_time,end_time,room,location,capacity
        ) values (
          p_opportunity,(revision_date->>'session_date')::date,
          (revision_date->>'start_time')::time,(revision_date->>'end_time')::time,
          nullif(revision_date->>'room',''),nullif(revision_date->>'location',''),
          nullif(revision_date->>'capacity','')::integer
        ) returning id into revision_date_id;
      end if;
      retained_date_ids := array_append(retained_date_ids,revision_date_id);
    end loop;

    if exists(
      select 1 from public.opportunity_dates date
      where date.opportunity_id=p_opportunity
        and not(date.id=any(retained_date_ids))
        and exists(select 1 from public.opportunity_date_registrations registration where registration.opportunity_date_id=date.id)
    ) then raise exception 'SESSION_HAS_REGISTRATIONS'; end if;

    delete from public.opportunity_dates
    where opportunity_id=p_opportunity and not(id=any(retained_date_ids));
    update public.opportunities set
      starts_on=(select min(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),
      ends_on=(select max(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),
      updated_at=now()
    where id=p_opportunity;
    delete from public.opportunity_draft_revisions where opportunity_id=p_opportunity;
  end if;

  insert into public.opportunity_review_approvals(opportunity_id,reviewer_id,approved_at)
  values(p_opportunity,auth.uid(),now())
  on conflict(opportunity_id,reviewer_id) do update set approved_at=now();
  update public.opportunity_review_requests set
    status='approved', resolved_at=now(), resolved_by=auth.uid(), decision='approved',
    desired_publication_status=case when p_publish_mode='now' then 'published' else 'scheduled' end,
    desired_published_at=case when p_publish_mode='scheduled' then p_publish_at else now() end,
    updated_at=now()
  where opportunity_id=p_opportunity;
  insert into public.opportunity_review_history(
    opportunity_id,requested_at,requested_by,decision,publish_mode,publish_at,decided_by,decided_at
  ) values (
    p_opportunity,request_row.requested_at,request_row.requested_by,
    'approved',p_publish_mode,case when p_publish_mode='scheduled' then p_publish_at else now() end,
    auth.uid(),now()
  );
  update public.opportunities set
    publication_status=case when p_publish_mode='now' then 'published' else 'scheduled' end,
    published_at=case when p_publish_mode='now' then now() else p_publish_at end,
    archived_at=null,updated_at=now()
  where id=p_opportunity;
end $$;

create or replace function public.opportunity_review_state(p_opportunity uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.can_view_opportunity(p_opportunity) and not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'status',coalesce(request.status,'none'),
    'desiredPublicationStatus',request.desired_publication_status,
    'desiredPublishedAt',request.desired_published_at,
    'requestedAt',request.requested_at,
    'requestedByName',requester.full_name,
    'correctionMessage',request.correction_message,
    'decidedAt',request.resolved_at,
    'decidedByName',reviewer.full_name,
    'canDecide',public.is_super_admin(),
    'isObserver',false,
    'hasDraftRevision',exists(select 1 from public.opportunity_draft_revisions where opportunity_id=p_opportunity),
    'history',coalesce((select jsonb_agg(jsonb_build_object(
      'id',history.id,'decision',history.decision,'message',history.message,
      'publishMode',history.publish_mode,'publishAt',history.publish_at,
      'requestedAt',history.requested_at,'decidedAt',history.decided_at,
      'requestedByName',history_requester.full_name,'decidedByName',history_reviewer.full_name
    ) order by history.decided_at desc)
    from public.opportunity_review_history history
    left join public.profiles history_requester on history_requester.id=history.requested_by
    left join public.profiles history_reviewer on history_reviewer.id=history.decided_by
    where history.opportunity_id=p_opportunity),'[]'::jsonb)
  ) into result
  from (select 1) seed
  left join public.opportunity_review_requests request on request.opportunity_id=p_opportunity
  left join public.profiles requester on requester.id=request.requested_by
  left join public.profiles reviewer on reviewer.id=request.resolved_by;
  return result;
end $$;

revoke all on table public.opportunity_draft_revisions from anon,authenticated;
grant select on table public.opportunity_draft_revisions to authenticated;
revoke all on function public.opportunity_management_revision(uuid) from public;
revoke all on function public.save_opportunity_revision(uuid,jsonb,jsonb) from public;
revoke all on function public.review_opportunity(uuid,text,text,text,timestamptz) from public;
grant execute on function public.opportunity_management_revision(uuid) to authenticated;
grant execute on function public.save_opportunity_revision(uuid,jsonb,jsonb) to authenticated;
grant execute on function public.review_opportunity(uuid,text,text,text,timestamptz) to authenticated;

-- L'ancien canal « Demander un complément » faisait doublon avec les corrections
-- éditoriales et pouvait créer des alertes séparées.
drop function if exists public.request_opportunity_contribution(uuid,text);

-- Les anciennes séances rattachées sont conservées, mais aucune nouvelle ne peut
-- être créée : une initiative est désormais autonome.
alter function public.create_course_draft(text,uuid,jsonb) rename to create_course_draft_legacy;
create function public.create_course_draft(
  p_context text, p_parent uuid, p_payload jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
begin
  if p_context not in ('admin','ministry') then raise exception 'FORBIDDEN'; end if;
  return public.create_course_draft_legacy(p_context,p_parent,p_payload);
end $$;
revoke all on function public.create_course_draft_legacy(text,uuid,jsonb) from public,anon,authenticated;
revoke all on function public.create_course_draft(text,uuid,jsonb) from public;
grant execute on function public.create_course_draft(text,uuid,jsonb) to authenticated;

commit;
