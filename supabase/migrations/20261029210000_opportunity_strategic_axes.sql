begin;

alter table public.opportunities
  add column if not exists strategic_axes text[] not null default array[]::text[],
  add column if not exists strategic_contribution_former text,
  add column if not exists strategic_contribution_auberge text,
  add column if not exists strategic_contribution_fundraising text,
  add column if not exists strategic_axes_connection text;

alter table public.opportunities drop constraint if exists opportunities_strategic_axes_check;
alter table public.opportunities add constraint opportunities_strategic_axes_check check (
  strategic_axes <@ array['former', 'auberge', 'fundraising']::text[]
  and cardinality(strategic_axes) >= 1
  and (not ('former' = any(strategic_axes)) or length(trim(coalesce(strategic_contribution_former, ''))) > 0)
  and (not ('auberge' = any(strategic_axes)) or length(trim(coalesce(strategic_contribution_auberge, ''))) > 0)
  and (not ('fundraising' = any(strategic_axes)) or length(trim(coalesce(strategic_contribution_fundraising, ''))) > 0)
  and (cardinality(strategic_axes) < 2 or length(trim(coalesce(strategic_axes_connection, ''))) > 0)
) not valid;

create or replace function public.update_opportunity_content(
  p_opportunity uuid, p_description text, p_objectives text, p_speakers text,
  p_prerequisites text, p_organization_material text, p_participant_material text,
  p_strategic_axes text[], p_strategic_contribution_former text,
  p_strategic_contribution_auberge text, p_strategic_contribution_fundraising text,
  p_strategic_axes_connection text
) returns void language plpgsql security definer set search_path = public as $$
declare v_axes text[] := coalesce(p_strategic_axes, array[]::text[]);
begin
  if not public.can_contribute_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if cardinality(v_axes) = 0 or not (v_axes <@ array['former', 'auberge', 'fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  if ('former' = any(v_axes)) and coalesce(trim(p_strategic_contribution_former), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_FORMER_REQUIRED';
  end if;
  if ('auberge' = any(v_axes)) and coalesce(trim(p_strategic_contribution_auberge), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_AUBERGE_REQUIRED';
  end if;
  if ('fundraising' = any(v_axes)) and coalesce(trim(p_strategic_contribution_fundraising), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_FUNDRAISING_REQUIRED';
  end if;
  if cardinality(v_axes) >= 2 and coalesce(trim(p_strategic_axes_connection), '') = '' then
    raise exception 'STRATEGIC_AXES_CONNECTION_REQUIRED';
  end if;
  update public.opportunities set
    description = p_description, objectives = p_objectives, speakers = p_speakers,
    prerequisites = p_prerequisites, organization_material = p_organization_material,
    participant_material = p_participant_material,
    strategic_axes = v_axes,
    strategic_contribution_former = case when 'former' = any(v_axes) then nullif(trim(p_strategic_contribution_former), '') else null end,
    strategic_contribution_auberge = case when 'auberge' = any(v_axes) then nullif(trim(p_strategic_contribution_auberge), '') else null end,
    strategic_contribution_fundraising = case when 'fundraising' = any(v_axes) then nullif(trim(p_strategic_contribution_fundraising), '') else null end,
    strategic_axes_connection = case when cardinality(v_axes) >= 2 then nullif(trim(p_strategic_axes_connection), '') else null end,
    updated_at = now()
  where id = p_opportunity;
end $$;

create or replace function public.create_opportunity_admin(
  p_payload jsonb, p_dates jsonb, p_managers uuid[], p_contributors uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; person uuid; d jsonb; v_axes text[];
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_payload->>'title'), '') = '' or coalesce(trim(p_payload->>'description'), '') = '' then
    raise exception 'REQUIRED_FIELDS';
  end if;
  if not coalesce((p_payload->>'is_project')::boolean, false)
     and not coalesce((p_payload->>'is_training')::boolean, false) then
    raise exception 'TYPE_REQUIRED';
  end if;
  select coalesce(array_agg(value), array[]::text[]) into v_axes
  from jsonb_array_elements_text(coalesce(p_payload->'strategic_axes', '[]'::jsonb));
  if cardinality(v_axes) = 0 or not (v_axes <@ array['former', 'auberge', 'fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  if ('former' = any(v_axes)) and coalesce(trim(p_payload->>'strategic_contribution_former'), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_FORMER_REQUIRED';
  end if;
  if ('auberge' = any(v_axes)) and coalesce(trim(p_payload->>'strategic_contribution_auberge'), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_AUBERGE_REQUIRED';
  end if;
  if ('fundraising' = any(v_axes)) and coalesce(trim(p_payload->>'strategic_contribution_fundraising'), '') = '' then
    raise exception 'STRATEGIC_CONTRIBUTION_FUNDRAISING_REQUIRED';
  end if;
  if cardinality(v_axes) >= 2 and coalesce(trim(p_payload->>'strategic_axes_connection'), '') = '' then
    raise exception 'STRATEGIC_AXES_CONNECTION_REQUIRED';
  end if;

  insert into public.opportunities(
    kind, is_project, is_training, title, short_description, description, objectives,
    service_id, organizer_label, speakers, prerequisites, location, organization_material,
    participant_material, schedule_label, starts_on, ends_on, capacity, registration_open,
    cancellation_allowed, publication_status, published_at, created_by, strategic_axes,
    strategic_contribution_former, strategic_contribution_auberge, strategic_contribution_fundraising
    , strategic_axes_connection
  ) values (
    p_payload->>'kind', (p_payload->>'is_project')::boolean, (p_payload->>'is_training')::boolean,
    p_payload->>'title', p_payload->>'short_description', p_payload->>'description', p_payload->>'objectives',
    nullif(p_payload->>'service_id', '')::uuid, p_payload->>'organizer_label', p_payload->>'speakers',
    p_payload->>'prerequisites', p_payload->>'location', p_payload->>'organization_material',
    p_payload->>'participant_material', p_payload->>'schedule_label', nullif(p_payload->>'starts_on', '')::date,
    nullif(p_payload->>'ends_on', '')::date, nullif(p_payload->>'capacity', '')::integer,
    coalesce((p_payload->>'registration_open')::boolean, false),
    coalesce((p_payload->>'cancellation_allowed')::boolean, true), p_payload->>'publication_status',
    nullif(p_payload->>'published_at', '')::timestamptz, auth.uid(), v_axes,
    case when 'former' = any(v_axes) then nullif(trim(p_payload->>'strategic_contribution_former'), '') else null end,
    case when 'auberge' = any(v_axes) then nullif(trim(p_payload->>'strategic_contribution_auberge'), '') else null end,
    case when 'fundraising' = any(v_axes) then nullif(trim(p_payload->>'strategic_contribution_fundraising'), '') else null end,
    case when cardinality(v_axes) >= 2 then nullif(trim(p_payload->>'strategic_axes_connection'), '') else null end
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
    values(new_id, person, 'contributor', auth.uid()) on conflict(opportunity_id, user_id) do nothing;
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
  return new_id;
end $$;

grant execute on function public.update_opportunity_content(uuid,text,text,text,text,text,text,text[],text,text,text,text) to authenticated;

commit;
