begin;

alter table public.app_catalog
  add column if not exists display_title text,
  add column if not exists long_description text,
  add column if not exists tags text[] not null default array[]::text[],
  add column if not exists result_url text,
  add column if not exists tool_type text not null default 'interactive',
  add column if not exists story_title text,
  add column if not exists story_image_url text,
  add column if not exists story_destination_url text,
  add column if not exists story_order integer not null default 0,
  add column if not exists post_title text,
  add column if not exists post_image_url text,
  add column if not exists post_destination_url text,
  add column if not exists post_order integer not null default 0,
  add column if not exists resource_title text,
  add column if not exists resource_description text,
  add column if not exists resource_image_url text,
  add column if not exists resource_category text,
  add column if not exists resource_tags text[] not null default array[]::text[],
  add column if not exists resource_destination_url text,
  add column if not exists resource_order integer not null default 0,
  add column if not exists placement_story boolean not null default false,
  add column if not exists placement_post boolean not null default false,
  add column if not exists placement_resources boolean not null default false,
  add column if not exists placement_work boolean not null default false,
  add column if not exists placement_ministry boolean not null default false,
  add column if not exists tracking_mode text not null default 'none',
  add column if not exists access_scope text not null default 'students',
  add column if not exists allowed_user_ids uuid[] not null default array[]::uuid[],
  add column if not exists allowed_ministry_ids uuid[] not null default array[]::uuid[],
  add column if not exists public_access boolean not null default false,
  add column if not exists featured boolean not null default false,
  add column if not exists featured_start_at timestamptz,
  add column if not exists featured_end_at timestamptz,
  add column if not exists featured_generation integer not null default 1;

alter table public.app_catalog drop constraint if exists app_catalog_tool_type_check;
alter table public.app_catalog add constraint app_catalog_tool_type_check
  check (tool_type in ('test','interactive','simulator','external'));
alter table public.app_catalog drop constraint if exists app_catalog_tracking_mode_check;
alter table public.app_catalog add constraint app_catalog_tracking_mode_check
  check (tracking_mode in ('result','explicit','none'));
alter table public.app_catalog drop constraint if exists app_catalog_access_scope_check;
alter table public.app_catalog add constraint app_catalog_access_scope_check
  check (access_scope in ('super_admin','students','selected'));

update public.app_catalog set
  display_title = coalesce(display_title, name),
  story_title = coalesce(story_title, name),
  post_title = coalesce(post_title, name),
  resource_title = coalesce(resource_title, name),
  story_image_url = coalesce(story_image_url, icon_url),
  post_image_url = coalesce(post_image_url, icon_url),
  resource_image_url = coalesce(resource_image_url, icon_url),
  story_destination_url = coalesce(story_destination_url, destination_url),
  post_destination_url = coalesce(post_destination_url, destination_url),
  resource_destination_url = coalesce(resource_destination_url, destination_url),
  story_order = display_order,
  post_order = display_order,
  resource_order = display_order,
  placement_resources = student_enabled,
  public_access = public_enabled,
  access_scope = case when student_enabled then 'students' else 'super_admin' end;

-- Le test de la grâce contient plusieurs parcours suivis. Son placement dans
-- Ma personnalité reste conservé même si sa fiche catalogue est encore en brouillon.
update public.app_catalog set
  tool_type='test', tracking_mode='result', placement_story=true, placement_post=true,
  story_title='Fruit de l’Esprit', post_title='Fruit de l’Esprit',
  story_image_url='/apps/grace-identity/fruit-spirit-citrus-story-v13.webp',
  post_image_url='/apps/grace-identity/fruit-spirit-citrus-post-v13.webp'
where slug='je-suis-par-la-grace-de-dieu';
update public.app_catalog set tool_type='test',tracking_mode='result',placement_story=true,placement_post=true where slug='profil-mapp';
update public.app_catalog set tool_type='interactive',tracking_mode='none',placement_resources=true where slug='generopoly';
update public.app_catalog set tool_type='simulator',tracking_mode='none',placement_resources=true where slug='ma-generosite';

create table if not exists public.managed_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 180),
  description text,
  kind text not null default 'document' check (kind in ('pdf','audio','video','document','link','tool')),
  external_url text,
  file_path text,
  file_name text,
  mime_type text,
  file_size bigint,
  thumbnail_url text,
  category text,
  tags text[] not null default array[]::text[],
  placements text[] not null default array['resources']::text[],
  session_ids uuid[] not null default array[]::uuid[],
  opportunity_ids uuid[] not null default array[]::uuid[],
  access_scope text not null default 'students' check (access_scope in ('super_admin','students','selected','enrolled','present')),
  allowed_user_ids uuid[] not null default array[]::uuid[],
  allowed_ministry_ids uuid[] not null default array[]::uuid[],
  attendance_session_id uuid references public.sessions(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','hidden','archived')),
  publish_at timestamptz,
  featured boolean not null default false,
  featured_start_at timestamptz,
  featured_end_at timestamptz,
  featured_generation integer not null default 1,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (external_url is not null or file_path is not null)
);

