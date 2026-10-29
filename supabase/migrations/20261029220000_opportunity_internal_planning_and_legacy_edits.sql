begin;

-- Les anciennes initiatives peuvent être complétées progressivement. La validation
-- éditoriale reste assurée par les RPC d'édition et avant toute publication.
alter table public.opportunities drop constraint if exists opportunities_strategic_axes_check;

drop function if exists public.update_opportunity_content(
  uuid,text,text,text,text,text,text,text[],text,text,text,text
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
    prerequisites = p_prerequisites, organization_material = nullif(trim(p_organization_material), ''),
    participant_material = p_participant_material, capacity = p_capacity,
    strategic_axes = v_axes,
    strategic_contribution_former = case when 'former' = any(v_axes) then nullif(trim(p_strategic_contribution_former), '') else null end,
    strategic_contribution_auberge = case when 'auberge' = any(v_axes) then nullif(trim(p_strategic_contribution_auberge), '') else null end,
    strategic_contribution_fundraising = case when 'fundraising' = any(v_axes) then nullif(trim(p_strategic_contribution_fundraising), '') else null end,
    strategic_axes_connection = case when cardinality(v_axes) >= 2 then nullif(trim(p_strategic_axes_connection), '') else null end,
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
  if new.publication_status in ('published', 'scheduled')
     and (
       cardinality(coalesce(new.strategic_axes, array[]::text[])) = 0
       or not (new.strategic_axes <@ array['former', 'auberge', 'fundraising']::text[])
       or ('former' = any(new.strategic_axes) and coalesce(trim(new.strategic_contribution_former), '') = '')
       or ('auberge' = any(new.strategic_axes) and coalesce(trim(new.strategic_contribution_auberge), '') = '')
       or ('fundraising' = any(new.strategic_axes) and coalesce(trim(new.strategic_contribution_fundraising), '') = '')
       or (cardinality(new.strategic_axes) >= 2 and coalesce(trim(new.strategic_axes_connection), '') = '')
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

commit;
