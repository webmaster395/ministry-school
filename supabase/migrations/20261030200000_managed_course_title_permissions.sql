begin;

-- Correctif de déploiement incrémental : les admins classiques consultent les
-- cours depuis Admin, sans hériter d'un droit d'écriture opérationnel.
create or replace function public.can_view_managed_course(
  p_session uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin(p_user) or exists(
    select 1 from public.sessions session
    where session.id=p_session and (
      (session.session_type='ministere' and public.is_strict_pilotage_for(session.ministry_id,p_user))
      or (session.opportunity_id is not null and public.can_view_opportunity(session.opportunity_id,p_user))
    )
  )
$$;

-- Le titre de la matière reste synchronisé avec la séance pour les responsables
-- et contributeurs explicitement autorisés à modifier ce cours.
drop policy if exists courses_managed_update on public.courses;
create policy courses_managed_update on public.courses for update to authenticated
using (
  public.is_platform_admin()
  or exists(
    select 1 from public.sessions session
    where session.course_id=courses.id and public.can_edit_ministry_course(session.id)
  )
) with check (
  public.is_platform_admin()
  or exists(
    select 1 from public.sessions session
    where session.course_id=courses.id and public.can_edit_ministry_course(session.id)
  )
);

grant execute on function public.can_view_managed_course(uuid,uuid) to authenticated;

commit;
