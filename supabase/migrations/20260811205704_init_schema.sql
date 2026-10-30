
-- Ministères
create table ministries (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null
);

insert into ministries (slug, name) values
  ('apotre', 'Apôtre'),
  ('prophete', 'Prophète'),
  ('evangeliste', 'Évangéliste'),
  ('pasteur', 'Pasteur'),
  ('docteur', 'Docteur');

-- Profils (1-1 avec auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')),
  ministry_id uuid references ministries(id),
  preferred_day text check (preferred_day in ('samedi', 'dimanche')),
  created_at timestamptz not null default now()
);

-- Séances de cours
create table sessions (
  id uuid primary key default gen_random_uuid(),
  ministry_id uuid not null references ministries(id),
  teacher_id uuid references profiles(id),
  session_date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  room text,
  day text not null check (day in ('samedi', 'dimanche')),
  created_at timestamptz not null default now()
);

-- Inscriptions étudiant <-> séance
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  session_id uuid not null references sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, session_id)
);

-- Supports de cours
create table materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  title text not null,
  file_url text,
  link_url text,
  visible_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Consignes / devoirs liés à une séance
create table assignments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  instructions text not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table ministries enable row level security;
alter table profiles enable row level security;
alter table sessions enable row level security;
alter table enrollments enable row level security;
alter table materials enable row level security;
alter table assignments enable row level security;

-- Ministères : lecture publique aux authentifiés
create policy "ministries readable by authenticated" on ministries
  for select to authenticated using (true);

-- Profils : chacun voit son propre profil ; un enseignant voit les profils des étudiants inscrits à ses séances
create policy "profiles self read" on profiles
  for select to authenticated using (auth.uid() = id);

create policy "profiles teacher reads enrolled students" on profiles
  for select to authenticated using (
    exists (
      select 1 from enrollments e
      join sessions s on s.id = e.session_id
      where e.student_id = profiles.id and s.teacher_id = auth.uid()
    )
  );

create policy "profiles self update" on profiles
  for update to authenticated using (auth.uid() = id);

-- Séances : lecture publique aux authentifiés
create policy "sessions readable by authenticated" on sessions
  for select to authenticated using (true);

create policy "sessions teacher manages own" on sessions
  for update to authenticated using (teacher_id = auth.uid());

-- Inscriptions : étudiant voit les siennes, enseignant voit celles de ses séances
create policy "enrollments student reads own" on enrollments
  for select to authenticated using (student_id = auth.uid());

create policy "enrollments teacher reads for own sessions" on enrollments
  for select to authenticated using (
    exists (select 1 from sessions s where s.id = enrollments.session_id and s.teacher_id = auth.uid())
  );

-- Supports : étudiant voit s'il est inscrit et visible_at atteint ; enseignant voit/gère les siens
create policy "materials student reads when visible" on materials
  for select to authenticated using (
    visible_at <= now()
    and exists (
      select 1 from enrollments e where e.session_id = materials.session_id and e.student_id = auth.uid()
    )
  );

create policy "materials teacher full read" on materials
  for select to authenticated using (
    exists (select 1 from sessions s where s.id = materials.session_id and s.teacher_id = auth.uid())
  );

create policy "materials teacher insert" on materials
  for insert to authenticated with check (
    exists (select 1 from sessions s where s.id = materials.session_id and s.teacher_id = auth.uid())
  );

create policy "materials teacher update" on materials
  for update to authenticated using (
    exists (select 1 from sessions s where s.id = materials.session_id and s.teacher_id = auth.uid())
  );

-- Consignes : mêmes règles de visibilité que les supports côté étudiant (toujours visibles une fois créées)
create policy "assignments student reads" on assignments
  for select to authenticated using (
    exists (
      select 1 from enrollments e where e.session_id = assignments.session_id and e.student_id = auth.uid()
    )
  );

create policy "assignments teacher full read" on assignments
  for select to authenticated using (
    exists (select 1 from sessions s where s.id = assignments.session_id and s.teacher_id = auth.uid())
  );

create policy "assignments teacher insert" on assignments
  for insert to authenticated with check (
    exists (select 1 from sessions s where s.id = assignments.session_id and s.teacher_id = auth.uid())
  );
;
