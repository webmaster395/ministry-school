begin;

-- Le visuel bleu-violet a été retenu après comparaison dans la grille réelle.
-- Cette mise à jour ne touche ni aux réponses, ni aux scores, ni aux textes.
update public.app_catalog
set story_image_url = '/apps/grace-identity/fruit-spirit-blue-violet-grape-story-v26.png',
    post_image_url = '/apps/grace-identity/fruit-spirit-blue-violet-grape-post-v26.png',
    icon_url = '/apps/grace-identity/fruit-spirit-blue-violet-grape-story-v26.png',
    updated_at = now()
where slug = 'fruit-de-lesprit';

commit;
