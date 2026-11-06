begin;

-- Les étudiants restent soumis à la publication et à l'activation MAPP.
-- Un super-administrateur actif et confirmé peut valider le parcours avant
-- publication. Le contrôle est effectué en base, pas seulement dans l'interface.
create or replace function mapp.current_student_is_eligible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.email_confirmed
      and not coalesce(profile.deactivated, false)
      and (
        (
          profile.role = 'student'
          and exists (
            select 1
            from public.app_catalog app
            where app.slug = 'profil-mapp'
              and app.archived_at is null
              and app.status in ('scheduled', 'published')
              and app.student_enabled
              and (app.student_publish_at is null or app.student_publish_at <= now())
          )
        )
        or public.is_super_admin(profile.id)
      )
  );
$$;

revoke all on function mapp.current_student_is_eligible() from public, anon;
grant execute on function mapp.current_student_is_eligible() to authenticated;

-- La fonction complète reste identique à la version native, à l'exception de
-- la porte d'activation de la session ci-dessous. Cette substitution ciblée
-- est appliquée par la migration finale générée avec la fonction complète.
comment on function mapp.current_student_is_eligible() is
  'Autorise un étudiant actif confirmé seulement après publication catalogue, ou un super-administrateur actif confirmé pour la prévisualisation MAPP.';

commit;
