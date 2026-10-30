
-- Un cours est une matière (ex. « Fondements du prophétique »).
-- Une séance est une occurrence datée de ce cours.
create table courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ministry_id uuid references ministries(id),
  socle_id uuid references paliers(id),
  description text,
  objectives text,
  created_at timestamptz not null default now()
);

alter table sessions add column course_id uuid references courses(id) on delete set null;
alter table sessions add column objectives text;

alter table courses enable row level security;

create policy "courses readable by authenticated" on courses
  for select to authenticated using (true);

create policy "courses insertable by admin" on courses
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "courses deletable by admin" on courses
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admin et enseignants peuvent enrichir la fiche (objectifs, description)
create policy "courses updatable by staff" on courses
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'teacher'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'teacher'));
;