create table if not exists public.featured_content_views (
  content_type text not null check (content_type in ('tool','resource')),
  content_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation integer not null default 1,
  first_viewed_at timestamptz not null default now(),
  primary key(content_type,content_id,user_id,generation)
);

create or replace function public.touch_managed_resource_updated_at()
returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists touch_managed_resource_updated_at on public.managed_resources;
create trigger touch_managed_resource_updated_at before update on public.managed_resources
for each row execute function public.touch_managed_resource_updated_at();

create or replace function public.can_access_catalog_app(p_app uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.app_catalog app
    left join public.profiles profile on profile.id=p_user
    where app.id=p_app and app.archived_at is null
      and app.status in ('scheduled','published')
      and (app.student_publish_at is null or app.student_publish_at<=now())
      and (
        public.is_super_admin(p_user)
        or (app.access_scope='students' and app.student_enabled)
        or (app.access_scope='selected' and p_user=any(app.allowed_user_ids))
        or (app.access_scope='selected' and profile.ministry_id=any(app.allowed_ministry_ids))
      )
  );
$$;

create or replace function public.can_access_managed_resource(p_resource uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.managed_resources resource
    left join public.profiles profile on profile.id=p_user
    where resource.id=p_resource
      and resource.status='published'
      and (resource.publish_at is null or resource.publish_at<=now())
      and (
        public.is_super_admin(p_user)
        or resource.access_scope='students'
        or (resource.access_scope='selected' and (p_user=any(resource.allowed_user_ids) or profile.ministry_id=any(resource.allowed_ministry_ids)))
        or (resource.access_scope='enrolled' and exists(
          select 1 from public.opportunity_date_registrations registration
          join public.opportunity_dates date on date.id=registration.opportunity_date_id
          where registration.user_id=p_user and date.opportunity_id=any(resource.opportunity_ids)
        ))
        or (resource.access_scope='present' and resource.attendance_session_id is not null and exists(
          select 1 from public.session_attendance attendance
          where attendance.session_id=resource.attendance_session_id and attendance.user_id=p_user and attendance.status='present'
        ))
      )
  );
$$;

alter table public.managed_resources enable row level security;
alter table public.featured_content_views enable row level security;
drop policy if exists managed_resources_read on public.managed_resources;
create policy managed_resources_read on public.managed_resources for select to authenticated
using(public.can_access_managed_resource(id) or public.is_super_admin());
drop policy if exists managed_resources_admin on public.managed_resources;
create policy managed_resources_admin on public.managed_resources for all to authenticated
using(public.is_super_admin()) with check(public.is_super_admin() and updated_by=auth.uid());
drop policy if exists featured_content_views_own_read on public.featured_content_views;
create policy featured_content_views_own_read on public.featured_content_views for select to authenticated
using(user_id=auth.uid() or public.is_super_admin());
drop policy if exists featured_content_views_own_insert on public.featured_content_views;
create policy featured_content_views_own_insert on public.featured_content_views for insert to authenticated
with check(user_id=auth.uid());
drop policy if exists featured_content_views_admin_delete on public.featured_content_views;
create policy featured_content_views_admin_delete on public.featured_content_views for delete to authenticated
using(public.is_super_admin());

grant select,insert,update,delete on public.managed_resources to authenticated;
grant select,insert,delete on public.featured_content_views to authenticated;
grant execute on function public.can_access_catalog_app(uuid,uuid) to authenticated;
grant execute on function public.can_access_managed_resource(uuid,uuid) to authenticated;

drop policy if exists "app catalog channel read" on public.app_catalog;
create policy "app catalog channel read" on public.app_catalog for select
using (
  public.is_super_admin()
  or (public_enabled and status in ('scheduled','published') and (public_publish_at is null or public_publish_at<=now()))
  or (auth.uid() is not null and public.can_access_catalog_app(id))
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'managed-resources','managed-resources',false,52428800,
  array['application/pdf','audio/mpeg','audio/wav','video/mp4','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists managed_resources_storage_read on storage.objects;
create policy managed_resources_storage_read on storage.objects for select to authenticated
using(bucket_id='managed-resources' and exists(
  select 1 from public.managed_resources resource
  where resource.file_path=name and public.can_access_managed_resource(resource.id)
));
drop policy if exists managed_resources_storage_admin on storage.objects;
create policy managed_resources_storage_admin on storage.objects for all to authenticated
using(bucket_id='managed-resources' and public.is_super_admin())
with check(bucket_id='managed-resources' and public.is_super_admin());

commit;
