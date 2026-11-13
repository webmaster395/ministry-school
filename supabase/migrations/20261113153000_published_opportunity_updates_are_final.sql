begin;

-- Une fiche déjà publiée ne doit plus repasser en validation. Les anciennes
-- demandes restées ouvertes sont clôturées afin que save_opportunity_form
-- applique immédiatement la prochaine sauvegarde à la version étudiante.
update public.opportunity_review_requests request
set status = 'approved',
    resolved_at = coalesce(request.resolved_at, now()),
    updated_at = now(),
    correction_message = null
from public.opportunities opportunity
where opportunity.id = request.opportunity_id
  and opportunity.publication_status in ('published', 'scheduled')
  and request.status in ('pending', 'changes_requested');

-- Après la première publication, un contributeur explicitement autorisé à
-- modifier possède le même droit de sauvegarde directe qu'un responsable.
-- Avant publication, seul le responsable (ou un super admin) peut soumettre.
create or replace function public.can_submit_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1
    from public.opportunity_assignments assignment
    join public.opportunities opportunity on opportunity.id = assignment.opportunity_id
    where assignment.opportunity_id = p_opportunity
      and assignment.user_id = p_user
      and (
        assignment.responsibility = 'manager'
        or (
          assignment.can_edit
          and opportunity.publication_status in ('published', 'scheduled')
        )
      )
  )
$$;

grant execute on function public.can_submit_opportunity(uuid,uuid) to authenticated;

commit;
