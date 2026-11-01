-- Les applications restent déployées et stockées indépendamment. Le portail
-- les ouvre désormais par les routes publiques du domaine Ministry School.
alter table public.app_catalog drop constraint if exists app_catalog_destination_url_check;
alter table public.app_catalog add constraint app_catalog_destination_url_check
  check (destination_url ~ '^https?://' or destination_url ~ '^/apps/');

update public.app_catalog
set destination_url = '/apps/generopoly'
where slug = 'generopoly';

update public.app_catalog
set destination_url = '/apps/profil-mapp'
where slug = 'profil-mapp';
