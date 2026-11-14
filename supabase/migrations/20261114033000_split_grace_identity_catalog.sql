begin;

-- Les réponses restent dans grace_identity_assessments. Cette migration ne
-- déplace aucun résultat : elle scinde uniquement la fiche de configuration
-- historique afin que chaque test soit administrable indépendamment.
with source as (
  select * from public.app_catalog where slug = 'je-suis-par-la-grace-de-dieu'
), tools(slug, name, description, destination, result_url, story_image, post_image, display_order, integration_key) as (
  values
    ('fruit-de-lesprit', 'Fruit de l''Esprit', 'Découvre comment le fruit de l''Esprit se manifeste dans ton quotidien.', '/apps/je-suis-par-la-grace-de-dieu?test=fruit', '/etudiant/identite/fruit-de-lesprit', '/apps/grace-identity/fruit-spirit-purple-lime-story-v23.png', '/apps/grace-identity/fruit-spirit-purple-lime-post-v23.png', 40, 'grace-identity-fruit'),
    ('dons-spirituels', 'Dons spirituels', 'Explore les dons spirituels qui se manifestent et ceux que tu peux développer.', '/apps/je-suis-par-la-grace-de-dieu?test=gifts', '/etudiant/identite/dons-spirituels', '/identity/posts/dons-spirituels.webp', '/identity/posts/dons-spirituels.webp', 41, 'grace-identity-gifts'),
    ('competences-naturelles', 'Compétences naturelles', 'Identifie tes forces et les compétences que tu souhaites faire grandir.', '/apps/je-suis-par-la-grace-de-dieu?test=skills', '/etudiant/identite/competences-naturelles', '/identity/posts/competences-naturelles.webp', '/identity/posts/competences-naturelles.webp', 42, 'grace-identity-skills')
)
insert into public.app_catalog (
  slug, name, short_description, category, icon_url, destination_url, status,
  display_order, integration_key, public_enabled, public_publish_at,
  student_enabled, student_publish_at, display_title, long_description, tags,
  result_url, tool_type, story_title, story_image_url, story_destination_url,
  story_order, post_title, post_image_url, post_destination_url, post_order,
  resource_title, resource_description, resource_image_url, resource_category,
  resource_tags, resource_destination_url, resource_order, placement_story,
  placement_post, placement_resources, placement_work, placement_ministry,
  tracking_mode, access_scope, allowed_user_ids, allowed_ministry_ids,
  public_access, featured, featured_generation
)
select
  tools.slug, tools.name, tools.description, 'Identité', tools.story_image,
  tools.destination, source.status, tools.display_order, tools.integration_key,
  source.public_enabled, source.public_publish_at, source.student_enabled,
  source.student_publish_at, tools.name, tools.description,
  array['identité', 'test']::text[], tools.result_url, 'test', tools.name,
  tools.story_image, tools.destination, tools.display_order, tools.name,
  tools.post_image, tools.destination, tools.display_order, tools.name,
  tools.description, tools.post_image, 'Identité', array['identité']::text[],
  tools.destination, tools.display_order, true, true, false, true, false,
  'result', source.access_scope, source.allowed_user_ids,
  source.allowed_ministry_ids, false, false, 1
from source cross join tools
on conflict (slug) do nothing;

-- L'ancienne fiche composite reste archivée et restaurable. Elle n'est plus
-- proposée dans l'interface, ce qui évite de modifier trois outils à la fois.
update public.app_catalog
set archived_at = coalesce(archived_at, now()),
    status = 'disabled',
    public_enabled = false,
    student_enabled = false
where slug = 'je-suis-par-la-grace-de-dieu'
  and (select count(*) from public.app_catalog where slug in ('fruit-de-lesprit','dons-spirituels','competences-naturelles')) = 3;

commit;
