begin;

alter table public.opportunities
  add column if not exists tools_used text;

comment on column public.opportunities.tools_used is
  'Liste ordonnée, un outil ou logiciel par ligne. Champ public facultatif.';

-- Écriture isolée : les contributeurs autorisés peuvent compléter ce champ,
-- mais une version déjà publiée continue de passer par le brouillon privé.
create or replace function public.set_opportunity_tools(
  p_opportunity uuid, p_tools text default null
) returns void language plpgsql security definer set search_path = public as $$
declare current_status text;
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  select publication_status into current_status from public.opportunities where id=p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
  if current_status in ('published','scheduled') then raise exception 'REVISION_REQUIRED'; end if;
  update public.opportunities
  set tools_used=nullif(trim(p_tools),''),updated_at=now()
  where id=p_opportunity;
end $$;

-- Renvoie les libellés manquants depuis la version de travail lorsqu'elle
-- existe, sinon depuis la fiche courante. Les trois champs facultatifs ne sont
-- volontairement pas contrôlés ici.
create or replace function public.opportunity_missing_required_fields(p_opportunity uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  opportunity_row public.opportunities%rowtype;
  revision_row public.opportunity_draft_revisions%rowtype;
  payload jsonb;
  dates jsonb;
  missing text[] := array[]::text[];
  capacity_text text;
  date_row jsonb;
begin
  if not public.can_view_opportunity(p_opportunity) and not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select * into opportunity_row from public.opportunities where id=p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
  select * into revision_row from public.opportunity_draft_revisions where opportunity_id=p_opportunity;

  if found then
    payload := revision_row.payload;
    dates := coalesce(revision_row.dates,'[]'::jsonb);
  else
    payload := jsonb_build_object(
      'title',opportunity_row.title,
      'description',opportunity_row.description,
      'objectives',opportunity_row.objectives,
      'speakers',opportunity_row.speakers,
      'prerequisites',opportunity_row.prerequisites,
      'service_id',opportunity_row.service_id,
      'organizer_label',opportunity_row.organizer_label,
      'location',opportunity_row.location,
      'capacity',opportunity_row.capacity,
      'is_project',opportunity_row.is_project,
      'is_training',opportunity_row.is_training,
      'strategic_axes',to_jsonb(coalesce(opportunity_row.strategic_axes,array[]::text[]))
    );
    select coalesce(jsonb_agg(jsonb_build_object(
      'session_date',session_date,'start_time',start_time,'end_time',end_time
    )),'[]'::jsonb) into dates
    from public.opportunity_dates where opportunity_id=p_opportunity;
  end if;

  if nullif(trim(payload->>'title'),'') is null then missing:=array_append(missing,'nom'); end if;
  if nullif(trim(payload->>'description'),'') is null then missing:=array_append(missing,'présentation'); end if;
  if nullif(trim(payload->>'objectives'),'') is null then missing:=array_append(missing,'objectifs'); end if;
  if nullif(trim(payload->>'speakers'),'') is null then missing:=array_append(missing,'intervenants'); end if;
  if nullif(trim(payload->>'prerequisites'),'') is null then missing:=array_append(missing,'prérequis'); end if;
  if nullif(trim(coalesce(payload->>'service_id',payload->>'service_name',payload->>'organizer_label')),'') is null then
    missing:=array_append(missing,'service pilote');
  end if;
  if nullif(trim(payload->>'location'),'') is null then missing:=array_append(missing,'lieu principal'); end if;
  capacity_text:=nullif(trim(payload->>'capacity'),'');
  if capacity_text is null or capacity_text !~ '^[0-9]+$' or capacity_text::integer<1 then
    missing:=array_append(missing,'nombre de places');
  end if;
  if not coalesce((payload->>'is_project')::boolean,false)
    and not coalesce((payload->>'is_training')::boolean,false)
  then missing:=array_append(missing,'type'); end if;
  if jsonb_typeof(coalesce(payload->'strategic_axes','[]'::jsonb))<>'array'
    or jsonb_array_length(coalesce(payload->'strategic_axes','[]'::jsonb))=0
  then missing:=array_append(missing,'axe stratégique'); end if;
  if jsonb_typeof(coalesce(dates,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(dates,'[]'::jsonb))=0 then
    missing:=array_append(missing,'au moins une séance');
  else
    for date_row in select value from jsonb_array_elements(dates) loop
      if nullif(date_row->>'session_date','') is null
        or nullif(date_row->>'start_time','') is null
        or nullif(date_row->>'end_time','') is null
        or (date_row->>'start_time')::time >= (date_row->>'end_time')::time
      then
        missing:=array_append(missing,'dates et horaires valides');
        exit;
      end if;
    end loop;
  end if;
  return missing;
end $$;

-- Le responsable soumet seulement une fiche complète. L'API répète donc la
-- validation même si l'interface a été contournée.
create or replace function public.request_opportunity_review(
  p_opportunity uuid, p_desired_status text default 'published', p_desired_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare missing text[];
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.opportunities where id=p_opportunity) then raise exception 'NOT_FOUND'; end if;
  missing:=public.opportunity_missing_required_fields(p_opportunity);
  if cardinality(missing)>0 then raise exception 'REQUIRED_FIELDS:%',array_to_string(missing,', '); end if;

  insert into public.opportunity_review_requests(
    opportunity_id,requested_by,requested_at,desired_publication_status,
    desired_published_at,status,correction_message,resolved_at,resolved_by,decision,updated_at
  ) values (
    p_opportunity,auth.uid(),now(),'published',null,
    'pending',null,null,null,null,now()
  ) on conflict(opportunity_id) do update set
    requested_by=excluded.requested_by,requested_at=now(),
    desired_publication_status='published',desired_published_at=null,
    status='pending',correction_message=null,resolved_at=null,
    resolved_by=null,decision=null,updated_at=now();

  delete from public.opportunity_review_approvals where opportunity_id=p_opportunity;
  update public.opportunities set
    publication_status=case when publication_status in ('published','scheduled') then publication_status else 'draft' end,
    published_at=case when publication_status in ('published','scheduled') then published_at else null end,
    updated_at=now()
  where id=p_opportunity;
end $$;

-- Au moment où la validation applique puis supprime une révision, son champ
-- outils rejoint atomiquement la version publique.
create or replace function public.apply_opportunity_revision_tools()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_super_admin() and exists(
    select 1 from public.opportunity_review_requests request
    where request.opportunity_id=old.opportunity_id and request.status='pending'
  ) then
    update public.opportunities
    set tools_used=nullif(trim(old.payload->>'tools_used'),''),updated_at=now()
    where id=old.opportunity_id;
  end if;
  return old;
end $$;

drop trigger if exists apply_opportunity_revision_tools on public.opportunity_draft_revisions;
create trigger apply_opportunity_revision_tools
before delete on public.opportunity_draft_revisions
for each row execute function public.apply_opportunity_revision_tools();

-- Dernier verrou avant toute publication, y compris lors d'un appel direct ou
-- d'une ancienne demande encore en attente.
create or replace function public.enforce_complete_opportunity_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare missing text[];
begin
  if new.publication_status in ('published','scheduled') then
    missing:=public.opportunity_missing_required_fields(new.id);
    if cardinality(missing)>0 then raise exception 'REQUIRED_FIELDS:%',array_to_string(missing,', '); end if;
  end if;
  return new;
end $$;

drop trigger if exists enforce_complete_opportunity_publication on public.opportunities;
create trigger enforce_complete_opportunity_publication
before update of publication_status,published_at on public.opportunities
for each row execute function public.enforce_complete_opportunity_publication();

revoke all on function public.set_opportunity_tools(uuid,text) from public;
revoke all on function public.opportunity_missing_required_fields(uuid) from public;
revoke all on function public.request_opportunity_review(uuid,text,timestamptz) from public;
grant execute on function public.set_opportunity_tools(uuid,text) to authenticated;
grant execute on function public.opportunity_missing_required_fields(uuid) to authenticated;
grant execute on function public.request_opportunity_review(uuid,text,timestamptz) to authenticated;

commit;
