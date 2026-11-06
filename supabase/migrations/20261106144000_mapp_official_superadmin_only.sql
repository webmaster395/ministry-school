begin;

-- Prévisualisation du véritable hybrid-44 : aucune ouverture étudiante avant
-- une décision de publication explicite. Les données et anciennes sessions
-- restent intactes.
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
      and public.is_super_admin(profile.id)
  );
$$;

revoke all on function mapp.current_student_is_eligible() from public, anon;
grant execute on function mapp.current_student_is_eligible() to authenticated;
comment on function mapp.current_student_is_eligible() is
  'Prévisualisation hybrid-44 réservée aux super-administrateurs actifs et confirmés.';

commit;
