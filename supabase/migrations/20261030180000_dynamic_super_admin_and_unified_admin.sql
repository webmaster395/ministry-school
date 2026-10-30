begin;

alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

update public.profiles profile
set is_super_admin = true, role = 'admin'
from auth.users account
where account.id = profile.id
  and lower(account.email) in (
    'r.tamard@gmail.com',
    'flora.demerle@mlkgrandparis.com',
    'nathalie.boudehent@eglisemlk.fr'
  );

create or replace function public.is_super_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles profile
    where profile.id = p_user
      and profile.is_super_admin
      and not coalesce(profile.deactivated, false)
  )
$$;

create table if not exists public.admin_role_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  role_key text not null,
  action text not null check (action in ('assigned', 'updated', 'removed')),
  scope_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_role_audit enable row level security;
drop policy if exists admin_role_audit_super_read on public.admin_role_audit;
create policy admin_role_audit_super_read on public.admin_role_audit for select to authenticated
using (public.is_super_admin());

drop policy if exists admin_member_role_notes_read on public.admin_member_role_notes;
create policy admin_member_role_notes_read on public.admin_member_role_notes for select to authenticated
using (public.is_super_admin());
drop policy if exists admin_member_role_notes_write on public.admin_member_role_notes;
create policy admin_member_role_notes_write on public.admin_member_role_notes for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin() and updated_by = auth.uid());

create or replace function public.audit_admin_role(
  p_target uuid, p_role text, p_action text, p_scope uuid,
  p_old jsonb, p_new jsonb
) returns void language sql security definer set search_path = public as $$
  insert into public.admin_role_audit(target_user_id,actor_user_id,role_key,action,scope_id,old_value,new_value)
  values(p_target,auth.uid(),p_role,p_action,p_scope,p_old,p_new)
$$;

revoke all on function public.audit_admin_role(uuid,text,text,uuid,jsonb,jsonb) from public;

create or replace function public.assign_admin_role(
  p_user uuid, p_role text, p_scope uuid default null, p_can_edit boolean default false
) returns void language plpgsql security definer set search_path = public, auth as $$
declare
  account_email text;
  previous_scope uuid;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.profiles where id=p_user) then raise exception 'MEMBER_NOT_FOUND'; end if;

  case p_role
    when 'super_admin' then
      update public.profiles set is_super_admin=true,role='admin' where id=p_user;
      update auth.users set raw_app_meta_data=jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb),'{role}','"admin"'::jsonb,true) where id=p_user;
    when 'admin' then
      update public.profiles set role='admin' where id=p_user;
      update auth.users set raw_app_meta_data=jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb),'{role}','"admin"'::jsonb,true) where id=p_user;
    when 'projects_creator' then
      update public.profiles set can_create_opportunities=true,is_projects_training_member=true where id=p_user;
    when 'ministry_manager' then
      if p_scope is null or not exists(select 1 from public.ministries where id=p_scope) then raise exception 'SCOPE_REQUIRED'; end if;
      select ministry_lead_of into previous_scope from public.profiles where id=p_user;
      update public.profiles set ministry_lead_of=p_scope where id=p_user;
    when 'ministry_contributor' then
      if p_scope is null or not exists(select 1 from public.ministries where id=p_scope) then raise exception 'SCOPE_REQUIRED'; end if;
      select lower(email) into account_email from auth.users where id=p_user;
      insert into public.ministry_delegates(ministry_id,email,user_id,created_by,can_edit)
      values(p_scope,account_email,p_user,auth.uid(),coalesce(p_can_edit,false))
      on conflict do nothing;
      update public.ministry_delegates set user_id=p_user,can_edit=coalesce(p_can_edit,false)
      where ministry_id=p_scope and lower(email)=account_email;
    when 'project_manager' then
      if p_scope is null or not exists(select 1 from public.opportunities where id=p_scope) then raise exception 'SCOPE_REQUIRED'; end if;
      insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
      values(p_scope,p_user,'manager',true,auth.uid())
      on conflict(opportunity_id,user_id) do update set responsibility='manager',can_edit=true;
      update public.profiles set can_create_opportunities=true,is_projects_training_member=true where id=p_user;
    when 'project_contributor' then
      if p_scope is null or not exists(select 1 from public.opportunities where id=p_scope) then raise exception 'SCOPE_REQUIRED'; end if;
      insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
      values(p_scope,p_user,'contributor',coalesce(p_can_edit,false),auth.uid())
      on conflict(opportunity_id,user_id) do update set responsibility='contributor',can_edit=excluded.can_edit;
      update public.profiles set is_projects_training_member=true where id=p_user;
    else raise exception 'UNKNOWN_ROLE';
  end case;

  perform public.audit_admin_role(p_user,p_role,'assigned',p_scope,
    case when previous_scope is null then null else jsonb_build_object('scope',previous_scope) end,
    jsonb_build_object('scope',p_scope,'can_edit',coalesce(p_can_edit,false)));
