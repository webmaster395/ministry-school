begin;

-- La galerie « Mes résultats » est un emplacement étudiant permanent. Le
-- réglage global historique avait été créé à false, ce qui pouvait vider tout
-- le flux même lorsque chaque outil était correctement publié.
insert into public.app_studio_settings(singleton, student_tools_enabled, updated_at)
values(true, true, now())
on conflict(singleton) do update set
  student_tools_enabled = true,
  updated_at = now();

-- Ces quatre outils constituent le socle commun demandé pour tous les comptes
-- actifs. Ils restent privés aux utilisateurs authentifiés : public_enabled
-- n'est volontairement pas modifié.
update public.app_catalog
set status = 'published',
    student_enabled = true,
    student_publish_at = null,
    archived_at = null,
    access_scope = 'students',
    allowed_user_ids = '{}'::uuid[],
    allowed_ministry_ids = '{}'::uuid[]
where slug in ('profil-mapp', 'test-des-heros', 'generopoly', 'ma-generosite');

-- Profil MAPP : À faire avant réalisation, puis remplacé par le résultat.
update public.app_catalog
set tool_type = 'test',
    tracking_mode = 'result',
    identity_result_mode = 'automatic',
    identity_importance = 'priority',
    result_provider = 'mapp',
    placement_post = true,
    post_order = 10,
    post_description = coalesce(nullif(post_description, ''), short_description)
where slug = 'profil-mapp';

-- Test des héros : aucune carte À faire. La publication apparaît uniquement
-- lorsqu'un portrait est réellement publié et visible par l'administration.
update public.app_catalog
set tool_type = 'external',
    tracking_mode = 'result',
    identity_result_mode = 'manual',
    identity_importance = 'priority',
    result_provider = 'heroes-motors',
    placement_post = false,
    post_order = 15,
    post_image_url = coalesce(post_image_url, '/identity/heroes/dove-abstract-v1.webp')
where slug = 'test-des-heros';

-- Les deux liens sans résultat sont affichés À faire jusqu'à leur première
-- ouverture depuis le feed. record_app_open conserve cet état par utilisateur.
update public.app_catalog
set tool_type = 'external',
    tracking_mode = 'none',
    identity_result_mode = 'none',
    identity_importance = 'recommended',
    result_provider = null,
    placement_post = true,
    post_order = case slug when 'generopoly' then 20 else 30 end,
    post_description = coalesce(nullif(post_description, ''), short_description)
where slug in ('generopoly', 'ma-generosite');

-- « Tous les utilisateurs » remplace les anciennes audiences de listes ou de
-- personnes pour ces quatre outils seulement. Les listes et leurs membres ne
-- sont ni modifiés ni supprimés.
insert into public.resource_access_controls(resource_type, resource_id, visibility_mode, created_at, updated_at)
select 'app_catalog', app.id, 'all_authenticated', now(), now()
from public.app_catalog app
where app.slug in ('profil-mapp', 'test-des-heros', 'generopoly', 'ma-generosite')
on conflict(resource_type, resource_id) do update set
  visibility_mode = 'all_authenticated',
  updated_at = now();

delete from public.resource_access_lists selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug in ('profil-mapp', 'test-des-heros', 'generopoly', 'ma-generosite');

delete from public.resource_access_categories selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug in ('profil-mapp', 'test-des-heros', 'generopoly', 'ma-generosite');

delete from public.resource_access_users selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug in ('profil-mapp', 'test-des-heros', 'generopoly', 'ma-generosite');

commit;
