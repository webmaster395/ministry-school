begin;

-- Trois autoévaluations indépendantes. Une seule ligne par personne et par test
-- évite les doublons tout en gardant une sauvegarde compacte.
create table if not exists public.grace_identity_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  test_key text not null check (test_key in ('fruit', 'gifts', 'skills')),
  answers jsonb not null default '{}'::jsonb,
  results jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, test_key)
);

create index if not exists grace_identity_assessments_user_idx
  on public.grace_identity_assessments(user_id, updated_at desc);

alter table public.grace_identity_assessments enable row level security;
drop policy if exists "grace identity own assessments" on public.grace_identity_assessments;
create policy "grace identity own assessments" on public.grace_identity_assessments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.grace_identity_assessments to authenticated;

-- Le jeton ne circule jamais en base sous sa forme lisible. Les évaluateurs
-- externes passent par une route serveur dédiée, sans compte Ministry School.
create table if not exists public.grace_identity_skill_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  token_hash text not null unique,
  selected_skills jsonb not null default '[]'::jsonb,
  response jsonb,
  expires_at timestamptz not null,
  submitted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists grace_identity_skill_reviews_owner_idx
  on public.grace_identity_skill_reviews(owner_user_id, created_at desc);

alter table public.grace_identity_skill_reviews enable row level security;
revoke all on public.grace_identity_skill_reviews from anon, authenticated;
grant insert on public.grace_identity_skill_reviews to authenticated;
grant select on public.grace_identity_skill_reviews to authenticated;
drop policy if exists "grace identity review owner creates" on public.grace_identity_skill_reviews;
create policy "grace identity review owner creates" on public.grace_identity_skill_reviews
  for insert to authenticated with check (owner_user_id = auth.uid());
drop policy if exists "grace identity review owner reads" on public.grace_identity_skill_reviews;
create policy "grace identity review owner reads" on public.grace_identity_skill_reviews
  for select to authenticated using (owner_user_id = auth.uid());

insert into public.app_catalog(
  slug, name, short_description, category, icon_url, destination_url, status,
  display_order, integration_key, public_enabled, student_enabled
)
values (
  'je-suis-par-la-grace-de-dieu',
  'Je suis ce que je suis par la grâce de Dieu',
  'Découvre le fruit de l’Esprit, tes dons spirituels et tes compétences naturelles.',
  'Identité', null, '/apps/je-suis-par-la-grace-de-dieu', 'draft', 40,
  'grace-identity', false, false
)
on conflict(slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  category = excluded.category,
  destination_url = excluded.destination_url,
  integration_key = excluded.integration_key;

commit;