end $$;

create or replace function public.remove_admin_role(
  p_user uuid, p_role text, p_scope uuid default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare active_super_count integer;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  case p_role
    when 'super_admin' then
      select count(*) into active_super_count from public.profiles where is_super_admin and not coalesce(deactivated,false);
      if exists(select 1 from public.profiles where id=p_user and is_super_admin and not coalesce(deactivated,false)) and active_super_count<=1 then
        raise exception 'LAST_ACTIVE_SUPER_ADMIN';
      end if;
      update public.profiles set is_super_admin=false where id=p_user;
    when 'admin' then
      if exists(select 1 from public.profiles where id=p_user and is_super_admin) then raise exception 'SUPER_ADMIN_REQUIRES_ADMIN'; end if;
      update public.profiles set role='student' where id=p_user;
      update auth.users set raw_app_meta_data=jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb),'{role}','"student"'::jsonb,true) where id=p_user;
    when 'projects_creator' then
      update public.profiles set can_create_opportunities=false where id=p_user;
    when 'ministry_manager' then
      update public.profiles set ministry_lead_of=null where id=p_user and (p_scope is null or ministry_lead_of=p_scope);
    when 'ministry_contributor' then
      delete from public.ministry_delegates where user_id=p_user and (p_scope is null or ministry_id=p_scope);
    when 'project_manager', 'project_contributor' then
      if p_scope is null then raise exception 'SCOPE_REQUIRED'; end if;
      delete from public.opportunity_assignments where user_id=p_user and opportunity_id=p_scope;
      update public.profiles set is_projects_training_member=(can_create_opportunities or exists(select 1 from public.opportunity_assignments where user_id=p_user)) where id=p_user;
    else raise exception 'UNKNOWN_ROLE';
  end case;
  perform public.audit_admin_role(p_user,p_role,'removed',p_scope,jsonb_build_object('scope',p_scope),null);
end $$;

create or replace function public.set_user_access_v3(
  target uuid, p_admin boolean, p_super_admin boolean, p_projects_training boolean,
  p_service uuid, p_ministry_lead uuid
) returns void language plpgsql security definer set search_path = public, auth as $$
declare active_super_count integer; old_row public.profiles%rowtype;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select * into old_row from public.profiles where id=target;
  if old_row.is_super_admin and not p_super_admin and not old_row.deactivated then
    select count(*) into active_super_count from public.profiles where is_super_admin and not coalesce(deactivated,false);
    if active_super_count<=1 then raise exception 'LAST_ACTIVE_SUPER_ADMIN'; end if;
  end if;
  update public.profiles set
    role=case when p_admin or p_super_admin then 'admin' else 'student' end,
    is_super_admin=p_super_admin,
    can_create_opportunities=p_projects_training,
    is_projects_training_member=p_projects_training or exists(select 1 from public.opportunity_assignments where user_id=target),
    service_id=p_service,ministry_lead_of=p_ministry_lead,
    is_teacher=false,is_service_lead=false,is_project_lead=false
  where id=target;
  update auth.users set raw_app_meta_data=jsonb_set(coalesce(raw_app_meta_data,'{}'::jsonb),'{role}',to_jsonb(case when p_admin or p_super_admin then 'admin' else 'student' end),true) where id=target;
  perform public.audit_admin_role(target,'access_bundle','updated',null,
    jsonb_build_object('admin',old_row.role='admin','super_admin',old_row.is_super_admin,'projects_training',old_row.can_create_opportunities,'ministry',old_row.ministry_lead_of),
    jsonb_build_object('admin',p_admin or p_super_admin,'super_admin',p_super_admin,'projects_training',p_projects_training,'ministry',p_ministry_lead));
