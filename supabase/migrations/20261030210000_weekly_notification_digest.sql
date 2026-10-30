begin;

-- La configuration est unique pour toute la plateforme. Le traitement lit cette
-- ligne à chaque passage : un changement dans Admin est donc effectif sans
-- redéploiement ni second ordonnanceur.
create table if not exists public.notification_digest_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly')),
  weekday smallint not null default 0 check (weekday between 0 and 6),
  send_time time without time zone not null default '10:00',
  timezone text not null default 'Europe/Paris' check (timezone = 'Europe/Paris'),
  activated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  last_processed_at timestamptz,
  last_status text not null default 'ready' check (last_status in ('ready', 'running', 'success', 'partial', 'failed')),
  last_sent_count integer not null default 0,
  last_period_key text,
  last_error text
);

insert into public.notification_digest_settings(id, enabled, frequency, weekday, send_time, timezone)
values(true, true, 'weekly', 0, '10:00', 'Europe/Paris')
on conflict(id) do update set
  enabled = true,
  frequency = 'weekly',
  weekday = 0,
  send_time = '10:00',
  timezone = 'Europe/Paris',
  activated_at = now(),
  updated_at = now(),
  updated_by = null,
  last_processed_at = null,
  last_status = 'ready',
  last_sent_count = 0,
  last_period_key = null,
  last_error = null;

alter table public.notification_digest_settings enable row level security;

-- Une livraison est identifiée par la période réellement traitée. digest_date
-- reste présent pour la compatibilité avec l'interface et les migrations passées.
alter table public.notification_digest_deliveries
  add column if not exists period_key text,
  add column if not exists frequency text,
  add column if not exists period_started_at timestamptz,
  add column if not exists period_ended_at timestamptz;

create unique index if not exists notification_digest_one_delivery_per_period
  on public.notification_digest_deliveries(recipient_id, period_key)
  where period_key is not null;

alter table public.notification_digest_failures
  add column if not exists period_key text;

alter table public.announcements
  add column if not exists digest_period_key text;

drop index if exists public.announcements_one_daily_digest_per_recipient;
create unique index if not exists announcements_one_digest_per_recipient_period
  on public.announcements(recipient_id, digest_period_key)
  where recipient_id is not null
    and digest_period_key is not null
    and target_type = 'notification_digest';

-- Remise à zéro demandée : uniquement l'historique des messages et les
-- journaux techniques associés. Les contenus, inscriptions et données métier
-- ne sont pas touchés. Le nouveau point de départ est activated_at ci-dessus.
delete from public.notification_digest_items;
delete from public.notification_event_receipts;
delete from public.notification_digest_failures;
delete from public.notification_digest_deliveries;
delete from public.notification_events;
delete from public.course_content_notification_log;
delete from public.announcements;
update public.profiles set notifications_seen_at = now();

alter table public.notification_events drop constraint if exists notification_events_category_check;
alter table public.notification_events add constraint notification_events_category_check
  check (category in (
    'course', 'video', 'material', 'assignment', 'deadline',
    'planning', 'opportunity', 'workflow', 'information'
  ));

