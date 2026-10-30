begin;

-- Une seule mutation transactionnelle pour toute la fiche. Les champs requis
-- sont contrôlés au moment de la soumission, jamais pendant la préparation du
-- brouillon. Le jeton updated_at évite d'écraser silencieusement le travail
-- enregistré depuis un autre onglet ou par une autre personne.
create or replace function public.save_opportunity_form(
  p_opportunity uuid,
  p_payload jsonb,
  p_dates jsonb default '[]'::jsonb,
  p_expected_updated_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  opportunity_row public.opportunities%rowtype;
  revision_row public.opportunity_draft_revisions%rowtype;
  effective_payload jsonb;
  can_manage boolean;
  can_internal boolean;
  current_version timestamptz;
  saved_version timestamptz := clock_timestamp();
  v_service_id uuid;
  v_service_name text;
  axes text[];
  audience text;
  date_row jsonb;
  date_id uuid;
  kept_date_ids uuid[] := array[]::uuid[];
  saved_dates jsonb;
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(coalesce(p_payload,'{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_dates,'[]'::jsonb)) <> 'array'
  then raise exception 'INVALID_PAYLOAD'; end if;

  select * into opportunity_row from public.opportunities
  where id=p_opportunity for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  can_manage := public.can_submit_opportunity(p_opportunity);
  can_internal := public.can_review_editorial_content();
  select * into revision_row from public.opportunity_draft_revisions
  where opportunity_id=p_opportunity for update;
  current_version := case when found then revision_row.updated_at else opportunity_row.updated_at end;
  if p_expected_updated_at is not null
    and abs(extract(epoch from (current_version-p_expected_updated_at))) > 0.001
  then raise exception 'SAVE_CONFLICT'; end if;

  audience := coalesce(nullif(p_payload->>'participation_audience',''), opportunity_row.participation_audience, 'all');
  if audience not in ('all','specific') then raise exception 'INVALID_PARTICIPATION_AUDIENCE'; end if;
  axes := array(select jsonb_array_elements_text(coalesce(p_payload->'strategic_axes','[]'::jsonb)));
  if not (axes <@ array['former','auberge','fundraising']::text[]) then raise exception 'INVALID_STRATEGIC_AXES'; end if;

  if opportunity_row.publication_status in ('published','scheduled') then
    effective_payload := case when revision_row.opportunity_id is not null then revision_row.payload else jsonb_build_object(
      'kind',opportunity_row.kind,'is_project',opportunity_row.is_project,'is_training',opportunity_row.is_training,
      'title',opportunity_row.title,'description',opportunity_row.description,'objectives',opportunity_row.objectives,
      'speakers',opportunity_row.speakers,'prerequisites',opportunity_row.prerequisites,
      'participant_material',opportunity_row.participant_material,'tools_used',opportunity_row.tools_used,
      'capacity',opportunity_row.capacity,'strategic_axes',to_jsonb(coalesce(opportunity_row.strategic_axes,array[]::text[])),
      'service_id',opportunity_row.service_id,'organizer_label',opportunity_row.organizer_label,
      'location',opportunity_row.location,'registration_open',opportunity_row.registration_open,
      'cancellation_allowed',opportunity_row.cancellation_allowed,'banner_emoji',opportunity_row.banner_emoji,
      'participation_audience',opportunity_row.participation_audience,
      'participation_audience_details',opportunity_row.participation_audience_details,
      'participation_prerequisites_required',opportunity_row.participation_prerequisites_required
    ) end;

    effective_payload := effective_payload || jsonb_build_object(
      'description',coalesce(p_payload->>'description',''),
      'objectives',nullif(p_payload->>'objectives',''),
      'speakers',nullif(p_payload->>'speakers',''),
      'prerequisites',nullif(p_payload->>'prerequisites',''),
      'participant_material',nullif(p_payload->>'participant_material',''),
      'tools_used',nullif(p_payload->>'tools_used',''),
      'capacity',nullif(p_payload->>'capacity',''),
      'strategic_axes',coalesce(p_payload->'strategic_axes','[]'::jsonb),
      'participation_audience',audience,
      'participation_audience_details',case when audience='specific' then nullif(trim(p_payload->>'participation_audience_details'),'') else null end,
      'participation_prerequisites_required',coalesce((p_payload->>'participation_prerequisites_required')::boolean,false)
    );
    if can_manage then
      v_service_name := nullif(trim(p_payload->>'service_name'),'');
      v_service_id := case when v_service_name is null then null else public.resolve_service_name(v_service_name) end;
      effective_payload := effective_payload || jsonb_build_object(
        'kind',case when p_payload->>'type'='formation' then 'formation' else 'projet' end,
        'is_project',p_payload->>'type' in ('projet','both'),
        'is_training',p_payload->>'type' in ('formation','both'),
        'title',coalesce(p_payload->>'title',''),'service_id',v_service_id,
        'service_name',v_service_name,'organizer_label',v_service_name,
        'location',nullif(p_payload->>'location',''),
        'registration_open',coalesce((p_payload->>'registration_open')::boolean,false),
        'cancellation_allowed',coalesce((p_payload->>'cancellation_allowed')::boolean,false),
        'banner_emoji',coalesce(nullif(p_payload->>'banner_emoji',''),'⭐')
      );
    end if;

    insert into public.opportunity_draft_revisions(
      opportunity_id,payload,dates,created_by,created_at,updated_by,updated_at
    ) values (
      p_opportunity,effective_payload,
      case when can_manage then coalesce(p_dates,'[]'::jsonb) else coalesce(revision_row.dates,
        (select coalesce(jsonb_agg(jsonb_build_object('id',id,'session_date',session_date,'start_time',start_time,'end_time',end_time,'room',room,'location',location,'capacity',capacity) order by session_date,start_time),'[]'::jsonb) from public.opportunity_dates where opportunity_id=p_opportunity)) end,
      auth.uid(),saved_version,auth.uid(),saved_version
    ) on conflict(opportunity_id) do update set
      payload=excluded.payload,dates=excluded.dates,updated_by=auth.uid(),updated_at=saved_version;
    saved_dates := case when can_manage then coalesce(p_dates,'[]'::jsonb) else coalesce(revision_row.dates,'[]'::jsonb) end;
  else
    v_service_name := case when can_manage then nullif(trim(p_payload->>'service_name'),'') else opportunity_row.organizer_label end;
    v_service_id := case when can_manage and v_service_name is not null then public.resolve_service_name(v_service_name) else opportunity_row.service_id end;
    update public.opportunities set
      description=coalesce(p_payload->>'description',''), objectives=nullif(p_payload->>'objectives',''),
      speakers=nullif(p_payload->>'speakers',''), prerequisites=nullif(p_payload->>'prerequisites',''),
      participant_material=nullif(p_payload->>'participant_material',''), tools_used=nullif(p_payload->>'tools_used',''),
      capacity=nullif(p_payload->>'capacity','')::integer, strategic_axes=axes,
      participation_audience=audience,
      participation_audience_details=case when audience='specific' then nullif(trim(p_payload->>'participation_audience_details'),'') else null end,
      participation_prerequisites_required=coalesce((p_payload->>'participation_prerequisites_required')::boolean,false),
      kind=case when can_manage and p_payload->>'type'='formation' then 'formation' when can_manage then 'projet' else kind end,
      is_project=case when can_manage then p_payload->>'type' in ('projet','both') else is_project end,
      is_training=case when can_manage then p_payload->>'type' in ('formation','both') else is_training end,
      title=case when can_manage then coalesce(p_payload->>'title','') else title end,
      service_id=case when can_manage then v_service_id else opportunity_row.service_id end,
      organizer_label=case when can_manage then v_service_name else opportunity_row.organizer_label end,
      location=case when can_manage then nullif(p_payload->>'location','') else location end,
      registration_open=case when can_manage then coalesce((p_payload->>'registration_open')::boolean,false) else registration_open end,
      cancellation_allowed=case when can_manage then coalesce((p_payload->>'cancellation_allowed')::boolean,false) else cancellation_allowed end,
      banner_emoji=case when can_manage then coalesce(nullif(p_payload->>'banner_emoji',''),'⭐') else banner_emoji end,
      updated_at=saved_version
    where id=p_opportunity;

    if can_manage then
      for date_row in select value from jsonb_array_elements(coalesce(p_dates,'[]'::jsonb)) loop
        date_id:=nullif(date_row->>'id','')::uuid;
        if date_id is not null and exists(select 1 from public.opportunity_dates where id=date_id and opportunity_id=p_opportunity) then
          update public.opportunity_dates set session_date=(date_row->>'session_date')::date,
            start_time=(date_row->>'start_time')::time,end_time=(date_row->>'end_time')::time,
            room=nullif(date_row->>'room',''),location=nullif(date_row->>'location',''),
            capacity=nullif(date_row->>'capacity','')::integer where id=date_id;
        else
          insert into public.opportunity_dates(opportunity_id,session_date,start_time,end_time,room,location,capacity)
          values(p_opportunity,(date_row->>'session_date')::date,(date_row->>'start_time')::time,(date_row->>'end_time')::time,
            nullif(date_row->>'room',''),nullif(date_row->>'location',''),nullif(date_row->>'capacity','')::integer)
          returning id into date_id;
        end if;
        kept_date_ids:=array_append(kept_date_ids,date_id);
      end loop;
      if exists(select 1 from public.opportunity_dates d where d.opportunity_id=p_opportunity
        and not(d.id=any(kept_date_ids)) and exists(select 1 from public.opportunity_date_registrations r where r.opportunity_date_id=d.id))
      then raise exception 'SESSION_HAS_REGISTRATIONS'; end if;
      delete from public.opportunity_dates where opportunity_id=p_opportunity and not(id=any(kept_date_ids));
      update public.opportunities set starts_on=(select min(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),
        ends_on=(select max(session_date) from public.opportunity_dates where opportunity_id=p_opportunity),updated_at=saved_version
      where id=p_opportunity;
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id',id,'session_date',session_date,'start_time',start_time,'end_time',end_time,'room',room,'location',location,'capacity',capacity) order by session_date,start_time),'[]'::jsonb)
      into saved_dates from public.opportunity_dates where opportunity_id=p_opportunity;
  end if;

  if can_internal and p_payload ? 'organization_material' then
    insert into public.opportunity_internal_planning(opportunity_id,organization_material,updated_at,updated_by)
    values(p_opportunity,nullif(trim(p_payload->>'organization_material'),''),saved_version,auth.uid())
    on conflict(opportunity_id) do update set organization_material=excluded.organization_material,updated_at=saved_version,updated_by=auth.uid();
  end if;
  return jsonb_build_object('updatedAt',saved_version,'dates',coalesce(saved_dates,'[]'::jsonb));
end $$;

revoke all on function public.save_opportunity_form(uuid,jsonb,jsonb,timestamptz) from public;
grant execute on function public.save_opportunity_form(uuid,jsonb,jsonb,timestamptz) to authenticated;

commit;
