begin;

-- Déroulé pédagogique privé aux espaces de gestion, distinct pour chaque séance.
create table if not exists public.opportunity_agenda_steps (
  id uuid primary key default gen_random_uuid(),
  opportunity_date_id uuid not null references public.opportunity_dates(id) on delete cascade,
  position integer not null check (position >= 0),
  duration_minutes integer not null check (duration_minutes between 1 and 1440),
  activity_type text not null check (activity_type in ('theory','practice','workshop','testimonials','prayer','worship','bible_reading','other')),
  custom_type text,
  explanation text not null default '',
  created_by uuid not null references public.profiles(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (activity_type <> 'other' or nullif(trim(custom_type), '') is not null),
  unique(opportunity_date_id, position)
);

create index if not exists opportunity_agenda_steps_date_idx
  on public.opportunity_agenda_steps(opportunity_date_id, position);

alter table public.opportunity_agenda_steps enable row level security;

drop policy if exists opportunity_agenda_steps_read on public.opportunity_agenda_steps;
create policy opportunity_agenda_steps_read on public.opportunity_agenda_steps
for select to authenticated using (
  exists (
    select 1 from public.opportunity_dates opportunity_date
    where opportunity_date.id = opportunity_date_id
      and (
        public.can_view_opportunity(opportunity_date.opportunity_id)
        or public.is_platform_admin()
      )
  )
);

-- Les écritures passent exclusivement par la RPC atomique ci-dessous.
create or replace function public.opportunity_agenda(p_opportunity uuid)
returns table(
  id uuid, opportunity_date_id uuid, "position" integer, duration_minutes integer,
  activity_type text, custom_type text, explanation text
) language sql stable security definer set search_path = public as $$
  select step.id, step.opportunity_date_id, step.position, step.duration_minutes,
    step.activity_type, step.custom_type, step.explanation
  from public.opportunity_agenda_steps step
  join public.opportunity_dates opportunity_date on opportunity_date.id = step.opportunity_date_id
  where opportunity_date.opportunity_id = p_opportunity
    and (public.can_view_opportunity(p_opportunity) or public.is_platform_admin())
  order by opportunity_date.session_date, opportunity_date.start_time, step.position
$$;

create or replace function public.save_opportunity_agenda(
  p_opportunity uuid, p_opportunity_date uuid, p_steps jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare step jsonb; step_index integer := 0; step_type text; step_duration integer;
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if not exists(
    select 1 from public.opportunity_dates
    where id = p_opportunity_date and opportunity_id = p_opportunity
  ) then raise exception 'INVALID_SESSION'; end if;
  if jsonb_typeof(coalesce(p_steps, '[]'::jsonb)) <> 'array' then raise exception 'INVALID_STEPS'; end if;

  delete from public.opportunity_agenda_steps where opportunity_date_id = p_opportunity_date;
  for step in select value from jsonb_array_elements(coalesce(p_steps, '[]'::jsonb)) loop
    step_type := coalesce(step->>'activity_type', '');
    step_duration := coalesce((step->>'duration_minutes')::integer, 0);
    if step_type not in ('theory','practice','workshop','testimonials','prayer','worship','bible_reading','other')
      or step_duration < 1 or step_duration > 1440
      or (step_type = 'other' and nullif(trim(step->>'custom_type'), '') is null)
    then raise exception 'INVALID_STEP'; end if;
    insert into public.opportunity_agenda_steps(
      opportunity_date_id, position, duration_minutes, activity_type, custom_type, explanation, created_by
    ) values (
      p_opportunity_date, step_index, step_duration, step_type,
      case when step_type='other' then nullif(trim(step->>'custom_type'), '') else null end,
      left(coalesce(step->>'explanation', ''), 1000), auth.uid()
    );
    step_index := step_index + 1;
  end loop;
end $$;

-- Historique durable des décisions ; la demande courante reste la source du statut actuel.
create table if not exists public.opportunity_review_history (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  requested_at timestamptz not null,
  requested_by uuid references public.profiles(id) on delete set null,
  decision text not null check (decision in ('approved','changes_requested')),
  message text,
  publish_mode text check (publish_mode in ('now','scheduled')),
  publish_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default now()
);

create index if not exists opportunity_review_history_opportunity_idx
  on public.opportunity_review_history(opportunity_id, decided_at desc);

alter table public.opportunity_review_history enable row level security;
drop policy if exists opportunity_review_history_read on public.opportunity_review_history;
create policy opportunity_review_history_read on public.opportunity_review_history
for select to authenticated using (
  public.can_view_opportunity(opportunity_id) or public.is_platform_admin()
);

insert into public.opportunity_review_history(
  opportunity_id, requested_at, requested_by, decision, message, publish_mode,
  publish_at, decided_by, decided_at
)
select request.opportunity_id, request.requested_at, request.requested_by,
  request.decision, request.correction_message,
  case when request.decision='approved' and request.desired_publication_status='scheduled' then 'scheduled'
       when request.decision='approved' then 'now' else null end,
  request.desired_published_at, request.resolved_by, request.resolved_at
from public.opportunity_review_requests request
where request.decision in ('approved','changes_requested') and request.resolved_at is not null;

-- Le responsable soumet seulement le dossier. La date de publication est choisie à la décision.
create or replace function public.request_opportunity_review(
  p_opportunity uuid, p_desired_status text default 'published', p_desired_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.opportunities where id=p_opportunity) then raise exception 'NOT_FOUND'; end if;

  insert into public.opportunity_review_requests(
    opportunity_id, requested_by, requested_at, desired_publication_status,
    desired_published_at, status, correction_message, resolved_at, resolved_by, decision, updated_at
  ) values (
    p_opportunity, auth.uid(), now(), 'published', null,
    'pending', null, null, null, null, now()
  ) on conflict(opportunity_id) do update set
    requested_by=excluded.requested_by, requested_at=now(),
    desired_publication_status='published', desired_published_at=null,
    status='pending', correction_message=null, resolved_at=null,
    resolved_by=null, decision=null, updated_at=now();

  delete from public.opportunity_review_approvals where opportunity_id=p_opportunity;
  update public.opportunities set
    publication_status=case when publication_status in ('published','scheduled') then publication_status else 'draft' end,
    published_at=case when publication_status in ('published','scheduled') then published_at else null end,
    updated_at=now()
  where id=p_opportunity;
end $$;

drop function if exists public.review_opportunity(uuid,text,text);
create function public.review_opportunity(
  p_opportunity uuid, p_decision text, p_message text default null,
  p_publish_mode text default null, p_publish_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare request_row public.opportunity_review_requests%rowtype;
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

  if p_decision<>'approve' or p_publish_mode not in ('now','scheduled') then raise exception 'INVALID_DECISION'; end if;
  if p_publish_mode='scheduled' and (p_publish_at is null or p_publish_at<=now()) then raise exception 'INVALID_SCHEDULE'; end if;

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

revoke all on table public.opportunity_agenda_steps from anon, authenticated;
grant select on table public.opportunity_agenda_steps to authenticated;
revoke all on table public.opportunity_review_history from anon, authenticated;
grant select on table public.opportunity_review_history to authenticated;
revoke all on function public.opportunity_agenda(uuid) from public;
revoke all on function public.save_opportunity_agenda(uuid,uuid,jsonb) from public;
revoke all on function public.review_opportunity(uuid,text,text,text,timestamptz) from public;
grant execute on function public.opportunity_agenda(uuid) to authenticated;
grant execute on function public.save_opportunity_agenda(uuid,uuid,jsonb) to authenticated;
grant execute on function public.review_opportunity(uuid,text,text,text,timestamptz) to authenticated;

commit;
