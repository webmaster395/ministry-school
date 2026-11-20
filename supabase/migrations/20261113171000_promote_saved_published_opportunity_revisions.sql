begin;

-- La migration s'exécute sans identité auth.uid(). On neutralise uniquement
-- le déclencheur applicatif qui exige l'identité du responsable pendant les
-- mises à jour ordinaires. Les autres protections restent actives et le
-- déclencheur est rétabli dans la même transaction (donc aussi en cas d'échec).
alter table public.opportunities disable trigger enforce_opportunity_operational_scope;

-- Une version enregistrée avant l'activation de la sauvegarde directe pouvait
-- rester bloquée dans opportunity_draft_revisions alors que la fiche avait
-- déjà été approuvée et publiée. On applique uniquement ces versions orphelines
-- et on conserve l'ancienne fiche publique dans la même ligne comme instantané
-- récupérable (_direct_snapshot=true).
do $$
declare
  candidate record;
  old_payload jsonb;
  old_dates jsonb;
  revision_date jsonb;
  revision_date_id uuid;
  retained_date_ids uuid[];
  revision_axes text[];
  resolved_service_id uuid;
  resolved_service_name text;
begin
  for candidate in
    select opportunity.*, revision.payload, revision.dates as revision_dates,
      revision.updated_at as revision_updated_at
    from public.opportunities opportunity
    join public.opportunity_draft_revisions revision on revision.opportunity_id=opportunity.id
    where opportunity.publication_status in ('published','scheduled')
      and not coalesce((revision.payload->>'_direct_snapshot')::boolean,false)
      and not exists(
        select 1 from public.opportunity_review_requests request
        where request.opportunity_id=opportunity.id
          and request.status in ('pending','changes_requested')
      )
  loop
    select jsonb_build_object(
      '_direct_snapshot',true,
      '_replaced_at',clock_timestamp(),
      'kind',candidate.kind,'is_project',candidate.is_project,'is_training',candidate.is_training,
      'title',candidate.title,'description',candidate.description,'objectives',candidate.objectives,
      'speakers',candidate.speakers,'prerequisites',candidate.prerequisites,
      'participant_material',candidate.participant_material,'tools_used',candidate.tools_used,
      'capacity',candidate.capacity,'strategic_axes',to_jsonb(coalesce(candidate.strategic_axes,array[]::text[])),
      'service_id',candidate.service_id,'service_name',candidate.organizer_label,'organizer_label',candidate.organizer_label,
      'location',candidate.location,'registration_open',candidate.registration_open,
      'cancellation_allowed',candidate.cancellation_allowed,'banner_emoji',candidate.banner_emoji,
      'participation_audience',candidate.participation_audience,
      'participation_audience_details',candidate.participation_audience_details,
      'participation_prerequisites_required',candidate.participation_prerequisites_required
    ) into old_payload;
    select coalesce(jsonb_agg(jsonb_build_object(
      'id',date.id,'session_date',date.session_date,'start_time',date.start_time,
      'end_time',date.end_time,'room',date.room,'location',date.location,'capacity',date.capacity
    ) order by date.session_date,date.start_time),'[]'::jsonb)
    into old_dates from public.opportunity_dates date where date.opportunity_id=candidate.id;

    revision_axes := array(select jsonb_array_elements_text(coalesce(candidate.payload->'strategic_axes','[]'::jsonb)));
    resolved_service_name := coalesce(nullif(trim(candidate.payload->>'service_name'),''), nullif(trim(candidate.payload->>'organizer_label'),''));
    resolved_service_id := case
      when nullif(candidate.payload->>'service_id','') is not null then (candidate.payload->>'service_id')::uuid
      when resolved_service_name is not null then public.resolve_service_name(resolved_service_name)
      else null
    end;

    update public.opportunities set
      kind=case when candidate.payload->>'type'='formation' or candidate.payload->>'kind'='formation' then 'formation' else 'projet' end,
      is_project=coalesce((candidate.payload->>'is_project')::boolean,candidate.payload->>'type' in ('projet','both'),is_project),
      is_training=coalesce((candidate.payload->>'is_training')::boolean,candidate.payload->>'type' in ('formation','both'),is_training),
      title=coalesce(nullif(trim(candidate.payload->>'title'),''),title),
      description=coalesce(candidate.payload->>'description',description),
      objectives=nullif(candidate.payload->>'objectives',''), speakers=nullif(candidate.payload->>'speakers',''),
      prerequisites=nullif(candidate.payload->>'prerequisites',''), participant_material=nullif(candidate.payload->>'participant_material',''),
      tools_used=nullif(candidate.payload->>'tools_used',''), capacity=nullif(candidate.payload->>'capacity','')::integer,
      strategic_axes=revision_axes, service_id=resolved_service_id, organizer_label=resolved_service_name,
      location=nullif(candidate.payload->>'location',''),
      registration_open=coalesce((candidate.payload->>'registration_open')::boolean,false),
      cancellation_allowed=coalesce((candidate.payload->>'cancellation_allowed')::boolean,false),
      banner_emoji=coalesce(nullif(candidate.payload->>'banner_emoji',''),'⭐'),
      participation_audience=coalesce(nullif(candidate.payload->>'participation_audience',''),participation_audience,'all'),
      participation_audience_details=nullif(candidate.payload->>'participation_audience_details',''),
      participation_prerequisites_required=coalesce((candidate.payload->>'participation_prerequisites_required')::boolean,false),
      updated_at=candidate.revision_updated_at
    where id=candidate.id;

    retained_date_ids := array[]::uuid[];
    for revision_date in select value from jsonb_array_elements(coalesce(candidate.revision_dates,'[]'::jsonb)) loop
      revision_date_id := nullif(revision_date->>'id','')::uuid;
      if revision_date_id is not null and exists(select 1 from public.opportunity_dates where id=revision_date_id and opportunity_id=candidate.id) then
        update public.opportunity_dates set
          session_date=(revision_date->>'session_date')::date,start_time=(revision_date->>'start_time')::time,
          end_time=(revision_date->>'end_time')::time,room=nullif(revision_date->>'room',''),
          location=nullif(revision_date->>'location',''),capacity=nullif(revision_date->>'capacity','')::integer
        where id=revision_date_id;
      else
        insert into public.opportunity_dates(opportunity_id,session_date,start_time,end_time,room,location,capacity)
        values(candidate.id,(revision_date->>'session_date')::date,(revision_date->>'start_time')::time,
          (revision_date->>'end_time')::time,nullif(revision_date->>'room',''),nullif(revision_date->>'location',''),
          nullif(revision_date->>'capacity','')::integer)
        returning id into revision_date_id;
      end if;
      retained_date_ids:=array_append(retained_date_ids,revision_date_id);
    end loop;
    if jsonb_array_length(coalesce(candidate.revision_dates,'[]'::jsonb)) > 0 then
      -- Une ancienne révision pouvait ne contenir qu'une partie du calendrier.
      -- Les séances absentes de cette révision mais déjà utilisées restent
      -- strictement intactes ; seules les séances omises et sans inscription
      -- peuvent être retirées.
      delete from public.opportunity_dates date
      where date.opportunity_id=candidate.id
        and not(date.id=any(retained_date_ids))
        and not exists(
          select 1 from public.opportunity_date_registrations registration
          where registration.opportunity_date_id=date.id
        );
    end if;
    update public.opportunities set
      starts_on=(select min(session_date) from public.opportunity_dates where opportunity_id=candidate.id),
      ends_on=(select max(session_date) from public.opportunity_dates where opportunity_id=candidate.id)
    where id=candidate.id;

    update public.opportunity_draft_revisions set payload=old_payload,dates=old_dates
    where opportunity_id=candidate.id;
  end loop;
end $$;

alter table public.opportunities enable trigger enforce_opportunity_operational_scope;

commit;