-- Les événements administratifs automatiques ne deviennent plus des messages
-- étudiants. Une information humaine destinée aux étudiants rejoint la file et
-- attend le prochain digest au lieu d'apparaître immédiatement.
create or replace function public.queue_automatic_announcement()
returns trigger language plpgsql security definer set search_path = public as $$
declare person record;
begin
  if new.target_type = 'notification_digest' then return new; end if;
  if coalesce(new.is_system, false) then return null; end if;

  if new.recipient_id is not null then
    perform public.enqueue_notification_event(
      'information:' || new.id::text || ':' || new.recipient_id::text,
      'information:' || new.id::text, 'information', 'recipient',
      new.recipient_id, new.session_id, new.opportunity_id,
      'information', new.id, new.title, new.body,
      coalesce(new.target_url, '/etudiant/cours'), 'pedagogical_information',
      new.target_id, 'messages', coalesce(new.created_at, now()), coalesce(new.created_at, now()), null
    );
  elsif new.session_id is not null then
    perform public.enqueue_notification_event(
      'information:' || new.id::text, 'information:' || new.id::text,
      'information', 'student_course', null, new.session_id, null,
      'information', new.id, new.title, new.body,
      coalesce(new.target_url, '/etudiant/seances/' || new.session_id::text),
      'pedagogical_information', new.target_id, 'messages',
      coalesce(new.created_at, now()), coalesce(new.created_at, now()), null
    );
  elsif new.opportunity_id is not null then
    perform public.enqueue_notification_event(
      'information:' || new.id::text, 'information:' || new.id::text,
      'information', 'student_opportunity', null, null, new.opportunity_id,
      'information', new.id, new.title, new.body,
      coalesce(new.target_url, '/etudiant/services/' || new.opportunity_id::text),
      'pedagogical_information', new.target_id, 'messages',
      coalesce(new.created_at, now()), coalesce(new.created_at, now()), null
    );
  else
    for person in
      select profile.id from public.profiles profile
      where not coalesce(profile.deactivated, false) and profile.email_confirmed
        and (new.ministry_id is null or profile.ministry_id = new.ministry_id)
        and (new.day is null or profile.preferred_day = new.day)
    loop
      perform public.enqueue_notification_event(
        'information:' || new.id::text || ':' || person.id::text,
        'information:' || new.id::text, 'information', 'recipient',
        person.id, null, null, 'information', new.id, new.title, new.body,
        coalesce(new.target_url, '/etudiant/cours'), 'pedagogical_information',
        new.target_id, 'messages', coalesce(new.created_at, now()), coalesce(new.created_at, now()), null
      );
    end loop;
  end if;
  return null;
end $$;

drop trigger if exists zz_queue_automatic_announcement on public.announcements;
create trigger zz_queue_automatic_announcement
before insert on public.announcements
for each row execute function public.queue_automatic_announcement();

-- Les producteurs ne font qu'enregistrer la nouveauté. Ils ne créent jamais de
-- message au moment de l'ajout ou de la programmation.
create or replace function public.queue_material_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible_at is null then return new; end if;
  perform public.enqueue_notification_event(
    'material:' || new.id::text, 'material:' || new.id::text,
    'material', 'student_course', null, new.session_id, null, 'material', new.id,
    coalesce(nullif(trim(new.title), ''), 'Nouveau support de cours'),
    'Ce support est maintenant accessible.',
    '/etudiant/seances/' || new.session_id::text, 'course_material', new.id,
    'messages', now(), new.visible_at, null
  );
  return new;
end $$;

create or replace function public.queue_assignment_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible_at is not null then
    perform public.enqueue_notification_event(
      'assignment:' || new.id::text, 'assignment:' || new.id::text,
      'assignment', 'student_course', null, new.session_id, null, 'assignment', new.id,
      coalesce(nullif(trim(new.title), ''), 'Nouveau devoir'),
      'Ce devoir est maintenant accessible.', '/etudiant/travail',
      'assignment', new.id, 'travail', now(), new.visible_at, new.due_at
    );
  end if;
  update public.notification_events
  set cancelled_at = now(), updated_at = now()
  where resource_type = 'assignment_deadline' and resource_id = new.id
    and not exists(
      select 1 from public.notification_event_receipts receipt
      where receipt.event_id = notification_events.id
    );
  return new;
end $$;

create or replace function public.queue_video_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.visible_at is null then return new; end if;
  perform public.enqueue_notification_event(
    'video:' || new.session_id::text, 'video:' || new.session_id::text,
    'video', 'student_course', null, new.session_id, null, 'video', new.session_id,
    'Replay du cours',
    'La vidéo ou le replay est maintenant accessible.',
    '/etudiant/seances/' || new.session_id::text, 'course_video', new.session_id,
    'messages', now(), new.visible_at, null
  );
  return new;
