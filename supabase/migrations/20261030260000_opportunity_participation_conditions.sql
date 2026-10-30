begin;

alter table public.opportunities
  add column if not exists participation_audience text not null default 'all',
  add column if not exists participation_audience_details text,
  add column if not exists participation_prerequisites_required boolean not null default false;

alter table public.opportunities drop constraint if exists opportunities_participation_audience_check;
alter table public.opportunities add constraint opportunities_participation_audience_check
  check (participation_audience in ('all','specific'));

comment on column public.opportunities.participation_audience is
  'Public autorisé : all pour Ouvert à tous, specific pour un public précisé.';
comment on column public.opportunities.participation_audience_details is
  'Public concerné lorsque participation_audience vaut specific.';
comment on column public.opportunities.participation_prerequisites_required is
  'Indique que la liste prerequisites constitue une condition de participation.';

create or replace function public.set_opportunity_participation_conditions(
  p_opportunity uuid,
  p_audience text,
  p_audience_details text default null,
  p_prerequisites_required boolean default false
) returns void language plpgsql security definer set search_path = public as $$
declare current_prerequisites text;
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_audience not in ('all','specific') then raise exception 'INVALID_PARTICIPATION_AUDIENCE'; end if;
  if p_audience='specific' and nullif(trim(p_audience_details),'') is null then
    raise exception 'PARTICIPATION_AUDIENCE_DETAILS_REQUIRED';
  end if;
  select prerequisites into current_prerequisites from public.opportunities where id=p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
  if coalesce(p_prerequisites_required,false) and nullif(trim(current_prerequisites),'') is null then
    raise exception 'PARTICIPATION_PREREQUISITES_REQUIRED';
  end if;
  update public.opportunities set
    participation_audience=p_audience,
    participation_audience_details=case when p_audience='specific' then trim(p_audience_details) else null end,
    participation_prerequisites_required=coalesce(p_prerequisites_required,false),
    updated_at=now()
  where id=p_opportunity;
end $$;

-- Contrôle complémentaire des conditions, y compris sur une version de travail
-- non encore visible des étudiants.
create or replace function public.opportunity_missing_participation_fields(p_opportunity uuid)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  opportunity_row public.opportunities%rowtype;
  revision_payload jsonb;
  audience text;
  audience_details text;
  prerequisites_required boolean;
  prerequisites_text text;
  missing text[] := array[]::text[];
begin
  if not public.can_view_opportunity(p_opportunity) and not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;
  select * into opportunity_row from public.opportunities where id=p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
  select payload into revision_payload from public.opportunity_draft_revisions where opportunity_id=p_opportunity;

  audience:=coalesce(nullif(revision_payload->>'participation_audience',''),opportunity_row.participation_audience);
  audience_details:=coalesce(revision_payload->>'participation_audience_details',opportunity_row.participation_audience_details);
  prerequisites_required:=coalesce((revision_payload->>'participation_prerequisites_required')::boolean,opportunity_row.participation_prerequisites_required,false);
  prerequisites_text:=coalesce(revision_payload->>'prerequisites',opportunity_row.prerequisites);

  if audience not in ('all','specific') then
    missing:=array_append(missing,'conditions de participation');
  elsif audience='specific' and nullif(trim(audience_details),'') is null then
    missing:=array_append(missing,'public concerné');
  end if;
  if prerequisites_required and nullif(trim(prerequisites_text),'') is null then
    missing:=array_append(missing,'prérequis nécessaires');
  end if;
  return missing;
end $$;

create or replace function public.request_opportunity_review(
  p_opportunity uuid, p_desired_status text default 'published', p_desired_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare missing text[];
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.opportunities where id=p_opportunity) then raise exception 'NOT_FOUND'; end if;
  missing:=array_remove(public.opportunity_missing_required_fields(p_opportunity),'prérequis')
    || public.opportunity_missing_participation_fields(p_opportunity);
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

-- Les conditions d'une révision rejoignent la fiche publique uniquement au
-- moment de son approbation, comme les autres champs éditoriaux.
create or replace function public.apply_opportunity_revision_participation()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  next_audience text;
  current_audience_details text;
  current_prerequisites_required boolean;
begin
  if public.is_super_admin() and exists(
    select 1 from public.opportunity_review_requests request
    where request.opportunity_id=old.opportunity_id and request.status='pending'
  ) then
    select participation_audience,participation_audience_details,participation_prerequisites_required
      into next_audience,current_audience_details,current_prerequisites_required
    from public.opportunities where id=old.opportunity_id;
    next_audience:=coalesce(nullif(old.payload->>'participation_audience',''),next_audience,'all');
    update public.opportunities set
      participation_audience=next_audience,
      participation_audience_details=case when next_audience='specific' then coalesce(nullif(trim(old.payload->>'participation_audience_details'),''),current_audience_details) else null end,
      participation_prerequisites_required=coalesce((old.payload->>'participation_prerequisites_required')::boolean,current_prerequisites_required,false),
      updated_at=now()
    where id=old.opportunity_id;
  end if;
  return old;
end $$;

drop trigger if exists apply_opportunity_revision_participation on public.opportunity_draft_revisions;
create trigger apply_opportunity_revision_participation
before delete on public.opportunity_draft_revisions
for each row execute function public.apply_opportunity_revision_participation();

create or replace function public.enforce_complete_opportunity_publication()
returns trigger language plpgsql security definer set search_path = public as $$
declare missing text[];
begin
  if new.publication_status in ('published','scheduled') then
    missing:=array_remove(public.opportunity_missing_required_fields(new.id),'prérequis')
      || public.opportunity_missing_participation_fields(new.id);
    if cardinality(missing)>0 then raise exception 'REQUIRED_FIELDS:%',array_to_string(missing,', '); end if;
  end if;
  return new;
end $$;

revoke all on function public.set_opportunity_participation_conditions(uuid,text,text,boolean) from public;
revoke all on function public.opportunity_missing_participation_fields(uuid) from public;
grant execute on function public.set_opportunity_participation_conditions(uuid,text,text,boolean) to authenticated;
grant execute on function public.request_opportunity_review(uuid,text,timestamptz) to authenticated;

commit;
