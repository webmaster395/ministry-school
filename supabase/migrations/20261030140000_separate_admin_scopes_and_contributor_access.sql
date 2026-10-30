begin;

-- Les habilitations globales et les affectations opérationnelles sont distinctes.
alter table public.profiles
  add column if not exists can_create_opportunities boolean not null default false;

update public.profiles profile
set can_create_opportunities = true
where exists (
  select 1 from public.opportunity_assignments assignment
  where assignment.user_id = profile.id and assignment.responsibility = 'manager'
);

alter table public.opportunity_assignments
  add column if not exists can_edit boolean not null default false;

update public.opportunity_assignments
set can_edit = responsibility = 'manager';

alter table public.ministry_delegates
  add column if not exists can_edit boolean not null default false;

alter table public.opportunities
  add column if not exists archive_requested_at timestamptz,
  add column if not exists archive_requested_by uuid references public.profiles(id) on delete set null;

create or replace function public.can_create_opportunities(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.profiles profile
    where profile.id = p_user and profile.can_create_opportunities
  )
$$;

create or replace function public.can_view_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id = p_opportunity and assignment.user_id = p_user
  )
$$;

create or replace function public.can_edit_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id = p_opportunity
      and assignment.user_id = p_user
      and (assignment.responsibility = 'manager' or assignment.can_edit)
  )
$$;

-- Noms historiques conservés pour les appels déjà déployés.
create or replace function public.can_manage_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.can_edit_opportunity(p_opportunity, p_user)
$$;

create or replace function public.can_contribute_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_opportunity(p_opportunity, p_user)
$$;

create or replace function public.can_submit_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id = p_opportunity
      and assignment.user_id = p_user
      and assignment.responsibility = 'manager'
  )
$$;

create or replace function public.has_projects_training_access(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles profile
    where profile.id = p_user and profile.can_create_opportunities
  ) or exists(
    select 1 from public.opportunity_assignments assignment where assignment.user_id = p_user
  )
$$;