end $$;

-- Les créations de cours, changements de planning, échéances et workflows ne
-- sont plus des nouveautés étudiantes. Les triggers sont retirés pour empêcher
-- la régénération de l'ancien historique.
drop trigger if exists queue_session_notification on public.sessions;
drop trigger if exists queue_opportunity_notification on public.opportunities;
drop trigger if exists queue_opportunity_date_notification on public.opportunity_dates;

-- Les ressources d'une initiative publiée restent des contenus pédagogiques
-- pertinents et rejoignent la même file, sans message immédiat.
create or replace function public.queue_opportunity_resource_notification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.enqueue_notification_event(
    'opportunity-resource:' || new.id::text,
    'opportunity-resource:' || new.id::text,
    'material', 'student_opportunity', null, null, new.opportunity_id,
    'opportunity_resource', new.id, new.title,
    'Cette ressource est maintenant accessible.',
    '/etudiant/services/' || new.opportunity_id::text,
    'opportunity_resource', new.id, 'messages', now(), now(), null
  );
  return new;
end $$;

-- Une nouveauté de cours n'est éligible que si le cours est réellement visible
-- dans le parcours de la personne au moment du traitement.
create or replace function public.notification_event_audience_matches(
  p_event public.notification_events,
  p_profile public.profiles,
  p_run_at timestamptz
) returns boolean language sql stable security definer set search_path = public as $$
  select case p_event.audience_type
    when 'recipient' then p_event.recipient_id = p_profile.id
    when 'student_course' then exists(
      select 1
      from public.sessions session
      where session.id = p_event.session_id
        and session.opportunity_id is null
        and not coalesce(session.is_draft, false)
        and (
          session.session_type = 'commun'
          or (
            session.ministry_id = p_profile.ministry_id
            and (p_profile.preferred_day is null or session.day = p_profile.preferred_day)
            and (
              session.editorial_status = 'published'
              or (session.editorial_status = 'scheduled' and session.publication_at <= p_run_at)
            )
          )
        )
    )
    when 'student_opportunity' then exists(
      select 1
      from public.opportunities opportunity
      where opportunity.id = p_event.opportunity_id
        and opportunity.archived_at is null
        and (
          opportunity.publication_status = 'published'
          or (opportunity.publication_status = 'scheduled' and opportunity.published_at <= p_run_at)
        )
    )
    else false
  end
$$;

create or replace function public.notification_events_for_recipient(
  p_recipient uuid,
  p_run_at timestamptz
) returns setof public.notification_events
language sql stable security definer set search_path = public as $$
  select distinct on (event.aggregate_key) event.*
  from public.notification_events event
  join public.profiles profile on profile.id = p_recipient
  cross join public.notification_digest_settings settings
  where settings.id
    and event.cancelled_at is null
    and event.available_at <= p_run_at
    and event.occurred_at >= settings.activated_at
    and event.category in ('video', 'material', 'assignment', 'information')
    and public.notification_event_audience_matches(event, profile, p_run_at)
    and public.notification_preference_enabled(profile.notification_prefs, event.preference_key)
    and not exists(
      select 1 from public.notification_event_receipts receipt
      where receipt.recipient_id = p_recipient and receipt.event_id = event.id
    )
  order by event.aggregate_key, event.occurred_at desc, event.id desc
$$;

-- Prochain créneau en heure locale. La conversion AT TIME ZONE applique
-- automatiquement les bascules heure d'été / heure d'hiver.
create or replace function public.next_notification_digest_run(p_from timestamptz default now())
returns timestamptz language sql stable security definer set search_path = public as $$
  with settings as (
    select * from public.notification_digest_settings where id and enabled
  ), dates as (
    select settings.*,
      ((p_from at time zone settings.timezone)::date + series.day_offset)::date as local_day
    from settings cross join generate_series(0, 14) as series(day_offset)
  ), candidates as (
    select ((dates.local_day + dates.send_time) at time zone dates.timezone) as candidate
    from dates
    where dates.frequency = 'daily'
      or extract(dow from dates.local_day)::integer = dates.weekday
  )
  select min(candidate) from candidates where candidate > p_from
