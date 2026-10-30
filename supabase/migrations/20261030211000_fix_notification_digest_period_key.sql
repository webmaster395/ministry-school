begin;

-- La colonne deliveries.period_key et la variable PL/pgSQL portaient le même
-- nom dans la première version. Le nom explicite v_period_key évite toute
-- ambiguïté au premier passage de l'ordonnanceur.
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
          course_count || ' cours. Retrouve-les dès maintenant dans ton espace étudiant.';
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

revoke all on function public.create_notification_digest(timestamptz) from public;
grant execute on function public.create_notification_digest(timestamptz) to service_role;

commit;
