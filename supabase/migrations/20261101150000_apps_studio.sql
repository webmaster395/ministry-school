begin;

create table if not exists public.app_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(trim(name)) between 1 and 100),
  short_description text not null default '' check (char_length(short_description) <= 240),
  category text not null check (char_length(trim(category)) between 1 and 80),
  icon_url text,
  destination_url text not null check (destination_url ~ '^https?://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  display_order integer not null default 0,
  integration_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.app_catalog is 'Catalogue du Launchpad public Ministry School. La suppression ne touche jamais aux données des applications externes.';

alter table public.app_catalog enable row level security;

drop policy if exists "app catalog public read" on public.app_catalog;
create policy "app catalog public read" on public.app_catalog
for select to anon, authenticated
using (status = 'published' or public.is_super_admin());

drop policy if exists "app catalog super admin insert" on public.app_catalog;
create policy "app catalog super admin insert" on public.app_catalog
for insert to authenticated
with check (public.is_super_admin());

drop policy if exists "app catalog super admin update" on public.app_catalog;
create policy "app catalog super admin update" on public.app_catalog
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "app catalog super admin delete" on public.app_catalog;
create policy "app catalog super admin delete" on public.app_catalog
for delete to authenticated
using (public.is_super_admin());

grant select on public.app_catalog to anon, authenticated;
grant insert, update, delete on public.app_catalog to authenticated;

create or replace function public.touch_app_catalog_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_app_catalog_updated_at on public.app_catalog;
create trigger touch_app_catalog_updated_at
before update on public.app_catalog
for each row execute function public.touch_app_catalog_updated_at();

insert into public.app_catalog(slug, name, short_description, category, icon_url, destination_url, status, display_order, integration_key)
values
  ('ma-generosite', 'Ma générosité', 'Explorez votre rapport à l''argent et au don.', 'Finance', '/apps/ma-generosite.png', 'https://generosite.jeveuxdonner.fr/', 'published', 10, null),
  ('generopoly', 'Généropoly', 'Le jeu où chaque choix compte.', 'Finance', '/apps/generopoly.png', 'https://ma-generosite.vercel.app/', 'published', 20, 'generopoly'),
  ('profil-mapp', 'Profil MAPP', 'Découvrez votre profil et votre manière de fonctionner.', 'Identité', null, 'https://profil-mapp.vercel.app/', 'published', 30, null)
on conflict(slug) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  category = excluded.category,
  icon_url = coalesce(public.app_catalog.icon_url, excluded.icon_url),
  destination_url = excluded.destination_url,
  integration_key = excluded.integration_key;

-- Cette table n'est jamais exposée aux clients authentifiés. Elle est lue uniquement
-- par le client service_role de Ministry School, après contrôle du rôle Super admin.
create table if not exists public.app_integrations (
  app_slug text primary key,
  endpoint_url text not null check (endpoint_url ~ '^https?://'),
  admin_token text,
  updated_at timestamptz not null default now()
);

alter table public.app_integrations enable row level security;
revoke all on public.app_integrations from anon, authenticated;

insert into public.app_integrations(app_slug, endpoint_url)
values ('generopoly', 'https://ma-generosite.vercel.app')
on conflict(app_slug) do update set endpoint_url = excluded.endpoint_url;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('app-icons', 'app-icons', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
on conflict(id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "app icons public read" on storage.objects;
create policy "app icons public read" on storage.objects for select
using (bucket_id = 'app-icons');

drop policy if exists "app icons super admin insert" on storage.objects;
create policy "app icons super admin insert" on storage.objects for insert to authenticated
with check (bucket_id = 'app-icons' and public.is_super_admin());

drop policy if exists "app icons super admin update" on storage.objects;
create policy "app icons super admin update" on storage.objects for update to authenticated
using (bucket_id = 'app-icons' and public.is_super_admin())
with check (bucket_id = 'app-icons' and public.is_super_admin());

drop policy if exists "app icons super admin delete" on storage.objects;
create policy "app icons super admin delete" on storage.objects for delete to authenticated
using (bucket_id = 'app-icons' and public.is_super_admin());

commit;
