begin;

-- Les listes segmentent des publics. Elles ne représentent jamais un rôle
-- administratif et ne modifient aucune colonne de public.profiles.
create table if not exists public.user_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  category text not null check (category in ('collaborators', 'responsibilities', 'sensitivities', 'involvements', 'other')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_lists_name_unique
  on public.user_lists (lower(trim(name)));
create index if not exists user_lists_category_idx
  on public.user_lists (category, name);

create table if not exists public.user_list_members (
  list_id uuid not null references public.user_lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create index if not exists user_list_members_user_idx
  on public.user_list_members (user_id, list_id);

-- Couche polymorphe commune aux ressources existantes. L'intégrité de la
-- cible est assurée par le trigger validate_resource_access_target.
create table if not exists public.resource_access_controls (
  resource_type text not null check (resource_type in ('app_catalog', 'material', 'opportunity_resource')),
  resource_id uuid not null,
  visibility_mode text not null check (visibility_mode in ('all_authenticated', 'super_admin_only', 'selected_lists', 'selected_users')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (resource_type, resource_id)
);

create table if not exists public.resource_access_lists (
  resource_type text not null,
  resource_id uuid not null,
  list_id uuid not null references public.user_lists(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (resource_type, resource_id, list_id),
  foreign key (resource_type, resource_id)
    references public.resource_access_controls(resource_type, resource_id) on delete cascade
);

create index if not exists resource_access_lists_list_idx
  on public.resource_access_lists (list_id, resource_type, resource_id);

create table if not exists public.resource_access_users (
  resource_type text not null,
  resource_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (resource_type, resource_id, user_id),
  foreign key (resource_type, resource_id)
    references public.resource_access_controls(resource_type, resource_id) on delete cascade
);

create index if not exists resource_access_users_user_idx
  on public.resource_access_users (user_id, resource_type, resource_id);

create or replace function public.touch_access_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists touch_user_lists_updated_at on public.user_lists;
create trigger touch_user_lists_updated_at before update on public.user_lists
for each row execute function public.touch_access_updated_at();

drop trigger if exists touch_resource_access_updated_at on public.resource_access_controls;
create trigger touch_resource_access_updated_at before update on public.resource_access_controls
for each row execute function public.touch_access_updated_at();

create or replace function public.validate_resource_access_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.resource_type = 'app_catalog' and not exists(select 1 from public.app_catalog where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  elsif new.resource_type = 'material' and not exists(select 1 from public.materials where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  elsif new.resource_type = 'opportunity_resource' and not exists(select 1 from public.opportunity_resources where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  end if;
  return new;
end $$;

drop trigger if exists validate_resource_access_target on public.resource_access_controls;
create trigger validate_resource_access_target before insert or update of resource_type, resource_id
on public.resource_access_controls for each row execute function public.validate_resource_access_target();

create or replace function public.cleanup_resource_access()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.resource_access_controls
  where resource_type = tg_argv[0] and resource_id = old.id;
  return old;
end $$;

drop trigger if exists cleanup_material_resource_access on public.materials;
create trigger cleanup_material_resource_access after delete on public.materials
for each row execute function public.cleanup_resource_access('material');

drop trigger if exists cleanup_opportunity_resource_access on public.opportunity_resources;
create trigger cleanup_opportunity_resource_access after delete on public.opportunity_resources
for each row execute function public.cleanup_resource_access('opportunity_resource');

drop trigger if exists cleanup_app_catalog_resource_access on public.app_catalog;
create trigger cleanup_app_catalog_resource_access after delete on public.app_catalog
for each row execute function public.cleanup_resource_access('app_catalog');

alter table public.user_lists enable row level security;
alter table public.user_list_members enable row level security;
alter table public.resource_access_controls enable row level security;
alter table public.resource_access_lists enable row level security;
alter table public.resource_access_users enable row level security;

create policy user_lists_super_admin_all on public.user_lists for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
create policy user_list_members_super_admin_all on public.user_list_members for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
create policy resource_access_controls_super_admin_all on public.resource_access_controls for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
create policy resource_access_lists_super_admin_all on public.resource_access_lists for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
create policy resource_access_users_super_admin_all on public.resource_access_users for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

grant select, insert, update, delete on public.user_lists to authenticated;
grant select, insert, update, delete on public.user_list_members to authenticated;
grant select, insert, update, delete on public.resource_access_controls to authenticated;
grant select, insert, update, delete on public.resource_access_lists to authenticated;
grant select, insert, update, delete on public.resource_access_users to authenticated;

-- Une absence de règle conserve la visibilité historique de la ressource.
-- Dès qu'une règle existe, elle s'ajoute aux politiques RLS déjà en place.
create or replace function public.can_access_resource(
  p_resource_type text,
  p_resource_id uuid,
  p_user uuid default auth.uid()
) returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  access_mode text;
begin
  select visibility_mode into access_mode
  from public.resource_access_controls
  where resource_type = p_resource_type and resource_id = p_resource_id;

  if not found then return true; end if;
  if public.is_super_admin(p_user) then return true; end if;
  if p_user is null or not exists(
    select 1 from public.profiles profile
    where profile.id = p_user and not coalesce(profile.deactivated, false)
  ) then return false; end if;

  if access_mode = 'all_authenticated' then return true; end if;
  if access_mode = 'super_admin_only' then return false; end if;
  if access_mode = 'selected_users' then
    return exists(
      select 1 from public.resource_access_users direct_access
      where direct_access.resource_type = p_resource_type
        and direct_access.resource_id = p_resource_id
        and direct_access.user_id = p_user
    );
  end if;
  if access_mode = 'selected_lists' then
    return exists(
      select 1
      from public.resource_access_lists list_access
      join public.user_list_members membership on membership.list_id = list_access.list_id
      where list_access.resource_type = p_resource_type
        and list_access.resource_id = p_resource_id
        and membership.user_id = p_user
    );
  end if;
  return false;
end $$;

revoke all on function public.can_access_resource(text,uuid,uuid) from public;
grant execute on function public.can_access_resource(text,uuid,uuid) to anon, authenticated;

create or replace function public.save_resource_access(
  p_resource_type text,
  p_resource_id uuid,
  p_visibility_mode text,
  p_list_ids uuid[] default '{}'::uuid[],
  p_user_ids uuid[] default '{}'::uuid[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_resource_type not in ('app_catalog', 'material', 'opportunity_resource') then raise exception 'INVALID_RESOURCE_TYPE'; end if;
  if p_visibility_mode not in ('all_authenticated', 'super_admin_only', 'selected_lists', 'selected_users') then raise exception 'INVALID_VISIBILITY_MODE'; end if;

  insert into public.resource_access_controls(resource_type, resource_id, visibility_mode, created_by, updated_by)
  values(p_resource_type, p_resource_id, p_visibility_mode, auth.uid(), auth.uid())
  on conflict(resource_type, resource_id) do update set
    visibility_mode = excluded.visibility_mode,
    updated_by = auth.uid(),
    updated_at = now();

  delete from public.resource_access_lists
  where resource_type = p_resource_type and resource_id = p_resource_id;
  delete from public.resource_access_users
  where resource_type = p_resource_type and resource_id = p_resource_id;

  if p_visibility_mode = 'selected_lists' then
    insert into public.resource_access_lists(resource_type, resource_id, list_id, created_by)
    select p_resource_type, p_resource_id, selected.id, auth.uid()
    from public.user_lists selected
    where selected.id = any(coalesce(p_list_ids, '{}'::uuid[]));
  elsif p_visibility_mode = 'selected_users' then
    insert into public.resource_access_users(resource_type, resource_id, user_id, created_by)
    select p_resource_type, p_resource_id, selected.id, auth.uid()
    from public.profiles selected
    where selected.id = any(coalesce(p_user_ids, '{}'::uuid[]))
      and not coalesce(selected.deactivated, false);
  end if;
end $$;

revoke all on function public.save_resource_access(text,uuid,text,uuid[],uuid[]) from public;
grant execute on function public.save_resource_access(text,uuid,text,uuid[],uuid[]) to authenticated;

-- Les politiques restrictives composent la segmentation avec les règles
-- historiques (inscription, ministère, publication, affectation, etc.).
drop policy if exists app_catalog_segment_access on public.app_catalog;
create policy app_catalog_segment_access on public.app_catalog
as restrictive for select to anon, authenticated
using (public.can_access_resource('app_catalog', id));

drop policy if exists materials_segment_access on public.materials;
create policy materials_segment_access on public.materials
as restrictive for select to authenticated
using (public.can_access_resource('material', id));

drop policy if exists opportunity_resources_segment_access on public.opportunity_resources;
create policy opportunity_resources_segment_access on public.opportunity_resources
as restrictive for select to authenticated
using (public.can_access_resource('opportunity_resource', id));

drop policy if exists opportunity_resource_files_segment_access on storage.objects;
create policy opportunity_resource_files_segment_access on storage.objects
as restrictive for select to authenticated
using (
  bucket_id <> 'opportunity-resources'
  or exists(
    select 1 from public.opportunity_resources resource
    where resource.file_path = name
      and public.can_access_resource('opportunity_resource', resource.id)
  )
);

-- Les nouveaux supports de cours privés ne sont plus déposés dans un bucket
-- public. La ligne materials reste la source d'autorisation pédagogique.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values(
  'course-materials', 'course-materials', false, 20971520,
  array[
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet'
  ]
)
on conflict(id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course materials authorized read" on storage.objects;
create policy "course materials authorized read" on storage.objects for select to authenticated
using (
  bucket_id = 'course-materials'
  and exists(
    select 1 from public.materials material
    where (material.link_url = 'storage://course-materials/' || name or material.file_url = 'storage://course-materials/' || name)
      and public.can_access_resource('material', material.id)
  )
);

drop policy if exists "course materials authorized upload" on storage.objects;
create policy "course materials authorized upload" on storage.objects for insert to authenticated
with check (
  bucket_id = 'course-materials'
  and public.can_edit_ministry_course(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "course materials authorized delete" on storage.objects;
create policy "course materials authorized delete" on storage.objects for delete to authenticated
using (
  bucket_id = 'course-materials'
  and public.can_edit_ministry_course(((storage.foldername(name))[1])::uuid)
);

commit;
