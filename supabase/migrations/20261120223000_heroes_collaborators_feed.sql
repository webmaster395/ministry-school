begin;

do $$
begin
  if not exists (
    select 1
    from public.user_lists
    where lower(trim(name)) = lower('Collaborateurs')
  ) then
    raise exception 'COLLABORATORS_LIST_REQUIRED';
  end if;
end $$;

-- Le formulaire est proposé comme publication « À faire » uniquement aux
-- Collaborateurs. L'ouverture est enregistrée par /etudiant/outils/.../ouvrir
-- et ne vaut jamais confirmation d'envoi du formulaire.
update public.app_catalog
set status = 'published',
    student_enabled = true,
    student_publish_at = null,
    archived_at = null,
    access_scope = 'students',
    allowed_user_ids = '{}'::uuid[],
    allowed_ministry_ids = '{}'::uuid[],
    destination_url = 'https://docs.google.com/forms/d/1eBDRa5df-3TFhygN02K9sxcP_QzywsIjsYkYYwWrwMg/preview',
    post_destination_url = 'https://docs.google.com/forms/d/1eBDRa5df-3TFhygN02K9sxcP_QzywsIjsYkYYwWrwMg/preview',
    tool_type = 'external',
    tracking_mode = 'result',
    identity_result_mode = 'manual',
    identity_importance = 'priority',
    result_provider = 'heroes-motors',
    placement_post = true,
    post_order = 15,
    post_image_url = coalesce(post_image_url, '/identity/heroes/dove-abstract-v1.webp'),
    post_description = coalesce(
      nullif(post_description, ''),
      'Découvre les héros bibliques qui reflètent tes moteurs personnels.'
    )
where slug = 'test-des-heros';

insert into public.resource_access_controls(
  resource_type, resource_id, visibility_mode, created_at, updated_at
)
select 'app_catalog', app.id, 'selected_lists', now(), now()
from public.app_catalog app
where app.slug = 'test-des-heros'
on conflict(resource_type, resource_id) do update set
  visibility_mode = 'selected_lists',
  updated_at = now();

delete from public.resource_access_lists selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug = 'test-des-heros';

delete from public.resource_access_categories selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug = 'test-des-heros';

delete from public.resource_access_users selected
using public.app_catalog app
where selected.resource_type = 'app_catalog'
  and selected.resource_id = app.id
  and app.slug = 'test-des-heros';

insert into public.resource_access_lists(resource_type, resource_id, list_id)
select 'app_catalog', app.id, collaborators.id
from public.app_catalog app
cross join public.user_lists collaborators
where app.slug = 'test-des-heros'
  and lower(trim(collaborators.name)) = lower('Collaborateurs')
on conflict(resource_type, resource_id, list_id) do nothing;

commit;
