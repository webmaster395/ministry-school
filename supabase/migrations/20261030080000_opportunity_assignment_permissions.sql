begin;

-- Un responsable et un contributeur affectés peuvent gérer la fiche concernée.
-- L'administrateur de la plateforme conserve un accès global.
create or replace function public.can_manage_opportunity(
  p_opportunity uuid,
  p_user uuid default auth.uid()
) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_platform_admin(p_user) or exists(
    select 1
    from public.opportunity_assignments a
    where a.opportunity_id = p_opportunity
      and a.user_id = p_user
      and a.responsibility in ('manager', 'contributor')
  )
$$;

create or replace function public.can_contribute_opportunity(
  p_opportunity uuid,
  p_user uuid default auth.uid()
) returns boolean
language sql stable security definer set search_path = public
as $$
  select public.can_manage_opportunity(p_opportunity, p_user)
$$;

-- Le nom historique de la RPC est conservé pour ne pas casser les clients déjà
-- déployés, mais son contrôle porte désormais sur l'affectation ou le rôle admin.
create or replace function public.delete_opportunity_admin(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_contribute_opportunity(p_opportunity) then
    raise exception 'FORBIDDEN';
  end if;
  delete from public.announcements where opportunity_id = p_opportunity;
  delete from public.opportunities where id = p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

grant execute on function public.can_manage_opportunity(uuid,uuid) to authenticated;
grant execute on function public.can_contribute_opportunity(uuid,uuid) to authenticated;
grant execute on function public.delete_opportunity_admin(uuid) to authenticated;

commit;