$$;

create or replace function public.notification_digest_admin_state()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare settings public.notification_digest_settings%rowtype;
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  select * into settings from public.notification_digest_settings where id;
  return jsonb_build_object(
    'enabled', settings.enabled,
    'frequency', settings.frequency,
    'weekday', settings.weekday,
    'sendTime', to_char(settings.send_time, 'HH24:MI'),
    'timezone', settings.timezone,
    'activatedAt', settings.activated_at,
    'updatedAt', settings.updated_at,
    'nextRunAt', public.next_notification_digest_run(now()),
    'lastProcessedAt', settings.last_processed_at,
    'lastStatus', settings.last_status,
    'lastSentCount', settings.last_sent_count,
    'lastError', settings.last_error
  );
end $$;

create or replace function public.update_notification_digest_settings(
  p_enabled boolean,
  p_frequency text,
  p_weekday integer,
  p_send_time time without time zone,
  p_timezone text default 'Europe/Paris'
) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
  if p_frequency not in ('daily', 'weekly') then raise exception 'INVALID_FREQUENCY'; end if;
  if p_weekday not between 0 and 6 then raise exception 'INVALID_WEEKDAY'; end if;
  if p_timezone <> 'Europe/Paris' then raise exception 'INVALID_TIMEZONE'; end if;

  update public.notification_digest_settings set
    enabled = p_enabled,
    frequency = p_frequency,
    weekday = p_weekday,
    send_time = p_send_time,
    timezone = p_timezone,
    updated_at = now(),
    updated_by = auth.uid()
  where id;
  return public.notification_digest_admin_state();
end $$;