-- Le super administrateur utilise son portail global. Pilotage reste une casquette
-- personnelle fondée exclusivement sur une affectation explicite.
create or replace function public.is_strict_pilotage_for(
  p_ministry uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select p_ministry is not null
    and exists (
      select 1 from public.ministries ministry
      where ministry.id = p_ministry
        and ministry.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
    )
    and (
      exists(select 1 from public.profiles profile where profile.id = p_user and profile.ministry_lead_of = p_ministry)
      or exists(select 1 from public.ministry_delegates delegate where delegate.user_id = p_user and delegate.ministry_id = p_ministry)
    )
$$;

create or replace function public.is_ministry_lead_for(
  p_ministry uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.profiles profile
    where profile.id = p_user and profile.ministry_lead_of = p_ministry
  )
$$;

create or replace function public.can_edit_ministry_course(
  p_session uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.sessions session
    where session.id = p_session
      and session.session_type = 'ministere'
      and (
        public.is_ministry_lead_for(session.ministry_id, p_user)
        or exists(
          select 1 from public.ministry_delegates delegate
          where delegate.user_id = p_user
            and delegate.ministry_id = session.ministry_id
            and delegate.can_edit
        )
      )
  )
$$;

create or replace function public.enforce_super_admin_opportunity_creation()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or not public.can_create_opportunities() then raise exception 'FORBIDDEN'; end if;
  if new.created_by is distinct from auth.uid() then raise exception 'FORBIDDEN'; end if;
  return new;
end $$;

-- Les contributeurs peuvent consulter par leur affectation, mais l'écriture exige
-- explicitement can_edit. Les règles Admin existantes restent disponibles dans
-- l'espace Administration, sans élargir la casquette Pilotage.
drop policy if exists sessions_pilotage_update on public.sessions;
create policy sessions_pilotage_update on public.sessions for update to authenticated
using (
  public.is_platform_admin()
  or (session_type = 'ministere' and public.can_edit_ministry_course(id))
) with check (
  public.is_platform_admin()
  or (session_type = 'ministere' and public.can_edit_ministry_course(id))
);

drop policy if exists sessions_strict_insert on public.sessions;
create policy sessions_strict_insert on public.sessions for insert to authenticated
with check (
  public.is_platform_admin()
  or (session_type='ministere' and public.is_ministry_lead_for(ministry_id))
);
drop policy if exists sessions_strict_update on public.sessions;
create policy sessions_strict_update on public.sessions for update to authenticated
using (public.is_platform_admin() or (session_type='ministere' and public.can_edit_ministry_course(id)))
with check (public.is_platform_admin() or (session_type='ministere' and public.can_edit_ministry_course(id)));
drop policy if exists sessions_strict_delete on public.sessions;
create policy sessions_strict_delete on public.sessions for delete to authenticated
using (public.is_platform_admin() or (session_type='ministere' and public.is_ministry_lead_for(ministry_id)));

drop policy if exists materials_pilotage_insert on public.materials;
create policy materials_pilotage_insert on public.materials for insert to authenticated
with check (created_by = auth.uid() and exists(
  select 1 from public.sessions session
  where session.id = session_id
    and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))
));
drop policy if exists materials_pilotage_update on public.materials;
create policy materials_pilotage_update on public.materials for update to authenticated
using (exists(select 1 from public.sessions session where session.id = session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists materials_pilotage_delete on public.materials;
create policy materials_pilotage_delete on public.materials for delete to authenticated
using (exists(select 1 from public.sessions session where session.id = session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists assignments_pilotage_insert on public.assignments;
create policy assignments_pilotage_insert on public.assignments for insert to authenticated
with check (created_by = auth.uid() and exists(
  select 1 from public.sessions session
  where session.id = session_id
    and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))
));
drop policy if exists assignments_pilotage_update on public.assignments;
create policy assignments_pilotage_update on public.assignments for update to authenticated
using (exists(select 1 from public.sessions session where session.id = session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists assignments_pilotage_delete on public.assignments;
create policy assignments_pilotage_delete on public.assignments for delete to authenticated
using (exists(select 1 from public.sessions session where session.id = session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists materials_scoped_insert on public.materials;
create policy materials_scoped_insert on public.materials for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists materials_scoped_update on public.materials;
create policy materials_scoped_update on public.materials for update to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists materials_scoped_delete on public.materials;
create policy materials_scoped_delete on public.materials for delete to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists assignments_scoped_insert on public.assignments;
create policy assignments_scoped_insert on public.assignments for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists assignments_scoped_update on public.assignments;
create policy assignments_scoped_update on public.assignments for update to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));
drop policy if exists assignments_scoped_delete on public.assignments;
create policy assignments_scoped_delete on public.assignments for delete to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists session_videos_scoped_write on public.session_videos;
create policy session_videos_scoped_write on public.session_videos for all to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))))
with check (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists assignment_steps_strict_write on public.assignment_steps;
create policy assignment_steps_strict_write on public.assignment_steps for all to authenticated
using (exists(select 1 from public.assignments assignment join public.sessions session on session.id=assignment.session_id where assignment.id=assignment_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))))
with check (exists(select 1 from public.assignments assignment join public.sessions session on session.id=assignment.session_id where assignment.id=assignment_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists session_trainers_strict_write on public.session_trainers;
create policy session_trainers_strict_write on public.session_trainers for all to authenticated
using (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))))
with check (exists(select 1 from public.sessions session where session.id=session_id and (public.is_platform_admin() or public.can_edit_ministry_course(session.id))));

drop policy if exists opportunities_manager_update on public.opportunities;
create policy opportunities_manager_update on public.opportunities for update to authenticated
using (public.can_edit_opportunity(id)) with check (public.can_edit_opportunity(id));

