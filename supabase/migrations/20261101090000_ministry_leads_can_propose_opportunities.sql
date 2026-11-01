begin;

-- Un responsable ministériel peut proposer un projet ou une formation depuis
-- son espace Pilotage. La création reste un brouillon, lui est affectée comme
-- responsable et ne lui confère aucun droit de validation ou de publication.
create or replace function public.can_create_opportunities(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user)
    or exists(
      select 1 from public.profiles profile
      where profile.id = p_user
        and (
          profile.can_create_opportunities
          or profile.ministry_lead_of is not null
        )
    )
$$;

commit;
