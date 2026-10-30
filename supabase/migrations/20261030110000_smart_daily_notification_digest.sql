begin;

-- Tous les événements automatiques passent désormais par une file unique. Une
-- annonce n'est créée qu'au moment du récapitulatif de 9 h (heure de Paris).
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  aggregate_key text not null,
  category text not null check (category in (
    'course', 'video', 'material', 'assignment', 'deadline',
    'planning', 'opportunity', 'workflow'
  )),
  recipient_id uuid references public.profiles(id) on delete cascade,
  audience_type text not null check (audience_type in ('recipient', 'student_course', 'student_opportunity')),
  session_id uuid references public.sessions(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  resource_type text not null,
  resource_id uuid,
  title text not null,
  body text,
  target_url text,
  target_type text,
  target_id uuid,
  preference_key text check (preference_key in ('messages', 'rappel_journee', 'travail', 'reponse_question')),
  occurred_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  due_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (audience_type = 'recipient' and recipient_id is not null)
    or (audience_type = 'student_course' and session_id is not null)
    or (audience_type = 'student_opportunity' and opportunity_id is not null)
  )
);

create index if not exists notification_events_pending_idx
  on public.notification_events(available_at, occurred_at)
  where cancelled_at is null;
create index if not exists notification_events_recipient_idx
  on public.notification_events(recipient_id, occurred_at desc)
  where recipient_id is not null and cancelled_at is null;

create table if not exists public.notification_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  digest_date date not null,
  announcement_id uuid not null unique references public.announcements(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  unique(recipient_id, digest_date)
);

create table if not exists public.notification_event_receipts (
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.notification_events(id) on delete cascade,
  delivery_id uuid references public.notification_digest_deliveries(id) on delete set null,
  status text not null check (status in ('delivered', 'skipped')),
  processed_at timestamptz not null default now(),
  primary key(recipient_id, event_id)
);

create table if not exists public.notification_digest_items (
  delivery_id uuid not null references public.notification_digest_deliveries(id) on delete cascade,
  event_id uuid not null references public.notification_events(id) on delete cascade,
  position integer not null,
  primary key(delivery_id, event_id)
);

create table if not exists public.notification_digest_failures (
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  digest_date date not null,
  attempt_count integer not null default 1,
  last_error text not null,
  last_attempt_at timestamptz not null default now(),
  primary key(recipient_id, digest_date)
);

alter table public.notification_events enable row level security;
alter table public.notification_digest_deliveries enable row level security;
alter table public.notification_event_receipts enable row level security;
alter table public.notification_digest_items enable row level security;
alter table public.notification_digest_failures enable row level security;

alter table public.announcements add column if not exists digest_date date;
create unique index if not exists announcements_one_daily_digest_per_recipient
  on public.announcements(recipient_id, digest_date)
  where recipient_id is not null
    and digest_date is not null
    and target_type = 'daily_notification_digest';