drop policy if exists opportunities_admin_insert on public.opportunities;
create policy opportunities_admin_insert on public.opportunities for insert to authenticated
with check (public.can_create_opportunities() and created_by = auth.uid());

drop policy if exists opportunities_admin_delete on public.opportunities;
create policy opportunities_admin_delete on public.opportunities for delete to authenticated
using (public.is_super_admin());

drop policy if exists opportunity_dates_write on public.opportunity_dates;
create policy opportunity_dates_write on public.opportunity_dates for all to authenticated
using (public.can_edit_opportunity(opportunity_id))
with check (public.can_edit_opportunity(opportunity_id));

drop policy if exists opportunity_resources_insert on public.opportunity_resources;
create policy opportunity_resources_insert on public.opportunity_resources for insert to authenticated
with check (created_by = auth.uid() and public.can_edit_opportunity(opportunity_id));
drop policy if exists opportunity_resources_update on public.opportunity_resources;
create policy opportunity_resources_update on public.opportunity_resources for update to authenticated
using (public.can_edit_opportunity(opportunity_id)) with check (public.can_edit_opportunity(opportunity_id));
drop policy if exists opportunity_resources_delete on public.opportunity_resources;
create policy opportunity_resources_delete on public.opportunity_resources for delete to authenticated
using (public.can_edit_opportunity(opportunity_id));

drop policy if exists "opportunity resources contributor upload" on storage.objects;
create policy "opportunity resources contributor upload" on storage.objects for insert to authenticated
with check (bucket_id='opportunity-resources' and public.can_edit_opportunity(((storage.foldername(name))[1])::uuid));
drop policy if exists "opportunity resources contributor delete" on storage.objects;
create policy "opportunity resources contributor delete" on storage.objects for delete to authenticated
using (bucket_id='opportunity-resources' and public.can_edit_opportunity(((storage.foldername(name))[1])::uuid));

drop policy if exists "opportunity covers managed upload" on storage.objects;
create policy "opportunity covers managed upload" on storage.objects for insert to authenticated
with check(bucket_id='opportunity-covers' and public.can_edit_opportunity(((storage.foldername(name))[1])::uuid));
drop policy if exists "opportunity covers managed update" on storage.objects;
create policy "opportunity covers managed update" on storage.objects for update to authenticated
using(bucket_id='opportunity-covers' and public.can_edit_opportunity(((storage.foldername(name))[1])::uuid));

create or replace function public.enforce_opportunity_operational_scope()
returns trigger language plpgsql set search_path = public as $$
declare manager_access boolean;
begin
  if public.is_super_admin() then return new; end if;
  select exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id=old.id and assignment.user_id=auth.uid() and assignment.responsibility='manager'
  ) into manager_access;
  if not manager_access and (
    new.title is distinct from old.title
    or new.kind is distinct from old.kind
    or new.is_project is distinct from old.is_project
    or new.is_training is distinct from old.is_training
    or new.service_id is distinct from old.service_id
    or new.organizer_label is distinct from old.organizer_label
    or new.location is distinct from old.location
    or new.registration_open is distinct from old.registration_open
    or new.cancellation_allowed is distinct from old.cancellation_allowed
    or new.publication_status is distinct from old.publication_status
    or new.published_at is distinct from old.published_at
    or new.archived_at is distinct from old.archived_at
    or new.banner_emoji is distinct from old.banner_emoji
  ) then raise exception 'MANAGER_PERMISSION_REQUIRED'; end if;
  if new.publication_status='archived' and old.publication_status is distinct from 'archived' then
    raise exception 'SUPER_ADMIN_REQUIRED';
  end if;
  return new;
end $$;

drop trigger if exists enforce_opportunity_operational_scope on public.opportunities;
create trigger enforce_opportunity_operational_scope
before update on public.opportunities for each row
execute function public.enforce_opportunity_operational_scope();