-- Une seule fonction de traitement, quelle que soit la fréquence configurée.
-- Les reçus sont écrits uniquement après la création réussie du message.
create or replace function public.create_notification_digest(p_run_at timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare
  settings public.notification_digest_settings%rowtype;
  person public.profiles%rowtype;
  local_time timestamp without time zone;
  digest_day date;
  v_period_key text;
  event_ids uuid[];
  event_count integer;
  course_count integer;
  event_title text;
  event_resource_type text;
  event_course_title text;
  message_title text;
  message_body text;
  announcement_id uuid;
  delivery_id uuid;
  author_id uuid;
  sent_count integer := 0;
  failure_count integer := 0;
begin
  select * into settings from public.notification_digest_settings where id for update;
  if not found or not settings.enabled then return 0; end if;

  local_time := p_run_at at time zone settings.timezone;
  if settings.frequency = 'weekly' and extract(dow from local_time)::integer <> settings.weekday then return 0; end if;
  if local_time::time < settings.send_time
     or local_time::time >= settings.send_time + interval '1 minute' then return 0; end if;

  digest_day := local_time::date;
  v_period_key := settings.frequency || ':' || digest_day::text;
  if not pg_try_advisory_xact_lock(hashtext('notification-digest:' || v_period_key)) then return 0; end if;

  update public.notification_digest_settings set
    last_processed_at = p_run_at,
    last_status = 'running',
    last_period_key = v_period_key,
    last_error = null
  where id;

  select profile.id into author_id
  from public.profiles profile
  where not coalesce(profile.deactivated, false)
  order by profile.is_super_admin desc, (profile.role = 'admin') desc, profile.created_at
  limit 1;
  if author_id is null then
    update public.notification_digest_settings
    set last_status = 'failed', last_error = 'Aucun auteur système disponible.'
    where id;
    return 0;
  end if;

  for person in
    select * from public.profiles
    where not coalesce(deactivated, false) and email_confirmed
    order by id
  loop
    if exists(
      select 1 from public.notification_digest_deliveries delivery
      where delivery.recipient_id = person.id
        and (delivery.period_key = v_period_key or delivery.digest_date = digest_day)
    ) then continue; end if;

    -- Une préférence désactivée consomme uniquement les événements qui étaient
    -- déjà accessibles à ce créneau ; ils ne réapparaissent pas plus tard.
    insert into public.notification_event_receipts(recipient_id, event_id, status, processed_at)
    select person.id, event.id, 'skipped', p_run_at
    from public.notification_events event
    where event.cancelled_at is null
      and event.available_at <= p_run_at
      and event.occurred_at >= settings.activated_at
      and event.category in ('video', 'material', 'assignment', 'information')
      and public.notification_event_audience_matches(event, person, p_run_at)
      and not public.notification_preference_enabled(person.notification_prefs, event.preference_key)
    on conflict do nothing;

    begin
      select array_agg(event.id order by event.occurred_at, event.title, event.id)
      into event_ids
      from public.notification_events_for_recipient(person.id, p_run_at) event;
      event_count := coalesce(cardinality(event_ids), 0);
      if event_count = 0 then continue; end if;

      select count(distinct coalesce(event.session_id::text, event.opportunity_id::text, 'general')),
        min(event.resource_type), min(event.title),
        min(coalesce(course.title, session.description, opportunity.title, 'Ministry School'))
      into course_count, event_resource_type, event_title, event_course_title
      from unnest(event_ids) selected(id)
      join public.notification_events event on event.id = selected.id
      left join public.sessions session on session.id = event.session_id
      left join public.courses course on course.id = session.course_id
      left join public.opportunities opportunity on opportunity.id = event.opportunity_id;

      if event_count = 1 then
        message_title := case event_resource_type
          when 'video' then 'Ton nouveau replay est disponible'
          when 'assignment' then 'Ton nouveau devoir est disponible'
          when 'opportunity_resource' then 'Une nouvelle ressource est disponible'
          when 'information' then 'Une information importante est disponible'
          else 'Ton nouveau support de cours est disponible'
        end;
        message_body := '« ' || event_title || ' » est maintenant accessible dans « ' || event_course_title || ' ».';
      else
        message_title := case when settings.frequency = 'weekly'
          then 'Tes nouveautés de la semaine'
          else 'Tes nouveautés du jour'
        end;
        message_body := event_count || ' nouveaux contenus sont disponibles dans ' ||
          course_count || ' cours.' ||
          ' Retrouve-les dès maintenant dans ton espace étudiant.';
      end if;

      announcement_id := gen_random_uuid();
      insert into public.announcements(
        id, title, body, author_id, recipient_id, is_system,
        target_url, target_type, cta_label, digest_date, digest_period_key, created_at
      ) values (
        announcement_id, message_title, message_body, author_id, person.id, true,
        '/etudiant/messages/' || announcement_id::text,
        'notification_digest', 'Voir les nouveautés', digest_day, v_period_key, p_run_at
      );

      insert into public.notification_digest_deliveries(
        recipient_id, digest_date, announcement_id, delivered_at, period_key,
        frequency, period_started_at, period_ended_at
      ) values (
        person.id, digest_day, announcement_id, p_run_at, v_period_key,
        settings.frequency, settings.activated_at, p_run_at
      ) returning id into delivery_id;

      insert into public.notification_digest_items(delivery_id, event_id, position)
      select delivery_id, event.id, row_number() over(order by event.occurred_at, event.title, event.id)
      from unnest(event_ids) selected(id)
      join public.notification_events event on event.id = selected.id;

      insert into public.notification_event_receipts(recipient_id, event_id, delivery_id, status, processed_at)
      select person.id, selected.id, delivery_id, 'delivered', p_run_at
      from unnest(event_ids) selected(id)
      on conflict do nothing;

      delete from public.notification_digest_failures
      where recipient_id = person.id and digest_date = digest_day;
      sent_count := sent_count + 1;
    exception when others then
      failure_count := failure_count + 1;
      insert into public.notification_digest_failures(
        recipient_id, digest_date, period_key, attempt_count, last_error, last_attempt_at
      ) values(person.id, digest_day, v_period_key, 1, sqlerrm, p_run_at)
      on conflict(recipient_id, digest_date) do update set
        period_key = excluded.period_key,
        attempt_count = notification_digest_failures.attempt_count + 1,
        last_error = excluded.last_error,
        last_attempt_at = excluded.last_attempt_at;
    end;
  end loop;

  update public.notification_digest_settings set
    last_processed_at = p_run_at,
    last_status = case when failure_count > 0 then 'partial' else 'success' end,
    last_sent_count = sent_count,
    last_period_key = v_period_key,
    last_error = case when failure_count > 0 then failure_count || ' destinataire(s) en échec.' else null end
  where id;
  return sent_count;
exception when others then
  update public.notification_digest_settings set
    last_processed_at = p_run_at,
    last_status = 'failed',
    last_error = sqlerrm
  where id;
  return 0;
end $$;

-- Détails privés du récapitulatif, enrichis du cours afin de permettre le
-- regroupement visuel demandé dans le centre Messages.
create or replace function public.daily_notification_digest_details(p_announcement uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not exists(
    select 1 from public.announcements announcement
    where announcement.id = p_announcement
      and announcement.recipient_id = auth.uid()
      and announcement.target_type = 'notification_digest'
  ) then raise exception 'FORBIDDEN'; end if;

  select jsonb_build_object(
    'date', delivery.digest_date,
    'frequency', delivery.frequency,
    'periodKey', delivery.period_key,
    'title', announcement.title,
    'intro', announcement.body,
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', event.id,
      'category', event.category,
      'title', event.title,
      'body', event.body,
      'targetUrl', case when event.target_url like '/%' then event.target_url else null end,
      'targetType', event.target_type,
      'courseId', coalesce(event.session_id, event.opportunity_id),
      'courseTitle', coalesce(course.title, session.description, opportunity.title, 'Ministry School'),
      'typeLabel', case event.resource_type
        when 'video' then 'Vidéo ou replay'
        when 'assignment' then 'Devoir'
        when 'opportunity_resource' then 'Ressource'
        when 'information' then 'Information pédagogique'
        else 'Support de cours'
      end
    ) order by coalesce(course.title, session.description, opportunity.title, 'Ministry School'), item.position), '[]'::jsonb)
  ) into result
  from public.notification_digest_deliveries delivery
  join public.announcements announcement on announcement.id = delivery.announcement_id
  left join public.notification_digest_items item on item.delivery_id = delivery.id
  left join public.notification_events event on event.id = item.event_id
  left join public.sessions session on session.id = event.session_id
  left join public.courses course on course.id = session.course_id
  left join public.opportunities opportunity on opportunity.id = event.opportunity_id
  where delivery.announcement_id = p_announcement and delivery.recipient_id = auth.uid()
  group by delivery.digest_date, delivery.frequency, delivery.period_key, announcement.title, announcement.body;
  return coalesce(result, jsonb_build_object('date', null, 'frequency', null, 'periodKey', null, 'title', null, 'intro', null, 'items', '[]'::jsonb));
