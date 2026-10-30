begin;

-- L'ancien intitulé n'est plus présenté dans le programme.
update public.sessions set track = 'Projets et formations' where track = 'Services & Projets';

create table if not exists public.opportunity_creation_requests (
  token text primary key,
  created_by uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid unique references public.opportunities(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.opportunity_creation_requests enable row level security;

create or replace function public.claim_opportunity_creation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_request public.opportunity_creation_requests%rowtype;
begin
  if auth.uid() is null or not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_token), '') = '' then raise exception 'INVALID_TOKEN'; end if;
  insert into public.opportunity_creation_requests(token, created_by)
  values(trim(p_token), auth.uid()) on conflict(token) do nothing;
  if found then return jsonb_build_object('claimed', true, 'opportunity_id', null); end if;
  select * into v_request from public.opportunity_creation_requests where token = trim(p_token);
  if v_request.created_by <> auth.uid() then raise exception 'FORBIDDEN'; end if;
  if v_request.opportunity_id is null then raise exception 'CREATION_IN_PROGRESS'; end if;
  return jsonb_build_object('claimed', false, 'opportunity_id', v_request.opportunity_id);
end $$;

create or replace function public.bind_opportunity_creation(p_token text, p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.opportunity_creation_requests set opportunity_id = p_opportunity
  where token = trim(p_token) and created_by = auth.uid() and opportunity_id is null;
  if not found then raise exception 'CREATION_NOT_CLAIMED'; end if;
end $$;

grant execute on function public.claim_opportunity_creation(text) to authenticated;
grant execute on function public.bind_opportunity_creation(text,uuid) to authenticated;

-- Une affectation ne doit produire qu'un seul message par personne et par élément.
with duplicates as (
  select id, row_number() over (
    partition by recipient_id, opportunity_id, target_type order by created_at, id
  ) as position
  from public.announcements
  where target_type = 'opportunity_assignment'
    and recipient_id is not null
    and opportunity_id is not null
)
delete from public.announcements a using duplicates d
where a.id = d.id and d.position > 1;

create unique index if not exists announcements_unique_opportunity_assignment
  on public.announcements(recipient_id, opportunity_id, target_type)
  where target_type = 'opportunity_assignment'
    and recipient_id is not null
    and opportunity_id is not null;

create or replace function public.notify_opportunity_recipient(
  p_recipient uuid, p_opportunity uuid, p_title text, p_body text, p_cta text, p_type text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null then return; end if;
  insert into public.announcements(
    title, body, author_id, recipient_id, opportunity_id, is_system,
    target_url, target_type, target_id, cta_label
  ) values (
    p_title, p_body, auth.uid(), p_recipient, p_opportunity, true,
    '/gestion/projets-formations/' || p_opportunity::text, p_type, p_opportunity, p_cta
  ) on conflict do nothing;
end $$;

-- Les axes sont désormais une sélection simple : aucun commentaire éditorial n'est requis.
drop function if exists public.update_opportunity_content(
  uuid,text,text,text,text,text,text,integer,text[],text,text,text,text
);

create function public.update_opportunity_content(
  p_opportunity uuid, p_description text, p_objectives text, p_speakers text,
  p_prerequisites text, p_organization_material text, p_participant_material text,
  p_capacity integer, p_strategic_axes text[], p_strategic_contribution_former text,
  p_strategic_contribution_auberge text, p_strategic_contribution_fundraising text,
  p_strategic_axes_connection text
) returns void language plpgsql security definer set search_path = public as $$
declare v_axes text[] := coalesce(p_strategic_axes, array[]::text[]);
begin
  if not public.can_contribute_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_capacity is not null and p_capacity < 1 then raise exception 'INVALID_CAPACITY'; end if;
  if cardinality(v_axes) = 0 or not (v_axes <@ array['former', 'auberge', 'fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  update public.opportunities set
    description = p_description,
    objectives = p_objectives,
    speakers = p_speakers,
    prerequisites = p_prerequisites,
    organization_material = nullif(trim(p_organization_material), ''),
    participant_material = p_participant_material,
    capacity = p_capacity,
    strategic_axes = v_axes,
    strategic_contribution_former = null,
    strategic_contribution_auberge = null,
    strategic_contribution_fundraising = null,
    strategic_axes_connection = null,
    updated_at = now()
  where id = p_opportunity;
  update public.opportunity_dates set capacity = p_capacity where opportunity_id = p_opportunity;
end $$;

grant execute on function public.update_opportunity_content(
  uuid,text,text,text,text,text,text,integer,text[],text,text,text,text
) to authenticated;

create or replace function public.enforce_opportunity_review_publication()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.publication_status in ('published', 'scheduled') and (
    cardinality(coalesce(new.strategic_axes, array[]::text[])) = 0
    or not (new.strategic_axes <@ array['former', 'auberge', 'fundraising']::text[])
  ) then
    raise exception 'STRATEGIC_INFORMATION_REQUIRED';
  end if;
  if new.publication_status in ('published', 'scheduled')
     and (new.publication_status is distinct from old.publication_status or new.published_at is distinct from old.published_at)
     and not exists(
       select 1 from public.opportunity_review_requests r
       where r.opportunity_id = new.id and r.status = 'approved'
         and r.desired_publication_status = new.publication_status
         and (new.publication_status = 'published' or r.desired_published_at is not distinct from new.published_at)
     ) then
    raise exception 'REVIEW_REQUIRED';
  end if;
  return new;
end $$;

create or replace function public.delete_opportunity_admin(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.announcements where opportunity_id = p_opportunity;
  delete from public.opportunities where id = p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

grant execute on function public.delete_opportunity_admin(uuid) to authenticated;

commit;
