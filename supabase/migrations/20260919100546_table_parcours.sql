create table if not exists public.parcours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  period_label text not null,
  schedule_label text not null,
  planned_sessions int not null,
  note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.parcours enable row level security;

create policy "parcours lisibles par les utilisateurs connectés"
  on public.parcours for select to authenticated using (true);

insert into public.parcours (slug, title, description, period_label, schedule_label, planned_sessions, note, sort_order) values
  ('coeur', 'Formation du cœur', 'Grandir dans sa relation avec Dieu et construire une vie intérieure solide.', 'Octobre à juin', '9 h 30–11 h', 9, 'Un rendez-vous chaque mois pendant toute l''année.', 1),
  ('caractere', 'Formation du caractère', 'Former son caractère pour servir avec fidélité, maturité et responsabilité.', 'Octobre à décembre', '11 h 30–13 h', 3, 'Ce parcours se termine en décembre.', 2),
  ('sensibilite', 'Sensibilité ministérielle', 'Approfondir sa sensibilité et ses pratiques dans le ministère auquel on est orienté.', 'Janvier à juin', '11 h 30–13 h', 6, 'Remplace la Formation du caractère à partir de janvier.', 3);;
