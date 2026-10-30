alter table public.assignments add column if not exists kind text;
alter table public.assignments add column if not exists duration_min int;
alter table public.assignments add column if not exists due_at timestamptz;

-- Suivi personnel : chaque étudiant coche ses propres travaux
create table if not exists public.assignment_completions (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (assignment_id, user_id)
);
alter table public.assignment_completions enable row level security;

create policy "completions lues par leur auteur" on public.assignment_completions
  for select to authenticated using (user_id = auth.uid());
create policy "completions créées par leur auteur" on public.assignment_completions
  for insert to authenticated with check (user_id = auth.uid());
create policy "completions supprimées par leur auteur" on public.assignment_completions
  for delete to authenticated using (user_id = auth.uid());

-- Les séances du tronc commun et des parcours ne passent pas par une inscription :
-- leurs consignes sont lisibles par tous les utilisateurs connectés.
create policy "assignments lisibles sur les séances communes" on public.assignments
  for select to authenticated
  using (exists (select 1 from public.sessions s where s.id = assignments.session_id and s.session_type = 'commun'));

-- Un enseignant ou un administrateur peut donner une consigne sur n'importe quelle séance
create policy "assignments insérables par enseignants et admins" on public.assignments
  for insert to authenticated
  with check (((auth.jwt() -> 'app_metadata') ->> 'role') in ('teacher','admin'));;
