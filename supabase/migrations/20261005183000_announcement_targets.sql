alter table public.announcements
  add column if not exists target_url text,
  add column if not exists target_type text,
  add column if not exists target_id uuid,
  add column if not exists cta_label text;

create index if not exists announcements_content_target_idx
  on public.announcements (session_id, target_type, created_at desc)
  where is_system = true;

comment on column public.announcements.target_url is
  'Destination interne du CTA étudiant, avec ancre de section si nécessaire.';
comment on column public.announcements.target_type is
  'Type générique de contenu ciblé : course, resource ou assignment.';
comment on column public.announcements.target_id is
  'Identifiant du contenu à l’origine de la notification, conservé pour le contexte et l’audit.';
comment on column public.announcements.cta_label is
  'Libellé du bouton affiché dans le message étudiant.';
