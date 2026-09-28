-- Le compte de démonstration administrateur ne doit pas être compté dans une sensibilité.
-- À exécuter dans Supabase > SQL Editor.
update public.profiles
set ministry_id = null
where id in (
  select id
  from auth.users
  where lower(email) = 'admin.demo@ministryschool.app'
);