end $$;

-- Les contenus déjà programmés pour une disponibilité future sont suivis sans
-- réannoncer ce qui était accessible avant l'activation du nouveau système.
insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'material:' || material.id, 'material:' || material.id, 'material', 'student_course', material.session_id,
  'material', material.id, coalesce(nullif(trim(material.title), ''), 'Nouveau support de cours'),
  'Ce support est maintenant accessible.', '/etudiant/seances/' || material.session_id,
  'course_material', material.id, 'messages', settings.activated_at,
  greatest(material.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else material.visible_at end)
from public.materials material
join public.sessions session on session.id = material.session_id
cross join public.notification_digest_settings settings
where settings.id and session.opportunity_id is null
  and greatest(material.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else material.visible_at end) > settings.activated_at
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at, due_at
)
select 'assignment:' || assignment.id, 'assignment:' || assignment.id, 'assignment', 'student_course', assignment.session_id,
  'assignment', assignment.id, coalesce(nullif(trim(assignment.title), ''), 'Nouveau devoir'),
  'Ce devoir est maintenant accessible.', '/etudiant/travail', 'assignment', assignment.id,
  'travail', settings.activated_at,
  greatest(assignment.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else assignment.visible_at end), assignment.due_at
from public.assignments assignment
join public.sessions session on session.id = assignment.session_id
cross join public.notification_digest_settings settings
where settings.id and session.opportunity_id is null and assignment.visible_at is not null
  and greatest(assignment.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else assignment.visible_at end) > settings.activated_at
