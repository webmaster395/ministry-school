begin;

create table if not exists public.life_line_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  reflection jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists life_line_journeys_user_updated_idx on public.life_line_journeys(user_id, updated_at desc);
alter table public.life_line_journeys enable row level security;
drop policy if exists "life line own journey" on public.life_line_journeys;
create policy "life line own journey" on public.life_line_journeys for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.life_line_journeys to authenticated;

drop trigger if exists touch_life_line_journeys_updated_at on public.life_line_journeys;
create trigger touch_life_line_journeys_updated_at before update on public.life_line_journeys
for each row execute function public.touch_app_catalog_updated_at();

insert into public.app_catalog(
  slug,name,short_description,category,icon_url,destination_url,status,display_order,integration_key,
  public_enabled,student_enabled
) values (
  'ma-ligne-de-vie','Ma ligne de vie','Revisite ton histoire avec Dieu et discerne les pistes qui traversent ton parcours.',
  'Identité','/identity/posts/ligne-de-vie.webp','/apps/ma-ligne-de-vie','draft',50,'life-line',false,false
)
on conflict(slug) do update set
  name=excluded.name,short_description=excluded.short_description,category=excluded.category,
  icon_url=excluded.icon_url,destination_url=excluded.destination_url,integration_key=excluded.integration_key;

commit;
