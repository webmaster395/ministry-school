
-- Suivi des notifications non lues côté étudiant
alter table profiles add column notifications_seen_at timestamptz not null default now();

-- Renommage "Palier" -> "Socle" dans les données existantes
update paliers set label = replace(label, 'Palier', 'Socle');

-- Libellé libre éditable par l'enseignant, affiché à la place des dates figées
alter table paliers add column custom_label text;

-- Un enseignant peut renseigner ce libellé (structure partagée, pas de propriétaire unique)
create policy "paliers updatable by teacher" on paliers
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'teacher');
;
