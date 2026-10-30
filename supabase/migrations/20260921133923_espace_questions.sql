create table public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('organisation', 'ministeres', 'technique')),
  subject text not null,
  body text not null,
  status text not null default 'nouvelle' check (status in ('nouvelle', 'traitee')),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index questions_status_idx on public.questions (status, created_at desc);
alter table public.questions enable row level security;

create policy "questions posées par leur auteur" on public.questions for insert to authenticated
  with check (user_id = auth.uid() and status = 'nouvelle');
create policy "questions lues par leur auteur et l'admin" on public.questions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "questions traitées par l'admin" on public.questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());;
