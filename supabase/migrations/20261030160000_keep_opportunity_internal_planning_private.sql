begin;

-- Le matériel interne reste dans opportunity_internal_planning : aucun rôle
-- opérationnel ne peut le recopier dans la fiche publique.
create or replace function public.update_opportunity_content(
  p_opportunity uuid, p_description text, p_objectives text, p_speakers text,
  p_prerequisites text, p_organization_material text, p_participant_material text,
  p_capacity integer, p_strategic_axes text[], p_strategic_contribution_former text,
  p_strategic_contribution_auberge text, p_strategic_contribution_fundraising text,
  p_strategic_axes_connection text
) returns void language plpgsql security definer set search_path = public as $$
declare v_axes text[] := coalesce(p_strategic_axes,array[]::text[]);
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_capacity is not null and p_capacity < 1 then raise exception 'INVALID_CAPACITY'; end if;
  if cardinality(v_axes)=0 or not (v_axes <@ array['former','auberge','fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  update public.opportunities set
    description=p_description,objectives=p_objectives,speakers=p_speakers,
    prerequisites=p_prerequisites,organization_material=null,
    participant_material=p_participant_material,capacity=p_capacity,
    strategic_axes=v_axes,strategic_contribution_former=null,
    strategic_contribution_auberge=null,strategic_contribution_fundraising=null,
    strategic_axes_connection=null,updated_at=now()
  where id=p_opportunity;
  update public.opportunity_dates set capacity=p_capacity where opportunity_id=p_opportunity;
  if public.can_review_editorial_content() then
    perform public.set_opportunity_internal_material(p_opportunity,p_organization_material);
  end if;
end $$;

commit;
