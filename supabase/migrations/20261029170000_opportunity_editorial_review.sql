begin;

create table if not exists public.opportunity_review_requests (
  opportunity_id uuid primary key references public.opportunities(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  requested_at timestamptz not null default now(),
  desired_publication_status text not null check (desired_publication_status in ('published', 'scheduled')),
  desired_published_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'changes_requested', 'approved', 'cancelled')),
  correction_message text,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (desired_publication_status <> 'scheduled' or desired_published_at is not null)
);

create table if not exists public.opportunity_review_approvals (
  opportunity_id uuid not null references public.opportunity_review_requests(opportunity_id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  approved_at timestamptz not null default now(),
  primary key (opportunity_id, reviewer_id)
);

alter table public.opportunity_review_requests enable row level security;
alter table public.opportunity_review_approvals enable row level security;

create or replace function public.current_user_email()
returns text language sql stable security definer set search_path = public, auth
as $$ select lower(coalesce((select email from auth.users where id = auth.uid()), '')) $$;

create or replace function public.is_opportunity_required_reviewer(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select lower(coalesce((select email from auth.users where id = p_user), '')) in (
    'nathalie.boudehent@eglisemlk.fr',
    'flora.demerle@mlkgrandparis.com'
  )
$$;

create or replace function public.is_opportunity_review_observer(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public, auth
as $$
  select lower(coalesce((select email from auth.users where id = p_user), '')) = 'r.tamard@gmail.com'
$$;

create or replace function public.notify_opportunity_recipient(
  p_recipient uuid, p_opportunity uuid, p_title text, p_body text, p_cta text, p_type text
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_recipient is null then return; end if;
  insert into public.announcements(
    title, body, author_id, recipient_id, opportunity_id, is_system,
    target_url, target_type, target_id, cta_label
  ) values (
    p_title, p_body, auth.uid(), p_recipient, p_opportunity, true,
    '/gestion/projets-formations/' || p_opportunity::text, p_type, p_opportunity, p_cta
  );
end $$;

create or replace function public.request_opportunity_review(
  p_opportunity uuid, p_desired_status text, p_desired_at timestamptz default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_title text;
  v_reviewer record;
begin
  if not public.can_manage_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if p_desired_status not in ('published', 'scheduled') then raise exception 'INVALID_PUBLICATION_STATUS'; end if;
  if p_desired_status = 'scheduled' and (p_desired_at is null or p_desired_at <= now()) then
    raise exception 'INVALID_SCHEDULE';
  end if;
  select title into v_title from public.opportunities where id = p_opportunity;
  if v_title is null then raise exception 'NOT_FOUND'; end if;

  insert into public.opportunity_review_requests(
    opportunity_id, requested_by, requested_at, desired_publication_status,
    desired_published_at, status, correction_message, resolved_at, updated_at
  ) values (
    p_opportunity, auth.uid(), now(), p_desired_status,
    case when p_desired_status = 'scheduled' then p_desired_at else null end,
    'pending', null, null, now()
  ) on conflict (opportunity_id) do update set
    requested_by = excluded.requested_by,
    requested_at = now(),
    desired_publication_status = excluded.desired_publication_status,
    desired_published_at = excluded.desired_published_at,
    status = 'pending', correction_message = null, resolved_at = null, updated_at = now();

  delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
  update public.opportunities
  set publication_status = case when publication_status in ('published', 'scheduled') then publication_status else 'draft' end,
      published_at = case when publication_status in ('published', 'scheduled') then published_at else null end,
      updated_at = now()
  where id = p_opportunity;

  for v_reviewer in
    select p.id, lower(u.email) as email
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) in (
      'nathalie.boudehent@eglisemlk.fr',
      'flora.demerle@mlkgrandparis.com',
      'r.tamard@gmail.com'
    )
  loop
    if v_reviewer.email = 'r.tamard@gmail.com' then
      perform public.notify_opportunity_recipient(
        v_reviewer.id, p_opportunity,
        'Rendu à prévisualiser : ' || v_title,
        'Le rendu est prêt à être consulté. Votre validation n’est pas requise.',
        'Voir le rendu', 'opportunity_review_preview'
      );
    else
      perform public.notify_opportunity_recipient(
        v_reviewer.id, p_opportunity,
        'Validation demandée : ' || v_title,
        'Ce projet ou cette formation attend votre validation avant publication.',
        'Examiner et valider', 'opportunity_review_required'
      );
    end if;
  end loop;
end $$;

create or replace function public.review_opportunity(
  p_opportunity uuid, p_decision text, p_message text default null
) returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_request public.opportunity_review_requests%rowtype;
  v_title text;
  v_approved integer;
  v_person record;
begin
  if not public.is_opportunity_required_reviewer() then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approve', 'changes_requested') then raise exception 'INVALID_DECISION'; end if;
  select * into v_request from public.opportunity_review_requests where opportunity_id = p_opportunity for update;
  if not found or v_request.status <> 'pending' then raise exception 'NO_PENDING_REVIEW'; end if;
  select title into v_title from public.opportunities where id = p_opportunity;

  if p_decision = 'changes_requested' then
    if coalesce(trim(p_message), '') = '' then raise exception 'MESSAGE_REQUIRED'; end if;
    update public.opportunity_review_requests set
      status = 'changes_requested', correction_message = trim(p_message),
      resolved_at = now(), updated_at = now()
    where opportunity_id = p_opportunity;
    delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
    update public.opportunities set publication_status = 'draft', published_at = null, updated_at = now()
    where id = p_opportunity and publication_status not in ('published', 'scheduled');

    for v_person in select user_id from public.opportunity_assignments where opportunity_id = p_opportunity loop
      perform public.notify_opportunity_recipient(
        v_person.user_id, p_opportunity,
        'Corrections demandées : ' || v_title,
        trim(p_message), 'Voir les corrections', 'opportunity_changes_requested'
      );
    end loop;
    return;
  end if;

  insert into public.opportunity_review_approvals(opportunity_id, reviewer_id, approved_at)
  values(p_opportunity, auth.uid(), now())
  on conflict(opportunity_id, reviewer_id) do update set approved_at = now();

  select count(*) into v_approved
  from public.opportunity_review_approvals a
  join auth.users u on u.id = a.reviewer_id
  where a.opportunity_id = p_opportunity
    and lower(u.email) in ('nathalie.boudehent@eglisemlk.fr', 'flora.demerle@mlkgrandparis.com');

  if v_approved = 2 then
    update public.opportunity_review_requests set status = 'approved', resolved_at = now(), updated_at = now()
    where opportunity_id = p_opportunity;
    update public.opportunities set
      publication_status = v_request.desired_publication_status,
      published_at = case when v_request.desired_publication_status = 'published' then now() else v_request.desired_published_at end,
      archived_at = null,
      updated_at = now()
    where id = p_opportunity;
  end if;
end $$;

create or replace function public.cancel_opportunity_review(p_opportunity uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  update public.opportunity_review_requests set status = 'cancelled', resolved_at = now(), updated_at = now()
  where opportunity_id = p_opportunity and status in ('pending', 'changes_requested');
  delete from public.opportunity_review_approvals where opportunity_id = p_opportunity;
end $$;

create or replace function public.request_opportunity_contribution(p_opportunity uuid, p_message text)
returns void language plpgsql security definer set search_path = public as $$
declare v_title text; v_person record;
begin
  if not public.can_manage_opportunity(p_opportunity) then raise exception 'FORBIDDEN'; end if;
  if coalesce(trim(p_message), '') = '' then raise exception 'MESSAGE_REQUIRED'; end if;
  select title into v_title from public.opportunities where id = p_opportunity;
  for v_person in
    select user_id from public.opportunity_assignments
    where opportunity_id = p_opportunity and user_id <> auth.uid()
  loop
    perform public.notify_opportunity_recipient(
      v_person.user_id, p_opportunity,
      'Complément demandé : ' || v_title,
      trim(p_message), 'Compléter la fiche', 'opportunity_contribution_requested'
    );
  end loop;
end $$;

create or replace function public.opportunity_review_state(p_opportunity uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare v_email text := public.current_user_email(); v_result jsonb;
begin
  if not public.can_contribute_opportunity(p_opportunity)
     and v_email not in ('nathalie.boudehent@eglisemlk.fr', 'flora.demerle@mlkgrandparis.com', 'r.tamard@gmail.com') then
    raise exception 'FORBIDDEN';
  end if;
  select jsonb_build_object(
    'status', coalesce(r.status, 'none'),
    'desiredPublicationStatus', r.desired_publication_status,
    'desiredPublishedAt', r.desired_published_at,
    'requestedAt', r.requested_at,
    'correctionMessage', r.correction_message,
    'nathalieApproved', exists(
      select 1 from public.opportunity_review_approvals a join auth.users u on u.id = a.reviewer_id
      where a.opportunity_id = p_opportunity and lower(u.email) = 'nathalie.boudehent@eglisemlk.fr'
    ),
    'floraApproved', exists(
      select 1 from public.opportunity_review_approvals a join auth.users u on u.id = a.reviewer_id
      where a.opportunity_id = p_opportunity and lower(u.email) = 'flora.demerle@mlkgrandparis.com'
    ),
    'canDecide', v_email in ('nathalie.boudehent@eglisemlk.fr', 'flora.demerle@mlkgrandparis.com'),
    'isObserver', v_email = 'r.tamard@gmail.com'
  ) into v_result
  from (select 1) seed left join public.opportunity_review_requests r on r.opportunity_id = p_opportunity;
  return v_result;
end $$;

create or replace function public.enforce_opportunity_review_publication()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.publication_status in ('published', 'scheduled')
     and (new.publication_status is distinct from old.publication_status or new.published_at is distinct from old.published_at)
     and not exists(
       select 1 from public.opportunity_review_requests r
       where r.opportunity_id = new.id and r.status = 'approved'
         and r.desired_publication_status = new.publication_status
         and (new.publication_status = 'published' or r.desired_published_at is not distinct from new.published_at)
     ) then
    raise exception 'REVIEW_REQUIRED';
  end if;
  return new;
end $$;

drop trigger if exists enforce_opportunity_review_publication on public.opportunities;
create trigger enforce_opportunity_review_publication
before update of publication_status, published_at on public.opportunities
for each row execute function public.enforce_opportunity_review_publication();

create or replace function public.notify_opportunity_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.opportunities where id = new.opportunity_id;
  perform public.notify_opportunity_recipient(
    new.user_id, new.opportunity_id,
    case when new.responsibility = 'manager' then 'Vous êtes responsable : ' else 'Vous contribuez à : ' end || v_title,
    case when new.responsibility = 'manager'
      then 'Vous pouvez gérer les informations, les séances et les inscriptions de cet élément.'
      else 'Vous pouvez maintenant compléter les informations autorisées de cet élément.' end,
    'Ouvrir la fiche', 'opportunity_assignment'
  );
  return new;
end $$;

drop trigger if exists notify_opportunity_assignment on public.opportunity_assignments;
create trigger notify_opportunity_assignment
after insert on public.opportunity_assignments
for each row execute function public.notify_opportunity_assignment();

-- Le remplacement des affectations devient différentiel pour ne notifier que les nouveaux membres.
create or replace function public.replace_opportunity_assignments(
  p_opportunity uuid, p_managers uuid[], p_contributors uuid[]
) returns void language plpgsql security definer set search_path = public as $$
declare person uuid; v_all uuid[] := coalesce(p_managers, array[]::uuid[]) || coalesce(p_contributors, array[]::uuid[]);
begin
  if not public.is_platform_admin() then raise exception 'FORBIDDEN'; end if;
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

grant execute on function public.request_opportunity_review(uuid,text,timestamptz) to authenticated;
grant execute on function public.review_opportunity(uuid,text,text) to authenticated;
grant execute on function public.cancel_opportunity_review(uuid) to authenticated;
grant execute on function public.request_opportunity_contribution(uuid,text) to authenticated;
grant execute on function public.opportunity_review_state(uuid) to authenticated;

commit;