create or replace function public.enqueue_notification_event(
  p_dedupe_key text,
  p_aggregate_key text,
  p_category text,
  p_audience_type text,
  p_recipient uuid,
  p_session uuid,
  p_opportunity uuid,
  p_resource_type text,
  p_resource_id uuid,
  p_title text,
  p_body text,
  p_target_url text,
  p_target_type text,
  p_target_id uuid,
  p_preference_key text,
  p_occurred_at timestamptz default now(),
  p_available_at timestamptz default now(),
  p_due_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.notification_events(
    dedupe_key, aggregate_key, category, audience_type, recipient_id,
    session_id, opportunity_id, resource_type, resource_id, title, body,
    target_url, target_type, target_id, preference_key, occurred_at,
    available_at, due_at
  ) values (
    p_dedupe_key, p_aggregate_key, p_category, p_audience_type, p_recipient,
    p_session, p_opportunity, p_resource_type, p_resource_id, p_title,
    nullif(trim(p_body), ''), p_target_url, p_target_type, p_target_id,
    p_preference_key, coalesce(p_occurred_at, now()),
    coalesce(p_available_at, now()), p_due_at
  ) on conflict(dedupe_key) do update set
    title = excluded.title,
    body = excluded.body,
    target_url = excluded.target_url,
    target_type = excluded.target_type,
    target_id = excluded.target_id,
    available_at = excluded.available_at,
    due_at = excluded.due_at,
    cancelled_at = null,
    updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- Les fonctions historiques peuvent continuer à « notifier » : le trigger les
-- intercepte et place l'information dans la file au lieu de l'afficher aussitôt.
create or replace function public.queue_automatic_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_kind text := coalesce(new.target_type, 'system');
  v_resource uuid := coalesce(new.target_id, new.opportunity_id, new.session_id);
  v_day text := ((coalesce(new.created_at, now()) at time zone 'Europe/Paris')::date)::text;
  v_category text;
begin
  if not coalesce(new.is_system, false)
     or new.recipient_id is null
     or new.target_type = 'daily_notification_digest' then
    return new;
  end if;

  v_category := case
    when v_kind like '%review%' or v_kind like '%assignment%' or v_kind like '%changes_requested%'
      or v_kind like '%contribution%' then 'workflow'
    else 'workflow'
  end;

  perform public.enqueue_notification_event(
    'system:' || v_kind || ':' || new.recipient_id::text || ':' || coalesce(v_resource::text, 'none') || ':' ||
      v_day || ':' || md5(coalesce(new.title, '') || '|' || coalesce(new.body, '')),
    'system:' || v_kind || ':' || new.recipient_id::text || ':' || coalesce(v_resource::text, 'none'),
    v_category, 'recipient', new.recipient_id, new.session_id, new.opportunity_id,
    v_kind, v_resource, new.title, new.body, new.target_url, new.target_type,
    new.target_id, null, coalesce(new.created_at, now()), coalesce(new.created_at, now()), null
  );
  return null;
end $$;

drop trigger if exists zz_queue_automatic_announcement on public.announcements;
create trigger zz_queue_automatic_announcement
before insert on public.announcements
for each row execute function public.queue_automatic_announcement();

create or replace function public.queue_material_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible_at is null then return new; end if;
  perform public.enqueue_notification_event(
    'material:' || new.id::text, 'material:' || new.id::text,
    'material', 'student_course', null, new.session_id, null, 'material', new.id,
    coalesce(nullif(trim(new.title), ''), 'Nouveau support'),
    'Un nouveau support pédagogique est disponible.',
    '/etudiant/seances/' || new.session_id::text, 'course_material', new.id,
    'messages', now(), new.visible_at, null
  );
  return new;
end $$;

drop trigger if exists queue_material_notification on public.materials;
create trigger queue_material_notification
after insert or update of visible_at, title on public.materials
for each row execute function public.queue_material_notification();

create or replace function public.queue_assignment_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible_at is not null then
    perform public.enqueue_notification_event(
      'assignment:' || new.id::text, 'assignment:' || new.id::text,
      'assignment', 'student_course', null, new.session_id, null, 'assignment', new.id,
      coalesce(nullif(trim(new.title), ''), 'Nouveau devoir'),
      'Un nouveau devoir est disponible.', '/etudiant/travail',
      'assignment', new.id, 'travail', now(), new.visible_at, new.due_at
    );
  end if;

  update public.notification_events set cancelled_at = now(), updated_at = now()
  where resource_type = 'assignment_deadline' and resource_id = new.id
    and not exists(select 1 from public.notification_event_receipts r where r.event_id = notification_events.id);
  if new.due_at is not null then
    perform public.enqueue_notification_event(
      'deadline:' || new.id::text || ':' || new.due_at::text,
      'deadline:' || new.id::text, 'deadline', 'student_course', null,
      new.session_id, null, 'assignment_deadline', new.id,
      coalesce(nullif(trim(new.title), ''), 'Devoir à rendre'),
      'Une échéance de devoir approche.', '/etudiant/travail',
      'assignment_deadline', new.id, 'travail', now(), now(), new.due_at
    );
  end if;
  return new;
end $$;

drop trigger if exists queue_assignment_notification on public.assignments;
create trigger queue_assignment_notification
after insert or update of visible_at, due_at, title on public.assignments
for each row execute function public.queue_assignment_notification();

create or replace function public.queue_video_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if new.visible_at is null then return new; end if;
  select coalesce(nullif(trim(description), ''), 'Nouveau replay') into v_title
  from public.sessions where id = new.session_id;
  perform public.enqueue_notification_event(
    'video:' || new.session_id::text, 'video:' || new.session_id::text,
    'video', 'student_course', null, new.session_id, null, 'video', new.session_id,
    v_title, 'La vidéo ou le replay de ce cours est disponible.',
    '/etudiant/seances/' || new.session_id::text, 'course_video', new.session_id,
    'messages', now(), new.visible_at, null
  );
  return new;
end $$;

drop trigger if exists queue_video_notification on public.session_videos;
create trigger queue_video_notification
after insert or update of visible_at, url on public.session_videos
for each row execute function public.queue_video_notification();

create or replace function public.queue_session_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_available timestamptz; v_planning_key text; v_is_public boolean;
begin
  v_is_public := not coalesce(new.is_draft, false) and (
    new.session_type = 'commun'
    or new.editorial_status = 'published'
    or (new.editorial_status = 'scheduled' and new.publication_at is not null)
  );
  v_available := case
    when new.session_type = 'ministere' and new.editorial_status = 'scheduled' then new.publication_at
    else coalesce(new.publication_at, now())
  end;

  if v_is_public and (
    tg_op = 'INSERT'
    or coalesce(old.is_draft, true)
    or old.editorial_status is distinct from new.editorial_status
    or old.publication_at is distinct from new.publication_at
  ) then
    perform public.enqueue_notification_event(
      'course:' || new.id::text, 'course:' || new.id::text,
      'course', 'student_course', null, new.id, null, 'course', new.id,
      coalesce(nullif(trim(new.description), ''), 'Nouveau cours'),
      'Un nouveau cours est accessible dans votre parcours.',
      '/etudiant/seances/' || new.id::text, 'course', new.id,
      'messages', now(), v_available, null
    );
  end if;

  if tg_op = 'UPDATE' and v_is_public and (
    old.session_date is distinct from new.session_date
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.location is distinct from new.location
    or old.room is distinct from new.room
  ) then
    v_planning_key := md5(concat_ws('|', new.session_date::text, new.start_time::text,
      new.end_time::text, coalesce(new.location, ''), coalesce(new.room, '')));
    perform public.enqueue_notification_event(
      'planning:session:' || new.id::text || ':' || v_planning_key,
      'planning:session:' || new.id::text, 'planning', 'student_course',
      null, new.id, null, 'session_planning', new.id,
      coalesce(nullif(trim(new.description), ''), 'Planning mis à jour'),
      'La date, l’horaire ou le lieu de ce cours a été modifié.',
      '/etudiant/seances/' || new.id::text, 'course_planning', new.id,
      'messages', now(), greatest(now(), v_available), null
    );
  end if;
  return new;
end $$;

drop trigger if exists queue_session_notification on public.sessions;
create trigger queue_session_notification
after insert or update of is_draft, editorial_status, publication_at, session_date, start_time, end_time, location, room
on public.sessions for each row execute function public.queue_session_notification();

create or replace function public.queue_opportunity_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_available timestamptz;
begin
  if new.publication_status not in ('published', 'scheduled') then return new; end if;
  v_available := case when new.publication_status = 'scheduled' then new.published_at else coalesce(new.published_at, now()) end;
  if tg_op = 'INSERT'
     or old.publication_status is distinct from new.publication_status
     or old.published_at is distinct from new.published_at then
    perform public.enqueue_notification_event(
      'opportunity:' || new.id::text, 'opportunity:' || new.id::text,
      'opportunity', 'student_opportunity', null, null, new.id,
      'opportunity', new.id, new.title,
      'Un nouveau projet ou une nouvelle formation est accessible.',
      '/etudiant/services/' || new.id::text, 'opportunity', new.id,
      'messages', now(), coalesce(v_available, now()), null
    );
  end if;
  return new;
end $$;

drop trigger if exists queue_opportunity_notification on public.opportunities;
create trigger queue_opportunity_notification
after insert or update of publication_status, published_at, title on public.opportunities
for each row execute function public.queue_opportunity_notification();

create or replace function public.queue_opportunity_resource_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_notification_event(
    'opportunity-resource:' || new.id::text,
    'opportunity-resource:' || new.id::text,
    'material', 'student_opportunity', null, null, new.opportunity_id,
    'opportunity_resource', new.id, new.title,
    'Une nouvelle ressource est disponible.',
    '/etudiant/services/' || new.opportunity_id::text,
    'opportunity_resource', new.id, 'messages', now(), now(), null
  );
  return new;
end $$;

drop trigger if exists queue_opportunity_resource_notification on public.opportunity_resources;
create trigger queue_opportunity_resource_notification
after insert or update of title, external_url, file_path on public.opportunity_resources
for each row execute function public.queue_opportunity_resource_notification();

create or replace function public.queue_opportunity_date_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_key text;
begin
  if tg_op <> 'UPDATE' or not (
    old.session_date is distinct from new.session_date
    or old.start_time is distinct from new.start_time
    or old.end_time is distinct from new.end_time
    or old.location is distinct from new.location
    or old.room is distinct from new.room
  ) then return new; end if;
  v_key := md5(concat_ws('|', new.session_date::text, new.start_time::text,
    new.end_time::text, coalesce(new.location, ''), coalesce(new.room, '')));
  perform public.enqueue_notification_event(
    'planning:opportunity-date:' || new.id::text || ':' || v_key,
    'planning:opportunity-date:' || new.id::text,
    'planning', 'student_opportunity', null, null, new.opportunity_id,
    'opportunity_planning', new.id, 'Planning mis à jour',
    'La date, l’horaire ou le lieu d’une séance a été modifié.',
    '/etudiant/services/' || new.opportunity_id::text,
    'opportunity_planning', new.id, 'messages', now(), now(), null
  );
  return new;
end $$;

drop trigger if exists queue_opportunity_date_notification on public.opportunity_dates;
create trigger queue_opportunity_date_notification
after update of session_date, start_time, end_time, location, room on public.opportunity_dates
for each row execute function public.queue_opportunity_date_notification();

create or replace function public.notification_preference_enabled(p_prefs jsonb, p_key text)
returns boolean language sql immutable parallel safe as $$
  select case
    when p_key is null then true
    when jsonb_typeof(coalesce(p_prefs, '{}'::jsonb)->p_key) = 'boolean'
      then (coalesce(p_prefs, '{}'::jsonb)->>p_key)::boolean
    else true
  end
$$;

create or replace function public.notification_event_audience_matches(
  p_event public.notification_events,
  p_profile public.profiles,
  p_run_at timestamptz
) returns boolean language sql stable security definer set search_path = public as $$
  select case p_event.audience_type
    when 'recipient' then p_event.recipient_id = p_profile.id
    when 'student_course' then p_profile.role = 'student' and exists(
      select 1 from public.sessions s where s.id = p_event.session_id
        and not coalesce(s.is_draft, false)
        and (
          s.session_type = 'commun'
          or (
            s.ministry_id = p_profile.ministry_id
            and (s.editorial_status = 'published'
              or (s.editorial_status = 'scheduled' and s.publication_at <= p_run_at))
          )
        )
    )
    when 'student_opportunity' then p_profile.role = 'student' and exists(
      select 1 from public.opportunities o where o.id = p_event.opportunity_id
        and o.archived_at is null
        and (o.publication_status = 'published'
          or (o.publication_status = 'scheduled' and o.published_at <= p_run_at))
    )
    else false
  end
$$;

create or replace function public.notification_events_for_recipient(
  p_recipient uuid,
  p_run_at timestamptz
) returns setof public.notification_events
language sql stable security definer set search_path = public as $$
  with candidate as (
    select e.*
    from public.notification_events e
    join public.profiles p on p.id = p_recipient
    where e.cancelled_at is null
      and e.available_at <= p_run_at
      and e.occurred_at > p_run_at - interval '7 days'
      and public.notification_event_audience_matches(e, p, p_run_at)
      and public.notification_preference_enabled(p.notification_prefs, e.preference_key)
      and not exists(
        select 1 from public.notification_event_receipts r
        where r.recipient_id = p_recipient and r.event_id = e.id
      )
  ), without_course_duplicates as (
    select c.* from candidate c
    where not (
      c.resource_type in ('video', 'material', 'assignment')
      and exists(select 1 from candidate course
        where course.resource_type = 'course' and course.session_id = c.session_id)
    )
      and not (
        c.resource_type = 'opportunity_resource'
        and exists(select 1 from candidate opportunity
          where opportunity.resource_type = 'opportunity'
            and opportunity.opportunity_id = c.opportunity_id)
      )
  )
  select distinct on (aggregate_key) d.*
  from without_course_duplicates d
  order by aggregate_key, occurred_at desc, id desc
$$;

create or replace function public.create_daily_notification_digest(p_run_at timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  person public.profiles%rowtype;
  v_day date := (p_run_at at time zone 'Europe/Paris')::date;
  v_count integer;
  v_course integer;
  v_video integer;
  v_material integer;
  v_assignment integer;
  v_deadline integer;
  v_planning integer;
  v_opportunity integer;
  v_workflow integer;
  v_details text;
  v_summary text;
  v_announcement uuid;
  v_delivery uuid;
  v_author uuid;
  v_sent integer := 0;
begin
  if extract(hour from (p_run_at at time zone 'Europe/Paris')) <> 9 then return 0; end if;
  if not pg_try_advisory_xact_lock(hashtext('daily-notification-digest:' || v_day::text)) then return 0; end if;
  select id into v_author from public.profiles where role = 'admin' order by created_at limit 1;
  if v_author is null then return 0; end if;

  for person in
    select * from public.profiles
    where coalesce(deactivated, false) = false and email_confirmed
    order by id
  loop
    if exists(select 1 from public.notification_digest_deliveries d
      where d.recipient_id = person.id and d.digest_date = v_day) then
      continue;
    end if;

    -- Une préférence désactivée consomme silencieusement les événements concernés :
    -- ils ne réapparaîtront pas si la préférence est réactivée plusieurs jours après.
    insert into public.notification_event_receipts(recipient_id, event_id, status, processed_at)
    select person.id, e.id, 'skipped', p_run_at
    from public.notification_events e
    where e.cancelled_at is null and e.available_at <= p_run_at
      and e.occurred_at > p_run_at - interval '7 days'
      and public.notification_event_audience_matches(e, person, p_run_at)
      and not public.notification_preference_enabled(person.notification_prefs, e.preference_key)
    on conflict do nothing;

    begin
      select count(*),
        count(*) filter(where resource_type = 'course'),
        count(*) filter(where resource_type = 'video'),
        count(*) filter(where resource_type in ('material', 'opportunity_resource')),
        count(*) filter(where resource_type = 'assignment'),
        count(*) filter(where resource_type = 'assignment_deadline'),
        count(*) filter(where category = 'planning'),
        count(*) filter(where resource_type = 'opportunity'),
        count(*) filter(where category = 'workflow'),
        string_agg('• ' || title, E'\n' order by occurred_at, title)
      into v_count, v_course, v_video, v_material, v_assignment, v_deadline,
        v_planning, v_opportunity, v_workflow, v_details
      from public.notification_events_for_recipient(person.id, p_run_at);

      if v_count = 0 then continue; end if;

      v_summary := array_to_string(array_remove(array[
        case when v_course > 0 then v_course || ' nouveau' || case when v_course > 1 then 'x cours' else ' cours' end end,
        case when v_opportunity > 0 then v_opportunity || ' nouveau' || case when v_opportunity > 1 then 'x projets ou formations' else ' projet ou formation' end end,
        case when v_video > 0 then v_video || ' vidéo' || case when v_video > 1 then 's' else '' end end,
        case when v_material > 0 then v_material || ' support' || case when v_material > 1 then 's' else '' end end,
        case when v_assignment > 0 then v_assignment || ' devoir' || case when v_assignment > 1 then 's' else '' end end,
        case when v_deadline > 0 then v_deadline || ' échéance' || case when v_deadline > 1 then 's' else '' end end,
        case when v_planning > 0 then v_planning || ' modification' || case when v_planning > 1 then 's de planning' else ' de planning' end end,
        case when v_workflow > 0 then v_workflow || ' action' || case when v_workflow > 1 then 's à traiter' else ' à traiter' end end
      ], null), ', ');

      v_announcement := gen_random_uuid();
      insert into public.announcements(
        id, title, body, author_id, recipient_id, is_system,
        target_url, target_type, cta_label, digest_date, created_at
      ) values (
        v_announcement, 'Du nouveau dans Ministry School !',
        'Depuis le dernier récapitulatif : ' || v_summary || '.' || E'\n\n' || v_details,
        v_author, person.id, true,
        '/etudiant/messages/' || v_announcement::text,
        'daily_notification_digest', 'Voir le récapitulatif', v_day, p_run_at
      );

      insert into public.notification_digest_deliveries(recipient_id, digest_date, announcement_id, delivered_at)
      values(person.id, v_day, v_announcement, p_run_at)
      returning id into v_delivery;

      insert into public.notification_digest_items(delivery_id, event_id, position)
      select v_delivery, e.id, row_number() over(order by e.occurred_at, e.title)
      from public.notification_events_for_recipient(person.id, p_run_at) e;

      -- Les reçus ne sont écrits qu'après la création réussie de l'annonce et de
      -- sa livraison. Une erreur laisse donc tous les événements réessayables.
      insert into public.notification_event_receipts(recipient_id, event_id, delivery_id, status, processed_at)
      select person.id, e.id, v_delivery, 'delivered', p_run_at
      from public.notification_events e
      where e.cancelled_at is null and e.available_at <= p_run_at
        and e.occurred_at > p_run_at - interval '7 days'
        and public.notification_event_audience_matches(e, person, p_run_at)
        and public.notification_preference_enabled(person.notification_prefs, e.preference_key)
        and not exists(select 1 from public.notification_event_receipts r
          where r.recipient_id = person.id and r.event_id = e.id)
      on conflict do nothing;

      delete from public.notification_digest_failures
      where recipient_id = person.id and digest_date = v_day;
      v_sent := v_sent + 1;
    exception when others then
      insert into public.notification_digest_failures(recipient_id, digest_date, attempt_count, last_error, last_attempt_at)
      values(person.id, v_day, 1, sqlerrm, p_run_at)
      on conflict(recipient_id, digest_date) do update set
        attempt_count = notification_digest_failures.attempt_count + 1,
        last_error = excluded.last_error,
        last_attempt_at = excluded.last_attempt_at;
    end;
  end loop;
  return v_sent;
end $$;

create or replace function public.daily_notification_digest_details(p_announcement uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not exists(select 1 from public.announcements a
    where a.id = p_announcement and a.recipient_id = auth.uid()
      and a.target_type = 'daily_notification_digest') then
    raise exception 'FORBIDDEN';
  end if;
  select jsonb_build_object(
    'date', d.digest_date,
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'category', e.category,
      'title', e.title,
      'body', e.body,
      'targetUrl', case when e.target_url like '/%' then e.target_url else null end,
      'targetType', e.target_type
    ) order by i.position), '[]'::jsonb)
  ) into v_result
  from public.notification_digest_deliveries d
  left join public.notification_digest_items i on i.delivery_id = d.id
  left join public.notification_events e on e.id = i.event_id
  where d.announcement_id = p_announcement and d.recipient_id = auth.uid()
  group by d.digest_date;
  return coalesce(v_result, jsonb_build_object('date', null, 'items', '[]'::jsonb));
