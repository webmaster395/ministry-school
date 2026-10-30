begin;

-- Deux soumissions identiques ont créé deux brouillons de cet atelier.
-- On conserve la première fiche créée et on retire uniquement les copies suivantes.
create temporary table duplicate_ai_workshop_ids on commit drop as
select id
from (
  select
    id,
    row_number() over (order by created_at asc, id asc) as copy_number
  from public.opportunities
  where lower(trim(title)) = lower(trim('Atelier IA : Création d’images et de miniatures YouTube avec Claude'))
    and publication_status = 'draft'
    and is_project = true
    and is_training = true
) candidates
where copy_number > 1;

delete from public.announcements a
using duplicate_ai_workshop_ids d
where a.opportunity_id = d.id;

delete from public.opportunities o
using duplicate_ai_workshop_ids d
where o.id = d.id;

commit;
