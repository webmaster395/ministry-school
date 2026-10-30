begin;

-- Source de vérité nominative : exactement trois super administratrices.
create or replace function public.is_super_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select lower(coalesce((select u.email from auth.users u where u.id = p_user), '')) in (
    'r.tamard@gmail.com',
    'flora.demerle@mlkgrandparis.com',
    'nathalie.boudehent@eglisemlk.fr'
  )
$$;

-- Les trois comptes existent déjà. On harmonise seulement leur rôle global, sans
-- créer de compte et sans modifier les autres administrateurs.
update public.profiles p set role = 'admin'
from auth.users u
where u.id = p.id and lower(u.email) in (
  'r.tamard@gmail.com',
  'flora.demerle@mlkgrandparis.com',
  'nathalie.boudehent@eglisemlk.fr'
);
update auth.users u set raw_app_meta_data = jsonb_set(
  coalesce(u.raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'::jsonb, true
)
where lower(u.email) in (
  'r.tamard@gmail.com',
  'flora.demerle@mlkgrandparis.com',
  'nathalie.boudehent@eglisemlk.fr'
);

create or replace function public.can_review_editorial_content(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_super_admin(p_user)
$$;

create or replace function public.is_opportunity_required_reviewer(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select public.is_super_admin(p_user)
$$;

create or replace function public.is_opportunity_review_observer(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth as $$
  select false
$$;

-- Dans Pilotage ministère, aucun droit n'est déduit de la sensibilité étudiante.
-- Les super administratrices voient les cinq périmètres ; les autres personnes
-- voient uniquement leurs responsabilités ou délégations explicites.
create or replace function public.is_strict_pilotage_for(
  p_ministry uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select p_ministry is not null
    and exists (
      select 1 from public.ministries m
      where m.id = p_ministry
        and m.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
    )
    and (
      public.is_super_admin(p_user)
      or exists(select 1 from public.profiles p where p.id = p_user and p.ministry_lead_of = p_ministry)
      or exists(select 1 from public.ministry_delegates d where d.user_id = p_user and d.ministry_id = p_ministry)
    )
$$;

create or replace function public.strict_pilotage_ministries()
returns table(ministry_id uuid) language sql stable security definer set search_path = public as $$
  select m.id
  from public.ministries m
  where m.slug in ('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur')
    and public.is_strict_pilotage_for(m.id)
  order by m.name
$$;

-- Projets et formations : l'accès global appartient aux super administratrices.
-- Tous les autres comptes, y compris un administrateur classique, restent limités
-- aux affectations manager/contributor existantes.
create or replace function public.can_manage_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments a
    where a.opportunity_id = p_opportunity and a.user_id = p_user
      and a.responsibility in ('manager', 'contributor')
  )
$$;

create or replace function public.can_contribute_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_opportunity(p_opportunity, p_user)
$$;

create or replace function public.can_submit_opportunity(
  p_opportunity uuid, p_user uuid default auth.uid()
) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments a
    where a.opportunity_id = p_opportunity and a.user_id = p_user
      and a.responsibility = 'manager'
  )
$$;

create or replace function public.has_projects_training_access(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_super_admin(p_user) or exists(
    select 1 from public.opportunity_assignments a where a.user_id = p_user
  )
$$;

drop policy if exists opportunities_admin_insert on public.opportunities;
create policy opportunities_admin_insert on public.opportunities for insert to authenticated
with check (public.is_super_admin() and created_by = auth.uid());
drop policy if exists opportunities_admin_delete on public.opportunities;
create policy opportunities_admin_delete on public.opportunities for delete to authenticated
using (public.is_super_admin());
drop policy if exists opportunity_assignments_admin_write on public.opportunity_assignments;
create policy opportunity_assignments_admin_write on public.opportunity_assignments for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create or replace function public.enforce_super_admin_opportunity_creation()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  return new;
end $$;
drop trigger if exists enforce_super_admin_opportunity_creation on public.opportunities;
create trigger enforce_super_admin_opportunity_creation
before insert on public.opportunities for each row
execute function public.enforce_super_admin_opportunity_creation();

create or replace function public.replace_opportunity_assignments(
  p_opportunity uuid, p_managers uuid[], p_contributors uuid[]
) returns void language plpgsql security definer set search_path = public as $$
declare person uuid; v_all uuid[] := coalesce(p_managers, array[]::uuid[]) || coalesce(p_contributors, array[]::uuid[]);
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.opportunity_assignments
  where opportunity_id = p_opportunity and not (user_id = any(v_all));
  foreach person in array coalesce(p_managers, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(p_opportunity, person, 'manager', auth.uid())
    on conflict(opportunity_id, user_id) do update set responsibility = 'manager';
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
  foreach person in array coalesce(p_contributors, array[]::uuid[]) loop
    insert into public.opportunity_assignments(opportunity_id, user_id, responsibility, created_by)
    values(p_opportunity, person, 'contributor', auth.uid())
    on conflict(opportunity_id, user_id) do update set responsibility = 'contributor';
    update public.profiles set is_projects_training_member = true where id = person;
  end loop;
end $$;

-- La suppression reste limitée au périmètre attribué ; une super administratrice
-- peut intervenir globalement. Le nom historique de la RPC est conservé.
create or replace function public.delete_opportunity_admin(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_contribute_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  delete from public.announcements where opportunity_id = p_opportunity;
  delete from public.opportunities where id = p_opportunity;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

alter table public.opportunity_review_requests
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists decision text check (decision in ('approved', 'changes_requested'));

create or replace function public.request_opportunity_review(
  p_opportunity uuid, p_desired_status text, p_desired_at timestamptz default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare v_title text; v_reviewer record;
begin
  if not public.can_submit_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_desired_status not in ('published', 'scheduled') then raise exception 'INVALID_PUBLICATION_STATUS'; end if;
  if p_desired_status = 'scheduled' and (p_desired_at is null or p_desired_at <= now()) then raise exception 'INVALID_SCHEDULE'; end if;
  select title into v_title from public.opportunities where id = p_opportunity;
  if v_title is null then raise exception 'NOT_FOUND'; end if;

  insert into public.opportunity_review_requests(
    opportunity_id, requested_by, requested_at, desired_publication_status,
    desired_published_at, status, correction_message, resolved_at, resolved_by, decision, updated_at
  ) values (
    p_opportunity, auth.uid(), now(), p_desired_status,
    case when p_desired_status = 'scheduled' then p_desired_at else null end,
    'pending', null, null, null, null, now()
  ) on conflict(opportunity_id) do update set
    requested_by = excluded.requested_by, requested_at = now(),
    desired_publication_status = excluded.desired_publication_status,
    desired_published_at = excluded.desired_published_at, status = 'pending',
    correction_message = null, resolved_at = null, resolved_by = null,
    decision = null, updated_at = now();
  delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
  update public.opportunities set
    publication_status = case when publication_status in ('published', 'scheduled') then publication_status else 'draft' end,
    published_at = case when publication_status in ('published', 'scheduled') then published_at else null end,
    updated_at = now()
  where id = p_opportunity;

  for v_reviewer in
    select p.id from public.profiles p where public.is_super_admin(p.id)
  loop
    perform public.notify_opportunity_recipient(
      v_reviewer.id, p_opportunity, 'Validation demandée : ' || v_title,
      'Ce projet ou cette formation attend votre validation avant publication.',
      'Examiner et valider', 'opportunity_review_required'
    );
  end loop;
end $$;

create or replace function public.review_opportunity(
  p_opportunity uuid, p_decision text, p_message text default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare v_request public.opportunity_review_requests%rowtype; v_title text; v_person record;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approve', 'changes_requested') then raise exception 'INVALID_DECISION'; end if;
  select * into v_request from public.opportunity_review_requests where opportunity_id = p_opportunity for update;
  if not found or v_request.status <> 'pending' then raise exception 'NO_PENDING_REVIEW'; end if;
  select title into v_title from public.opportunities where id = p_opportunity;

  if p_decision = 'changes_requested' then
    if coalesce(trim(p_message), '') = '' then raise exception 'MESSAGE_REQUIRED'; end if;
    update public.opportunity_review_requests set status = 'changes_requested',
      correction_message = trim(p_message), resolved_at = now(), resolved_by = auth.uid(),
      decision = 'changes_requested', updated_at = now()
    where opportunity_id = p_opportunity;
    delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
    update public.opportunities set publication_status = 'draft', published_at = null, updated_at = now()
    where id = p_opportunity and publication_status not in ('published', 'scheduled');
    for v_person in select user_id from public.opportunity_assignments where opportunity_id = p_opportunity loop
      perform public.notify_opportunity_recipient(v_person.user_id, p_opportunity,
        'Corrections demandées : ' || v_title, trim(p_message),
        'Voir les corrections', 'opportunity_changes_requested');
    end loop;
    return;
  end if;

  insert into public.opportunity_review_approvals(opportunity_id, reviewer_id, approved_at)
  values(p_opportunity, auth.uid(), now())
  on conflict(opportunity_id, reviewer_id) do update set approved_at = now();
  update public.opportunity_review_requests set status = 'approved', resolved_at = now(),
    resolved_by = auth.uid(), decision = 'approved', updated_at = now()
  where opportunity_id = p_opportunity;
  update public.opportunities set
    publication_status = v_request.desired_publication_status,
    published_at = case when v_request.desired_publication_status = 'published' then now() else v_request.desired_published_at end,
    archived_at = null, updated_at = now()
  where id = p_opportunity;
end $$;

create or replace function public.opportunity_review_state(p_opportunity uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare v_result jsonb;
begin
  if not public.can_contribute_opportunity(p_opportunity) and not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'status', coalesce(r.status, 'none'),
    'desiredPublicationStatus', r.desired_publication_status,
    'desiredPublishedAt', r.desired_published_at,
    'requestedAt', r.requested_at,
    'correctionMessage', r.correction_message,
    'nathalieApproved', exists(select 1 from public.opportunity_review_approvals a join auth.users u on u.id=a.reviewer_id where a.opportunity_id=p_opportunity and lower(u.email)='nathalie.boudehent@eglisemlk.fr'),
    'floraApproved', exists(select 1 from public.opportunity_review_approvals a join auth.users u on u.id=a.reviewer_id where a.opportunity_id=p_opportunity and lower(u.email)='flora.demerle@mlkgrandparis.com'),
    'roseAliceApproved', exists(select 1 from public.opportunity_review_approvals a join auth.users u on u.id=a.reviewer_id where a.opportunity_id=p_opportunity and lower(u.email)='r.tamard@gmail.com'),
    'canDecide', public.is_super_admin(),
    'isObserver', false
  ) into v_result
  from (select 1) seed left join public.opportunity_review_requests r on r.opportunity_id=p_opportunity;
  return v_result;
end $$;

-- Soumission d'un cours ministériel aux trois super administratrices.
create or replace function public.submit_ministry_course_review(p_session uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
declare v_session public.sessions%rowtype; v_title text; v_reviewer record;
begin
  select * into v_session from public.sessions where id = p_session for update;
  if not found or v_session.session_type <> 'ministere' or not public.is_strict_pilotage_for(v_session.ministry_id) then raise exception 'FORBIDDEN'; end if;
  if v_session.editorial_status in ('published', 'scheduled', 'superseded') then raise exception 'REVISION_REQUIRED'; end if;
  insert into public.ministry_course_review_requests(session_id, requested_by, requested_at, status, resolved_at, reviewed_by, updated_at)
  values(p_session, auth.uid(), now(), 'pending', null, null, now())
  on conflict(session_id) do update set requested_by=excluded.requested_by, requested_at=now(),
    status='pending', resolved_at=null, reviewed_by=null, updated_at=now();
  update public.ministry_course_annotations set resolved_at=now(), resolved_by=auth.uid()
    where session_id=p_session and requires_action and resolved_at is null;
  update public.sessions set editorial_status='pending', submitted_at=now(), submitted_by=auth.uid(), is_draft=true where id=p_session;
  select description into v_title from public.sessions where id=p_session;
  for v_reviewer in select p.id from public.profiles p where public.is_super_admin(p.id) loop
    insert into public.announcements(title, body, author_id, recipient_id, session_id, is_system,
      target_url, target_type, target_id, cta_label)
    values('Cours ministériel à valider : ' || coalesce(v_title, 'Sans titre'),
      'Ce cours attend votre validation avant publication.', auth.uid(), v_reviewer.id, p_session, true,
      '/gestion/a-valider?onglet=courses', 'ministry_course_review_required', p_session, 'Examiner le cours');
  end loop;
end $$;

create or replace function public.pending_validation_count()
returns integer language sql stable security definer set search_path = public as $$
  select case when public.is_super_admin() then
    ((select count(*) from public.opportunity_review_requests where status='pending')
    + (select count(*) from public.ministry_course_review_requests where status='pending'))::integer
  else 0 end
$$;

create or replace function public.validation_queue()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select jsonb_build_object(
    'opportunities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'title', o.title, 'submittedAt', r.requested_at,
        'responsible', coalesce(p.full_name, 'Équipe projet'), 'status', r.status,
        'contentType', case when o.is_project and o.is_training then 'both' when o.is_project then 'project' else 'training' end
      ) order by r.requested_at)
      from public.opportunity_review_requests r join public.opportunities o on o.id=r.opportunity_id
      left join public.profiles p on p.id=r.requested_by where r.status='pending'
    ), '[]'::jsonb),
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'title', coalesce(s.description, 'Cours sans titre'),
        'submittedAt', r.requested_at, 'responsible', coalesce(p.full_name, 'Responsable ministériel'),
        'ministry', m.name, 'ministrySlug', m.slug, 'status', r.status, 'contentType', 'course'
      ) order by r.requested_at)
      from public.ministry_course_review_requests r join public.sessions s on s.id=r.session_id
      join public.ministries m on m.id=s.ministry_id left join public.profiles p on p.id=r.requested_by
      where r.status='pending'
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(row_to_json(h) order by h."decidedAt" desc) from (
        select o.id, o.title, r.requested_at as "submittedAt",
          coalesce(requester.full_name, 'Équipe projet') as responsible, r.status,
          case when o.is_project and o.is_training then 'both' when o.is_project then 'project' else 'training' end as "contentType",
          r.resolved_at as "decidedAt", reviewer.full_name as reviewer,
          null::text as ministry, null::text as "ministrySlug"
        from public.opportunity_review_requests r join public.opportunities o on o.id=r.opportunity_id
        left join public.profiles requester on requester.id=r.requested_by
        left join public.profiles reviewer on reviewer.id=r.resolved_by
        where r.status in ('approved','changes_requested')
        union all
        select s.id, coalesce(s.description, 'Cours sans titre'), r.requested_at,
          coalesce(requester.full_name, 'Responsable ministériel'), r.status, 'course',
          r.resolved_at, reviewer.full_name, m.name, m.slug
        from public.ministry_course_review_requests r join public.sessions s on s.id=r.session_id
        join public.ministries m on m.id=s.ministry_id
        left join public.profiles requester on requester.id=r.requested_by
        left join public.profiles reviewer on reviewer.id=r.reviewed_by
        where r.status in ('approved','changes_requested')
      ) h
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end $$;

-- Le contexte unique alimente la sidebar desktop et mobile avec les mêmes droits
-- et le même compteur, sans élargir les droits depuis le rôle étudiant.
create or replace function public.student_viewer_context()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'full_name', p.full_name, 'role', p.role, 'is_teacher', p.is_teacher,
    'deactivated', p.deactivated, 'avatar_path', p.avatar_path, 'created_at', p.created_at,
    'preferred_day', p.preferred_day, 'ministry_id', p.ministry_id,
    'notifications_seen_at', p.notifications_seen_at, 'notification_prefs', p.notification_prefs,
    'welcome_seen_at', p.welcome_seen_at, 'is_service_lead', p.is_service_lead,
    'is_project_lead', p.is_project_lead, 'ministry_slug', m.slug, 'ministry_name', m.name,
    'steering_ministry_ids', coalesce((select jsonb_agg(x.ministry_id) from public.strict_pilotage_ministries() x), '[]'::jsonb),
    'super_admin', public.is_super_admin(),
    'editorial_reviewer', public.is_super_admin(),
    'projects_training_member', public.has_projects_training_access(),
    'pending_validation_count', public.pending_validation_count(),
    'course_notes_enabled', exists(select 1 from public.feature_preview_users f where f.feature_key='course_notes' and f.user_id=auth.uid()),
    'unread_messages', coalesce((select count(*) from public.announcements a where a.created_at > coalesce(p.notifications_seen_at, '1970-01-01'::timestamptz)), 0)
      + case when p.created_at >= coalesce(p.notifications_seen_at, '1970-01-01'::timestamptz)
        then coalesce((select count(*) from public.announcements a where a.is_welcome=true), 0) else 0 end
  )
  from public.profiles p left join public.ministries m on m.id=p.ministry_id
  where p.id=auth.uid()
$$;

revoke all on function public.is_super_admin(uuid) from public;
grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.can_submit_opportunity(uuid,uuid) to authenticated;
grant execute on function public.has_projects_training_access(uuid) to authenticated;
grant execute on function public.pending_validation_count() to authenticated;
grant execute on function public.validation_queue() to authenticated;
grant execute on function public.student_viewer_context() to authenticated;

commit;
