begin;

-- Les besoins matériels d'organisation sont des données internes réservées à
-- Nathalie et Flora. Ils quittent la ligne publique de l'opportunité afin de ne
-- jamais être exposés aux étudiants, responsables ou contributeurs.
create table if not exists public.opportunity_internal_planning (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  organization_material text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.opportunity_internal_planning(opportunity_id, organization_material, updated_at)
select id, organization_material, now()
from public.opportunities
where nullif(trim(organization_material), '') is not null
on conflict(opportunity_id) do update set
  organization_material = excluded.organization_material,
  updated_at = excluded.updated_at;

update public.opportunities set organization_material = null
where organization_material is not null;

do $$ begin
  if not exists(
    select 1 from pg_constraint
    where conname = 'opportunities_no_public_organization_material'
      and conrelid = 'public.opportunities'::regclass
  ) then
    alter table public.opportunities
      add constraint opportunities_no_public_organization_material
      check (organization_material is null);
  end if;
end $$;

alter table public.opportunity_internal_planning enable row level security;

create policy opportunity_internal_planning_reviewers_read
on public.opportunity_internal_planning for select to authenticated
using (public.can_review_editorial_content());

create policy opportunity_internal_planning_reviewers_write
on public.opportunity_internal_planning for all to authenticated
using (public.can_review_editorial_content())
with check (public.can_review_editorial_content());

create or replace function public.opportunity_internal_material(p_opportunity uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare v_material text;
begin
  if not public.can_review_editorial_content() then raise exception 'FORBIDDEN'; end if;
  select organization_material into v_material
  from public.opportunity_internal_planning
  where opportunity_id = p_opportunity;
  return v_material;
end $$;

create or replace function public.set_opportunity_internal_material(
  p_opportunity uuid,
  p_organization_material text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_review_editorial_content() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.opportunities where id = p_opportunity) then
    raise exception 'NOT_FOUND';
  end if;
  insert into public.opportunity_internal_planning(
    opportunity_id, organization_material, updated_at, updated_by
  ) values (
    p_opportunity, nullif(trim(p_organization_material), ''), now(), auth.uid()
  ) on conflict(opportunity_id) do update set
    organization_material = excluded.organization_material,
    updated_at = now(),
    updated_by = auth.uid();
end $$;

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
    organization_material = null,
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

  if public.can_review_editorial_content() then
    perform public.set_opportunity_internal_material(p_opportunity, p_organization_material);
  end if;
end $$;

grant execute on function public.opportunity_internal_material(uuid) to authenticated;
grant execute on function public.set_opportunity_internal_material(uuid,text) to authenticated;
grant execute on function public.update_opportunity_content(
  uuid,text,text,text,text,text,text,integer,text[],text,text,text,text
) to authenticated;

commit;
