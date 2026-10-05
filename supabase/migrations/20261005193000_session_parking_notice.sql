alter table public.sessions
  add column if not exists show_parking_notice boolean not null default true;

comment on column public.sessions.show_parking_notice is
  'Affiche l’information parking sur l’accueil étudiant pour la journée concernée.';
