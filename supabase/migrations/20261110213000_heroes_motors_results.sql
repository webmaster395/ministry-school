begin;

create table if not exists public.heroes_motors_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  source_response_id text not null unique,
  source_email text not null,
  first_name text not null,
  portrait text not null,
  motors jsonb not null default '[]'::jsonb,
  heroes jsonb not null default '[]'::jsonb,
  source_payload jsonb not null default '{}'::jsonb,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'validated', 'rejected')),
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(motors) = 'array'),
  check (jsonb_typeof(heroes) = 'array'),
  check (publication_status <> 'published' or validation_status = 'validated'),
  check (publication_status <> 'published' or jsonb_array_length(motors) between 3 and 6),
  check (publication_status <> 'published' or jsonb_array_length(heroes) = 3)
);

create index if not exists heroes_motors_results_user_publication_idx
  on public.heroes_motors_results(user_id, publication_status, published_at desc);
create index if not exists heroes_motors_results_source_email_idx
  on public.heroes_motors_results(lower(source_email));

alter table public.heroes_motors_results enable row level security;

drop policy if exists "heroes motors owner reads published result" on public.heroes_motors_results;
create policy "heroes motors owner reads published result"
  on public.heroes_motors_results for select to authenticated
  using (user_id = auth.uid() and publication_status = 'published');

grant select on public.heroes_motors_results to authenticated;

drop trigger if exists touch_heroes_motors_results_updated_at on public.heroes_motors_results;
create trigger touch_heroes_motors_results_updated_at
before update on public.heroes_motors_results
for each row execute function public.touch_app_catalog_updated_at();

commit;