on conflict(dedupe_key) do nothing;

insert into public.notification_events(
  dedupe_key, aggregate_key, category, audience_type, session_id,
  resource_type, resource_id, title, body, target_url, target_type,
  target_id, preference_key, occurred_at, available_at
)
select 'video:' || video.session_id, 'video:' || video.session_id, 'video', 'student_course', video.session_id,
  'video', video.session_id, 'Replay du cours',
  'La vidéo ou le replay est maintenant accessible.', '/etudiant/seances/' || video.session_id,
  'course_video', video.session_id, 'messages', settings.activated_at,
  greatest(video.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else video.visible_at end)
from public.session_videos video
join public.sessions session on session.id = video.session_id
cross join public.notification_digest_settings settings
where settings.id and session.opportunity_id is null
  and greatest(video.visible_at, case when session.editorial_status = 'scheduled' then session.publication_at else video.visible_at end) > settings.activated_at
on conflict(dedupe_key) do nothing;

-- Compatibilité avec les anciens appels : ils utilisent désormais le moteur
-- unique et respectent sa fréquence configurée.
create or replace function public.create_daily_notification_digest(p_run_at timestamptz default now())
returns integer language sql security definer set search_path = public as $$
  select public.create_notification_digest(p_run_at)
$$;
create or replace function public.create_daily_course_content_digest(p_run_at timestamptz default now())
returns integer language sql security definer set search_path = public as $$
  select public.create_notification_digest(p_run_at)
$$;

do $$ begin
  perform cron.unschedule(jobid) from cron.job
  where jobname in ('daily-course-content-digest', 'daily-smart-notification-digest', 'ministry-notification-digest');
exception when undefined_table then null;
end $$;
select cron.schedule(
  'ministry-notification-digest',
  '* * * * *',
  $digest$select public.create_notification_digest(now());$digest$
);

revoke all on table public.notification_digest_settings from public;
revoke all on function public.next_notification_digest_run(timestamptz) from public;
revoke all on function public.notification_digest_admin_state() from public;
revoke all on function public.update_notification_digest_settings(boolean,text,integer,time without time zone,text) from public;
revoke all on function public.create_notification_digest(timestamptz) from public;
revoke all on function public.create_daily_notification_digest(timestamptz) from public;
revoke all on function public.create_daily_course_content_digest(timestamptz) from public;
grant execute on function public.notification_digest_admin_state() to authenticated;
grant execute on function public.update_notification_digest_settings(boolean,text,integer,time without time zone,text) to authenticated;
grant execute on function public.create_notification_digest(timestamptz) to service_role;
grant execute on function public.create_daily_notification_digest(timestamptz) to service_role;
grant execute on function public.create_daily_course_content_digest(timestamptz) to service_role;
grant execute on function public.daily_notification_digest_details(uuid) to authenticated;

commit;