end $$;

-- Nettoyage des doublons historiques strictement identiques, sans supprimer les
-- informations distinctes ni réécrire les dates de disponibilité.
with duplicates as (
  select id, row_number() over (
    partition by recipient_id, coalesce(target_type, ''), coalesce(target_id::text, ''),
      title, body, (created_at at time zone 'Europe/Paris')::date
    order by created_at, id
  ) as position
  from public.announcements
  where is_system and recipient_id is not null
)
delete from public.announcements a using duplicates d
where a.id = d.id and d.position > 1;

-- Les alertes automatiques déjà créées aujourd'hui sont remises dans la file :
-- elles seront regroupées au prochain passage de 9 h et ne sont pas perdues.
insert into public.notification_events(
  dedupe_key, aggregate_key, category, recipient_id, audience_type,
  session_id, opportunity_id, resource_type, resource_id, title, body,
  target_url, target_type, target_id, occurred_at, available_at
)
select
  'legacy:' || a.recipient_id::text || ':' || coalesce(a.target_type, 'system') || ':' ||
    coalesce(a.target_id::text, coalesce(a.opportunity_id::text, a.session_id::text, 'none')) || ':' ||
    ((a.created_at at time zone 'Europe/Paris')::date)::text || ':' || md5(a.title || '|' || a.body),
  'legacy:' || a.recipient_id::text || ':' || coalesce(a.target_type, 'system') || ':' ||
    coalesce(a.target_id::text, coalesce(a.opportunity_id::text, a.session_id::text, 'none')),
  'workflow', a.recipient_id, 'recipient', a.session_id, a.opportunity_id,
  coalesce(a.target_type, 'system'), coalesce(a.target_id, a.opportunity_id, a.session_id),
  a.title, a.body, a.target_url, a.target_type, a.target_id, a.created_at, a.created_at
