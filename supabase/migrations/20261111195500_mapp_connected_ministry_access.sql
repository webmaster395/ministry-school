begin;

-- Profil MAPP est ouvert à tout compte Ministry authentifié et actif.
-- Cette règle est indépendante de la publication de Fruit de l'Esprit,
-- qui reste réservée aux super-administrateurs dans l'application.
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
      and not coalesce(profile.deactivated, false)
  );
$$;

revoke all on function mapp.current_student_is_eligible() from public, anon;
grant execute on function mapp.current_student_is_eligible() to authenticated;
comment on function mapp.current_student_is_eligible() is
  'Autorise tout compte Ministry authentifié et actif à ouvrir ou reprendre Profil MAPP.';

commit;