create or replace function public.set_opportunity_contributor_access(
  p_opportunity uuid, p_contributor uuid, p_can_edit boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (
    public.is_super_admin()
    or exists(
      select 1 from public.opportunity_assignments assignment
      where assignment.opportunity_id = p_opportunity
        and assignment.user_id = auth.uid()
        and assignment.responsibility = 'manager'
    )
  ) then raise exception 'FORBIDDEN'; end if;
  update public.opportunity_assignments
  set can_edit = p_can_edit
  where opportunity_id = p_opportunity
    and user_id = p_contributor
    and responsibility = 'contributor';
  if not found then raise exception 'CONTRIBUTOR_NOT_ASSIGNED'; end if;
end $$;

create or replace function public.set_ministry_contributor_access(
  p_ministry uuid, p_contributor uuid, p_can_edit boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (
    public.is_super_admin()
    or public.is_ministry_lead_for(p_ministry)
  ) then raise exception 'FORBIDDEN'; end if;
  update public.ministry_delegates
  set can_edit = p_can_edit
  where ministry_id = p_ministry and user_id = p_contributor;
  if not found then raise exception 'CONTRIBUTOR_NOT_ASSIGNED'; end if;
end $$;

create or replace function public.request_opportunity_archive(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists(
    select 1 from public.opportunity_assignments assignment
    where assignment.opportunity_id = p_opportunity
      and assignment.user_id = auth.uid()
      and assignment.responsibility = 'manager'
  ) then raise exception 'FORBIDDEN'; end if;
  update public.opportunities set archive_requested_at = now(), archive_requested_by = auth.uid()
  where id = p_opportunity and archived_at is null;
end $$;

create or replace function public.cancel_opportunity_review(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  update public.opportunity_review_requests set status='cancelled',resolved_at=now(),updated_at=now()
  where opportunity_id=p_opportunity and status in ('pending','changes_requested');
  delete from public.opportunity_review_approvals where opportunity_id=p_opportunity;
end $$;

create or replace function public.request_opportunity_contribution(p_opportunity uuid,p_message text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_message),'')='' then raise exception 'MESSAGE_REQUIRED'; end if;
  -- Le commentaire est conservé dans le circuit éditorial ; aucune notification
  -- immédiate n'est créée pendant la préparation.
  update public.opportunity_review_requests
  set correction_message=trim(p_message),updated_at=now()
  where opportunity_id=p_opportunity;
end $$;

create or replace function public.delete_opportunity_admin(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.announcements where opportunity_id = p_opportunity;
  delete from public.opportunities where id = p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Seul un super administrateur modifie les rôles globaux et les habilitations.
create or replace function public.set_user_access_v2(
  target uuid, p_admin boolean, p_projects_training boolean,
  p_service uuid, p_ministry_lead uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if public.is_super_admin(target) and not p_admin then raise exception 'SUPER_ADMIN_PROTECTED'; end if;
  update public.profiles set
    role = case when p_admin then 'admin' else 'student' end,
    can_create_opportunities = p_projects_training,
    is_projects_training_member = p_projects_training or exists(
      select 1 from public.opportunity_assignments assignment where assignment.user_id = target
    ),
    service_id = p_service,
    ministry_lead_of = p_ministry_lead,
    is_teacher = false,
    is_service_lead = false,
    is_project_lead = false
  where id = target;
end $$;

create or replace function public.update_opportunity_content(
  p_opportunity uuid, p_description text, p_objectives text, p_speakers text,
  p_prerequisites text, p_organization_material text, p_participant_material text,
  p_capacity integer, p_strategic_axes text[], p_strategic_contribution_former text,
  p_strategic_contribution_auberge text, p_strategic_contribution_fundraising text,
  p_strategic_axes_connection text
) returns void language plpgsql security definer set search_path = public as $$
declare v_axes text[] := coalesce(p_strategic_axes, array[]::text[]);
begin
  if not public.can_edit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_capacity is not null and p_capacity < 1 then raise exception 'INVALID_CAPACITY'; end if;
  if cardinality(v_axes) = 0 or not (v_axes <@ array['former', 'auberge', 'fundraising']::text[]) then
    raise exception 'STRATEGIC_AXIS_REQUIRED';
  end if;
  update public.opportunities set
    description = p_description, objectives = p_objectives, speakers = p_speakers,
    prerequisites = p_prerequisites, organization_material = nullif(trim(p_organization_material), ''),
    participant_material = p_participant_material, capacity = p_capacity,
    strategic_axes = v_axes, strategic_contribution_former = null,
    strategic_contribution_auberge = null, strategic_contribution_fundraising = null,
    strategic_axes_connection = null, updated_at = now()
  where id = p_opportunity;
  update public.opportunity_dates set capacity = p_capacity where opportunity_id = p_opportunity;
end $$;

-- Les responsables habilités créent leurs propres brouillons et deviennent
-- automatiquement responsables. Seul un super administrateur peut affecter
-- d'autres personnes pendant la création.
create or replace function public.create_opportunity_admin(
  p_payload jsonb, p_dates jsonb, p_managers uuid[], p_contributors uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; person uuid; date_row jsonb; axes text[];
begin
  if not public.can_create_opportunities() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_payload->>'title'), '') = '' or coalesce(trim(p_payload->>'description'), '') = '' then raise exception 'REQUIRED_FIELDS'; end if;
  if not coalesce((p_payload->>'is_project')::boolean, false) and not coalesce((p_payload->>'is_training')::boolean, false) then raise exception 'TYPE_REQUIRED'; end if;
  select coalesce(array_agg(value), array[]::text[]) into axes
  from jsonb_array_elements_text(coalesce(p_payload->'strategic_axes', '[]'::jsonb));
  if cardinality(axes) = 0 or not (axes <@ array['former', 'auberge', 'fundraising']::text[]) then raise exception 'STRATEGIC_AXIS_REQUIRED'; end if;

  insert into public.opportunities(
    kind,is_project,is_training,title,short_description,description,objectives,
    service_id,organizer_label,speakers,prerequisites,location,organization_material,
    participant_material,schedule_label,starts_on,ends_on,capacity,registration_open,
    cancellation_allowed,publication_status,published_at,created_by,strategic_axes,
    strategic_contribution_former,strategic_contribution_auberge,
    strategic_contribution_fundraising,strategic_axes_connection
  ) values (
    p_payload->>'kind',(p_payload->>'is_project')::boolean,(p_payload->>'is_training')::boolean,
    p_payload->>'title',p_payload->>'short_description',p_payload->>'description',p_payload->>'objectives',
    nullif(p_payload->>'service_id','')::uuid,p_payload->>'organizer_label',p_payload->>'speakers',
    p_payload->>'prerequisites',p_payload->>'location',p_payload->>'organization_material',
    p_payload->>'participant_material',p_payload->>'schedule_label',nullif(p_payload->>'starts_on','')::date,
    nullif(p_payload->>'ends_on','')::date,nullif(p_payload->>'capacity','')::integer,
    coalesce((p_payload->>'registration_open')::boolean,false),
    coalesce((p_payload->>'cancellation_allowed')::boolean,true),'draft',null,auth.uid(),axes,
    case when 'former'=any(axes) then 'Axe sélectionné' else null end,
    case when 'auberge'=any(axes) then 'Axe sélectionné' else null end,
    case when 'fundraising'=any(axes) then 'Axe sélectionné' else null end,
    case when cardinality(axes)>=2 then 'Axes sélectionnés' else null end
  ) returning id into new_id;

  for date_row in select value from jsonb_array_elements(coalesce(p_dates,'[]'::jsonb)) loop
    insert into public.opportunity_dates(opportunity_id,session_date,start_time,end_time,room,location,capacity)
    values(new_id,(date_row->>'session_date')::date,(date_row->>'start_time')::time,(date_row->>'end_time')::time,
      nullif(date_row->>'room',''),nullif(date_row->>'location',''),nullif(date_row->>'capacity','')::integer);
  end loop;

  insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
  values(new_id,auth.uid(),'manager',true,auth.uid())
  on conflict(opportunity_id,user_id) do update set responsibility='manager',can_edit=true;

  if public.is_super_admin() then
    foreach person in array coalesce(p_managers,array[]::uuid[]) loop
      insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
      values(new_id,person,'manager',true,auth.uid())
      on conflict(opportunity_id,user_id) do update set responsibility='manager',can_edit=true;
    end loop;
    foreach person in array coalesce(p_contributors,array[]::uuid[]) loop
      insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
      values(new_id,person,'contributor',false,auth.uid())
      on conflict(opportunity_id,user_id) do update set responsibility='contributor',can_edit=false;
    end loop;
  end if;
  update public.profiles set is_projects_training_member=true where id=auth.uid();
  return new_id;
end $$;

create or replace function public.claim_opportunity_creation(p_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare request public.opportunity_creation_requests%rowtype;
begin
  if auth.uid() is null or not public.can_create_opportunities() then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_token),'')='' then raise exception 'INVALID_TOKEN'; end if;
  insert into public.opportunity_creation_requests(token,created_by)
  values(trim(p_token),auth.uid()) on conflict(token) do nothing;
  if found then return jsonb_build_object('claimed',true,'opportunity_id',null); end if;
  select * into request from public.opportunity_creation_requests where token=trim(p_token);
  if request.created_by<>auth.uid() then raise exception 'FORBIDDEN'; end if;
  if request.opportunity_id is null then raise exception 'CREATION_IN_PROGRESS'; end if;
  return jsonb_build_object('claimed',false,'opportunity_id',request.opportunity_id);
end $$;

create or replace function public.replace_opportunity_assignments(
  p_opportunity uuid, p_managers uuid[], p_contributors uuid[]
) returns void language plpgsql security definer set search_path = public as $$
declare person uuid; all_people uuid[] := coalesce(p_managers,array[]::uuid[]) || coalesce(p_contributors,array[]::uuid[]);
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.opportunity_assignments where opportunity_id=p_opportunity and not(user_id=any(all_people));
  foreach person in array coalesce(p_managers,array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
    values(p_opportunity,person,'manager',true,auth.uid())
    on conflict(opportunity_id,user_id) do update set responsibility='manager',can_edit=true;
  end loop;
  foreach person in array coalesce(p_contributors,array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id,user_id,responsibility,can_edit,created_by)
    values(p_opportunity,person,'contributor',false,auth.uid())
    on conflict(opportunity_id,user_id) do update set responsibility='contributor';
  end loop;
end $$;

drop function if exists public.opportunity_team(uuid);
create function public.opportunity_team(p_opportunity uuid)
returns table(user_id uuid, full_name text, avatar_path text, responsibility text, can_edit boolean)
language sql stable security definer set search_path = public as $$
  select profile.id,profile.full_name,profile.avatar_path,assignment.responsibility,assignment.can_edit
  from public.opportunity_assignments assignment
  join public.profiles profile on profile.id=assignment.user_id
  where assignment.opportunity_id=p_opportunity and public.can_view_opportunity(p_opportunity)
  order by case assignment.responsibility when 'manager' then 0 else 1 end,profile.full_name
$$;

create or replace function public.create_ministry_course(
  p_ministry uuid,p_title text,p_session_date date,p_location text,
  p_room text default null,p_speaker text default null,p_summary text default null,
  p_objectives text default null,p_show_parking boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare created_id uuid;
begin
  if not (public.is_super_admin() or public.is_ministry_lead_for(p_ministry)) then raise exception 'FORBIDDEN'; end if;
  if not exists(select 1 from public.ministries ministry where ministry.id=p_ministry and ministry.slug in ('apotre','prophete','evangeliste','pasteur','docteur')) then raise exception 'FORBIDDEN'; end if;
  if p_session_date<date '2027-01-01' or extract(isodow from p_session_date)<>6 then raise exception 'INVALID_MINISTRY_TRAINING_DAY'; end if;
  if coalesce(trim(p_title),'')='' or coalesce(trim(p_location),'')='' then raise exception 'REQUIRED_FIELDS'; end if;
  insert into public.sessions(session_type,ministry_id,session_date,start_time,end_time,location,room,day,description,speaker_name,summary,objectives,show_parking_notice,is_draft,editorial_status)
  values('ministere',p_ministry,p_session_date,time '10:30',time '13:00',trim(p_location),nullif(trim(p_room),''),'samedi',trim(p_title),nullif(trim(p_speaker),''),nullif(trim(p_summary),''),nullif(trim(p_objectives),''),p_show_parking,true,'draft')
  returning id into created_id;
  return created_id;
end $$;

create or replace function public.submit_ministry_course_review(p_session uuid)
returns void language plpgsql security definer set search_path = public,auth as $$
declare session_row public.sessions%rowtype; title text; reviewer record;
begin
  select * into session_row from public.sessions where id=p_session for update;
  if not found or session_row.session_type<>'ministere' or not (public.is_super_admin() or public.is_ministry_lead_for(session_row.ministry_id)) then raise exception 'FORBIDDEN'; end if;
  if session_row.editorial_status in ('published','scheduled','superseded') then raise exception 'REVISION_REQUIRED'; end if;
  insert into public.ministry_course_review_requests(session_id,requested_by,requested_at,status,resolved_at,reviewed_by,updated_at)
  values(p_session,auth.uid(),now(),'pending',null,null,now())
  on conflict(session_id) do update set requested_by=excluded.requested_by,requested_at=now(),status='pending',resolved_at=null,reviewed_by=null,updated_at=now();
  update public.ministry_course_annotations set resolved_at=now(),resolved_by=auth.uid() where session_id=p_session and requires_action and resolved_at is null;
  update public.sessions set editorial_status='pending',submitted_at=now(),submitted_by=auth.uid(),is_draft=true where id=p_session;
  -- Les événements de validation restent centralisés par le récapitulatif existant ;
  -- aucune notification immédiate n'est créée ici.
end $$;

create or replace function public.delete_ministry_course_draft(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare session_row public.sessions%rowtype;
begin
  select * into session_row from public.sessions where id=p_session for update;
  if not found or session_row.session_type<>'ministere' then raise exception 'NOT_FOUND'; end if;
  if not (public.is_super_admin() or public.is_ministry_lead_for(session_row.ministry_id)) then raise exception 'FORBIDDEN'; end if;
  if session_row.editorial_status not in ('draft','changes_requested') or exists(
    select 1 from public.ministry_course_review_requests request where request.session_id=p_session and request.status='pending'
  ) then raise exception 'DELETE_NOT_ALLOWED'; end if;
  delete from public.sessions where id=p_session;
end $$;

create or replace function public.ministry_course_review_state(p_session uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_ministry uuid; v_result jsonb;
begin
  select ministry_id into v_ministry from public.sessions where id=p_session and session_type='ministere';
  if v_ministry is null or not (
    public.can_review_editorial_content()
    or public.is_strict_pilotage_for(v_ministry)
    or public.is_platform_admin()
  ) then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'status',session.editorial_status,
    'publicationAt',session.publication_at,
    'submittedAt',session.submitted_at,
    'canSubmit',public.is_ministry_lead_for(session.ministry_id),
    'canDecide',public.is_super_admin(),
    'annotations',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',annotation.id,'body',annotation.body,'requiresAction',annotation.requires_action,
        'resolvedAt',annotation.resolved_at,'createdAt',annotation.created_at,
        'authorName',coalesce(profile.full_name,'Équipe Ministry School')
      ) order by annotation.created_at)
      from public.ministry_course_annotations annotation
      left join public.profiles profile on profile.id=annotation.author_id
      where annotation.session_id=p_session
    ),'[]'::jsonb)
  ) into v_result from public.sessions session where session.id=p_session;
  return v_result;
end $$;

create or replace function public.add_ministry_course_annotation(p_session uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare v_ministry uuid;
begin
  select ministry_id into v_ministry from public.sessions where id=p_session and session_type='ministere';
  if v_ministry is null or not (public.is_super_admin() or public.is_ministry_lead_for(v_ministry)) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(trim(p_body),'')='' then raise exception 'MESSAGE_REQUIRED'; end if;
  insert into public.ministry_course_annotations(session_id,author_id,body,requires_action)
  values(p_session,auth.uid(),trim(p_body),false);
end $$;

create or replace function public.enforce_ministry_revision_creator()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.revision_of is not null and not (
    public.is_super_admin() or public.is_ministry_lead_for(new.ministry_id)
  ) then raise exception 'FORBIDDEN'; end if;
  return new;
end $$;

drop trigger if exists enforce_ministry_revision_creator on public.sessions;
create trigger enforce_ministry_revision_creator
before insert on public.sessions for each row
execute function public.enforce_ministry_revision_creator();

-- Le contexte client expose les habilitations sans confondre accès global et
-- affectations personnelles.
create or replace function public.student_viewer_context()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'full_name',p.full_name,'role',p.role,'is_teacher',p.is_teacher,
    'deactivated',p.deactivated,'avatar_path',p.avatar_path,'created_at',p.created_at,
    'preferred_day',p.preferred_day,'ministry_id',p.ministry_id,
    'notifications_seen_at',p.notifications_seen_at,'notification_prefs',p.notification_prefs,
    'welcome_seen_at',p.welcome_seen_at,'is_service_lead',p.is_service_lead,
    'is_project_lead',p.is_project_lead,'ministry_slug',ministry.slug,'ministry_name',ministry.name,
    'steering_ministry_ids',coalesce((select jsonb_agg(scope.ministry_id) from public.strict_pilotage_ministries() scope),'[]'::jsonb),
    'super_admin',public.is_super_admin(),'editorial_reviewer',public.is_super_admin(),
    'projects_training_member',public.has_projects_training_access(),
    'projects_training_creator',p.can_create_opportunities,
    'pending_validation_count',public.pending_validation_count(),
    'course_notes_enabled',exists(select 1 from public.feature_preview_users feature where feature.feature_key='course_notes' and feature.user_id=auth.uid()),
    'unread_messages',coalesce((select count(*) from public.announcements announcement where announcement.created_at>coalesce(p.notifications_seen_at,'1970-01-01'::timestamptz)),0)
      + case when p.created_at>=coalesce(p.notifications_seen_at,'1970-01-01'::timestamptz)
        then coalesce((select count(*) from public.announcements announcement where announcement.is_welcome=true),0) else 0 end
  )
  from public.profiles p left join public.ministries ministry on ministry.id=p.ministry_id
  where p.id=auth.uid()
$$;

grant execute on function public.can_create_opportunities(uuid) to authenticated;
grant execute on function public.can_view_opportunity(uuid,uuid) to authenticated;
grant execute on function public.can_edit_opportunity(uuid,uuid) to authenticated;
grant execute on function public.can_edit_ministry_course(uuid,uuid) to authenticated;
grant execute on function public.set_opportunity_contributor_access(uuid,uuid,boolean) to authenticated;
grant execute on function public.set_ministry_contributor_access(uuid,uuid,boolean) to authenticated;
grant execute on function public.request_opportunity_archive(uuid) to authenticated;
grant execute on function public.delete_ministry_course_draft(uuid) to authenticated;

commit;