from public.announcements a
where a.is_system and a.recipient_id is not null
  and a.target_type <> 'daily_notification_digest'
  and (a.created_at at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date
on conflict(dedupe_key) do nothing;

delete from public.announcements a
where a.is_system and a.recipient_id is not null
  and a.target_type <> 'daily_notification_digest'
  and (a.created_at at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date;

-- Les contenus déjà programmés dans le futur rejoignent la file sans annoncer
-- les contenus déjà accessibles au moment de la migration.
insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'material:' || m.id, 'material:' || m.id, 'material', 'student_course', m.session_id,
  'material', m.id, coalesce(nullif(trim(m.title), ''), 'Nouveau support'),
  'Un nouveau support pédagogique est disponible.', '/etudiant/seances/' || m.session_id,
  'course_material', m.id, 'messages', now(), m.visible_at
from public.materials m join public.sessions s on s.id = m.session_id
where m.visible_at > now() or (s.editorial_status = 'scheduled' and s.publication_at > now())
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at, due_at
)
select 'assignment:' || a.id, 'assignment:' || a.id, 'assignment', 'student_course', a.session_id,
  'assignment', a.id, coalesce(nullif(trim(a.title), ''), 'Nouveau devoir'),
  'Un nouveau devoir est disponible.', '/etudiant/travail', 'assignment', a.id,
  'travail', now(), a.visible_at, a.due_at
from public.assignments a join public.sessions s on s.id = a.session_id
where a.visible_at > now() or (s.editorial_status = 'scheduled' and s.publication_at > now())
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'video:' || v.session_id, 'video:' || v.session_id, 'video', 'student_course', v.session_id,
  'video', v.session_id, coalesce(nullif(trim(s.description), ''), 'Nouveau replay'),
  'La vidéo ou le replay de ce cours est disponible.', '/etudiant/seances/' || v.session_id,
  'course_video', v.session_id, 'messages', now(), v.visible_at
from public.session_videos v join public.sessions s on s.id = v.session_id
where v.visible_at > now() or (s.editorial_status = 'scheduled' and s.publication_at > now())
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'course:' || s.id, 'course:' || s.id, 'course', 'student_course', s.id,
  'course', s.id, coalesce(nullif(trim(s.description), ''), 'Nouveau cours'),
  'Un nouveau cours est accessible dans votre parcours.', '/etudiant/seances/' || s.id,
  'course', s.id, 'messages', now(), s.publication_at
from public.sessions s
where s.editorial_status = 'scheduled' and s.publication_at > now()
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, opportunity_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'opportunity:' || o.id, 'opportunity:' || o.id, 'opportunity', 'student_opportunity', o.id,
  'opportunity', o.id, o.title, 'Un nouveau projet ou une nouvelle formation est accessible.',
  '/etudiant/services/' || o.id, 'opportunity', o.id, 'messages', now(), o.published_at
from public.opportunities o
where o.publication_status = 'scheduled' and o.published_at > now()
on conflict(dedupe_key) do nothing;

-- L'ancien producteur est neutralisé ; toutes les sources utilisent le digest unique.
create or replace function public.create_daily_course_content_digest(p_run_at timestamptz default now())
returns integer language sql security definer set search_path = public as $$
  select public.create_daily_notification_digest(p_run_at)
$$;

do $$ begin
  perform cron.unschedule(jobid) from cron.job
  where jobname in ('daily-course-content-digest', 'daily-smart-notification-digest');
exception when undefined_table then null;
end $$;
select cron.schedule(
  'daily-smart-notification-digest',
  '0 * * * *',
  $digest$select public.create_daily_notification_digest(now());$digest$
);

revoke all on function public.enqueue_notification_event(text,text,text,text,uuid,uuid,uuid,text,uuid,text,text,text,text,uuid,text,timestamptz,timestamptz,timestamptz) from public;
revoke all on function public.create_daily_notification_digest(timestamptz) from public;
revoke all on function public.notification_events_for_recipient(uuid,timestamptz) from public;
grant execute on function public.create_daily_notification_digest(timestamptz) to service_role;
grant execute on function public.create_daily_course_content_digest(timestamptz) to service_role;
grant execute on function public.daily_notification_digest_details(uuid) to authenticated;

commit;