end $$;

create or replace function public.set_user_active(target uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, auth as $$
declare active_super_count integer;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if target=auth.uid() and not p_active then raise exception 'SELF_DEACTIVATION'; end if;
  if not p_active and exists(select 1 from public.profiles where id=target and is_super_admin and not deactivated) then
    select count(*) into active_super_count from public.profiles where is_super_admin and not deactivated;
    if active_super_count<=1 then raise exception 'LAST_ACTIVE_SUPER_ADMIN'; end if;
  end if;
  update public.profiles set deactivated=not p_active where id=target;
  update auth.users set banned_until=case when p_active then null else now()+interval '100 years' end where id=target;
end $$;

create or replace function public.can_view_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin(p_user) or exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id=p_opportunity and assignment.user_id=p_user
  )
$$;

drop function if exists public.admin_role_directory();
create function public.admin_role_directory()
returns table(user_id uuid,category text,role_level text,role_key text,scope_id uuid,scope_label text,can_edit boolean,assignment_id uuid)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  return query
  select p.id,'administration'::text,case when p.is_super_admin then 'Super admin' else 'Admin' end,
         case when p.is_super_admin then 'super_admin' else 'admin' end,null::uuid,null::text,true,null::uuid
  from public.profiles p where p.role='admin'
  union all
  select a.user_id,'projects_training',case when a.responsibility='manager' then 'Responsable' else 'Contributeur' end,
         case when a.responsibility='manager' then 'project_manager' else 'project_contributor' end,
         o.id,o.title,coalesce(a.can_edit,a.responsibility='manager'),null::uuid
  from public.opportunity_assignments a join public.opportunities o on o.id=a.opportunity_id
  union all
  select p.id,'projects_training','Responsable','projects_creator',null::uuid,'Création autonome',true,null::uuid
  from public.profiles p where coalesce(p.can_create_opportunities,false)
  union all
  select p.id,'ministry','Responsable','ministry_manager',m.id,m.name,true,null::uuid
  from public.profiles p join public.ministries m on m.id=p.ministry_lead_of
  union all
  select d.user_id,'ministry','Contributeur','ministry_contributor',m.id,m.name,coalesce(d.can_edit,false),d.id
  from public.ministry_delegates d join public.ministries m on m.id=d.ministry_id where d.user_id is not null;
end $$;

create or replace function public.admin_user_emails() returns table(id uuid,email text)
language sql stable security definer set search_path = public, auth as $$
  select u.id,u.email::text from auth.users u where public.is_super_admin()
$$;

revoke all on function public.assign_admin_role(uuid,text,uuid,boolean) from public;
revoke all on function public.remove_admin_role(uuid,text,uuid) from public;
revoke all on function public.set_user_access_v3(uuid,boolean,boolean,boolean,uuid,uuid) from public;
revoke all on function public.set_user_active(uuid,boolean) from public;
revoke all on function public.admin_role_directory() from public;
revoke all on function public.admin_user_emails() from public;
grant execute on function public.assign_admin_role(uuid,text,uuid,boolean) to authenticated;
grant execute on function public.remove_admin_role(uuid,text,uuid) to authenticated;
grant execute on function public.set_user_access_v3(uuid,boolean,boolean,boolean,uuid,uuid) to authenticated;
grant execute on function public.set_user_active(uuid,boolean) to authenticated;
grant execute on function public.admin_role_directory() to authenticated;
grant execute on function public.admin_user_emails() to authenticated;
grant select on public.admin_role_audit to authenticated;

commit;
