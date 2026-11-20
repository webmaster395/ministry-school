begin;

alter table public.resource_access_controls
  drop constraint if exists resource_access_controls_resource_type_check;
alter table public.resource_access_controls
  add constraint resource_access_controls_resource_type_check
  check (resource_type in ('app_catalog', 'material', 'opportunity_resource', 'managed_resource'));

create or replace function public.validate_resource_access_target()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.resource_type = 'app_catalog' and not exists(select 1 from public.app_catalog where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  elsif new.resource_type = 'material' and not exists(select 1 from public.materials where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  elsif new.resource_type = 'opportunity_resource' and not exists(select 1 from public.opportunity_resources where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  elsif new.resource_type = 'managed_resource' and not exists(select 1 from public.managed_resources where id = new.resource_id) then
    raise exception 'RESOURCE_NOT_FOUND';
  end if;
  return new;
end $$;

create or replace function public.save_resource_access(
  p_resource_type text,
  p_resource_id uuid,
  p_visibility_mode text,
  p_list_ids uuid[] default '{}'::uuid[],
  p_user_ids uuid[] default '{}'::uuid[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_resource_type not in ('app_catalog', 'material', 'opportunity_resource', 'managed_resource') then raise exception 'INVALID_RESOURCE_TYPE'; end if;
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

drop trigger if exists cleanup_managed_resource_access on public.managed_resources;
create trigger cleanup_managed_resource_access after delete on public.managed_resources
for each row execute function public.cleanup_resource_access('managed_resource');

drop policy if exists managed_resources_segment_access on public.managed_resources;
create policy managed_resources_segment_access on public.managed_resources
as restrictive for select to authenticated
using (public.can_access_resource('managed_resource', id));

drop policy if exists managed_resource_files_segment_access on storage.objects;
create policy managed_resource_files_segment_access on storage.objects
as restrictive for select to authenticated
using (
  bucket_id <> 'managed-resources'
  or exists(
    select 1 from public.managed_resources resource
    where resource.file_path = name
      and public.can_access_resource('managed_resource', resource.id)
  )
);

commit;
