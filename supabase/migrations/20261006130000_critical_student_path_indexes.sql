-- Index à faible risque pour les parcours Home → Cours → Ressources → Travail.
-- Ils reprennent exactement les filtres/ordres utilisés par l'application et ne
-- modifient ni les données, ni les droits, ni les politiques RLS.

create index if not exists assignments_session_sort_created_idx
  on public.assignments (session_id, sort_order, created_at desc);

create index if not exists materials_session_visible_sort_idx
  on public.materials (session_id, visible_at, sort_order);

create index if not exists assignment_completions_user_assignment_idx
  on public.assignment_completions (user_id, assignment_id);
