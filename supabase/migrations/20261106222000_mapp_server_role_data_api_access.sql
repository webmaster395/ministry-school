begin;

-- Le schema est utilise exclusivement par les routes serveur Ministry avec la
-- cle service_role. anon ne recoit aucun droit et authenticated conserve
-- uniquement ses droits/RLS historiques.
grant usage on schema mapp to service_role;
grant all privileges on all tables in schema mapp to service_role;
grant all privileges on all sequences in schema mapp to service_role;
grant all privileges on all routines in schema mapp to service_role;
alter default privileges for role postgres in schema mapp grant all privileges on tables to service_role;
alter default privileges for role postgres in schema mapp grant all privileges on sequences to service_role;
alter default privileges for role postgres in schema mapp grant all privileges on routines to service_role;
notify pgrst, 'reload schema';

commit;
