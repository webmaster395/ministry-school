begin;

-- PostgREST rejetait tous les appels server-side .schema("mapp") avec PGRST106.
-- L'exposition rend le schema adressable, mais n'accorde aucun droit anon :
-- les tables restent sous RLS et les fonctions invitees restent service_role only.
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, mapp';
notify pgrst, 'reload config';

commit;
