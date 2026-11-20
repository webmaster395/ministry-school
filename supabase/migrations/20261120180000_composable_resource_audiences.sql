begin;

alter table public.resource_access_controls
  drop constraint if exists resource_access_controls_visibility_mode_check;
alter table public.resource_access_controls
  add constraint resource_access_controls_visibility_mode_check
  check (visibility_mode in ('all_authenticated', 'super_admin_only', 'selected_lists', 'selected_users', 'selected_audiences'));

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

  if access_mode in ('selected_users', 'selected_audiences') and exists(
    select 1 from public.resource_access_users direct_access
    where direct_access.resource_type = p_resource_type
      and direct_access.resource_id = p_resource_id
      and direct_access.user_id = p_user
  ) then return true; end if;

  if access_mode in ('selected_lists', 'selected_audiences') then
    return exists(
      select 1
      from public.user_list_members membership
      join public.user_lists selected_list on selected_list.id = membership.list_id
      where membership.user_id = p_user
        and (
          exists(
            select 1 from public.resource_access_lists list_access
            where list_access.resource_type = p_resource_type
              and list_access.resource_id = p_resource_id
              and list_access.list_id = selected_list.id
          )
          or exists(
            select 1 from public.resource_access_categories category_access
            where category_access.resource_type = p_resource_type
              and category_access.resource_id = p_resource_id
              and category_access.category = selected_list.category
          )
        )
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
  p_user_ids uuid[] default '{}'::uuid[],
  p_categories text[] default '{}'::text[]
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_resource_type not in ('app_catalog', 'material', 'opportunity_resource', 'managed_resource') then raise exception 'INVALID_RESOURCE_TYPE'; end if;
  if p_visibility_mode not in ('all_authenticated', 'super_admin_only', 'selected_lists', 'selected_users', 'selected_audiences') then raise exception 'INVALID_VISIBILITY_MODE'; end if;
  if exists(
    select 1
    from unnest(coalesce(p_categories, '{}'::text[])) as category_values(category)
    where category_values.category not in ('collaborators', 'responsibilities', 'sensitivities', 'involvements', 'other')
  ) then raise exception 'INVALID_LIST_CATEGORY'; end if;

  insert into public.resource_access_controls(resource_type, resource_id, visibility_mode, created_by, updated_by)
  values(p_resource_type, p_resource_id, p_visibility_mode, auth.uid(), auth.uid())
  on conflict(resource_type, resource_id) do update set
    visibility_mode = excluded.visibility_mode,
    updated_by = auth.uid(),
    updated_at = now();

  delete from public.resource_access_lists where resource_type = p_resource_type and resource_id = p_resource_id;
  delete from public.resource_access_users where resource_type = p_resource_type and resource_id = p_resource_id;
  delete from public.resource_access_categories where resource_type = p_resource_type and resource_id = p_resource_id;

  if p_visibility_mode in ('selected_lists', 'selected_audiences') then
    insert into public.resource_access_lists(resource_type, resource_id, list_id, created_by)
    select p_resource_type, p_resource_id, selected.id, auth.uid()
    from public.user_lists selected
    where selected.id = any(coalesce(p_list_ids, '{}'::uuid[]));

    insert into public.resource_access_categories(resource_type, resource_id, category, created_by)
    select p_resource_type, p_resource_id, selected_category, auth.uid()
    from (select distinct unnest(coalesce(p_categories, '{}'::text[])) selected_category) categories;
  end if;

  if p_visibility_mode in ('selected_users', 'selected_audiences') then
    insert into public.resource_access_users(resource_type, resource_id, user_id, created_by)
    select p_resource_type, p_resource_id, selected.id, auth.uid()
    from public.profiles selected
    where selected.id = any(coalesce(p_user_ids, '{}'::uuid[]))
      and not coalesce(selected.deactivated, false);
  end if;
end $$;

commit;
