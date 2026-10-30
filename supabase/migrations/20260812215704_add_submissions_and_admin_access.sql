
-- Rendu de devoirs
create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table submissions enable row level security;

create policy "submissions student manages own" on submissions
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy "submissions teacher reads for own sessions" on submissions
  for select to authenticated using (
    exists (
      select 1 from assignments a
      join sessions s on s.id = a.session_id
      where a.id = submissions.assignment_id and s.teacher_id = auth.uid()
    )
  );

-- Vue transversale "intervenant" : tout enseignant peut lire tous les supports et consignes
create policy "materials readable by any teacher" on materials
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

create policy "assignments readable by any teacher" on assignments
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

-- Espace administrateur : accès global en lecture
create policy "profiles readable by admin" on profiles
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "sessions readable by admin" on sessions
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "materials readable by admin" on materials
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "assignments readable by admin" on assignments
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "enrollments readable by admin" on enrollments
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "submissions readable by admin" on submissions
  for select to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
;
