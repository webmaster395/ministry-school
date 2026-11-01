begin;

alter table public.app_catalog
  add column if not exists public_enabled boolean not null default false,
  add column if not exists public_publish_at timestamptz,
  add column if not exists student_enabled boolean not null default false,
  add column if not exists student_publish_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

update public.app_catalog
set
  public_enabled = status = 'published',
  public_publish_at = case when status = 'published' then coalesce(public_publish_at, now()) else public_publish_at end,
  student_enabled = false
where public_enabled = false and public_publish_at is null and student_enabled = false and student_publish_at is null;

alter table public.app_catalog drop constraint if exists app_catalog_status_check;
update public.app_catalog set status = 'disabled' where status = 'hidden';
alter table public.app_catalog add constraint app_catalog_status_check
  check (status in ('draft', 'scheduled', 'published', 'disabled'));

create table if not exists public.app_studio_settings (
  singleton boolean primary key default true check (singleton),
  student_tools_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.app_studio_settings(singleton, student_tools_enabled)
values(true, false)
on conflict(singleton) do nothing;

alter table public.app_studio_settings enable row level security;
drop policy if exists "app studio settings authenticated read" on public.app_studio_settings;
create policy "app studio settings authenticated read" on public.app_studio_settings
for select to authenticated using (true);
drop policy if exists "app studio settings super admin update" on public.app_studio_settings;
create policy "app studio settings super admin update" on public.app_studio_settings
for update to authenticated
using (public.is_super_admin())
with check (public.is_super_admin() and updated_by = auth.uid());
grant select on public.app_studio_settings to authenticated;
grant update on public.app_studio_settings to authenticated;

-- Le catalogue est archivé, jamais détruit depuis le studio. Les données et
-- intégrations externes restent ainsi restaurables même après un retrait.
drop policy if exists "app catalog super admin delete" on public.app_catalog;
revoke delete on public.app_catalog from authenticated;

drop policy if exists "app catalog public read" on public.app_catalog;
drop policy if exists "app catalog channel read" on public.app_catalog;
create policy "app catalog channel read" on public.app_catalog
for select to anon, authenticated
using (
  public.is_super_admin()
  or (
    archived_at is null
    and status in ('scheduled', 'published')
    and public_enabled
    and (public_publish_at is null or public_publish_at <= now())
  )
  or (
    auth.uid() is not null
    and archived_at is null
    and status in ('scheduled', 'published')
    and student_enabled
    and (student_publish_at is null or student_publish_at <= now())
    and exists(
      select 1 from public.app_studio_settings settings
      where settings.singleton and settings.student_tools_enabled
    )
  )
);

create index if not exists app_catalog_public_visibility_idx
  on public.app_catalog(public_publish_at, display_order)
  where archived_at is null and public_enabled and status in ('scheduled', 'published');
create index if not exists app_catalog_student_visibility_idx
  on public.app_catalog(student_publish_at, display_order)
  where archived_at is null and student_enabled and status in ('scheduled', 'published');

commit;
