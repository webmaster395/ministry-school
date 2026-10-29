begin;

-- Le récapitulatif reste à 9 h (Paris), mais un contenu d'un cours ministériel
-- n'est éligible qu'une fois le cours lui-même réellement publié. La programmation
-- éditoriale et la disponibilité propre du contenu restent deux verrous distincts.
create or replace function public.create_daily_course_content_digest(p_run_at timestamptz default now())
returns integer language plpgsql security definer set search_path = public as $$
declare student record; v_author uuid; v_count integer; v_body text; v_announcement uuid; v_sent integer := 0;
begin
  if extract(hour from (p_run_at at time zone 'Europe/Paris')) <> 9 then return 0; end if;
  select id into v_author from public.profiles where role = 'admin' order by created_at limit 1;
  if v_author is null then return 0; end if;

  for student in select id, ministry_id, preferred_day from public.profiles
    where role = 'student' and coalesce(deactivated, false) = false and email_confirmed
  loop
    with available as (
      select 'material'::text kind, m.id content_id, m.visible_at available_at, m.title label
      from public.materials m join public.sessions s on s.id = m.session_id
      where m.visible_at > p_run_at - interval '24 hours' and m.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.editorial_status = 'published'
          or (s.editorial_status = 'scheduled' and s.publication_at <= p_run_at))
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
      union all
      select 'assignment', a.id, a.visible_at, coalesce(a.title, 'Nouveau devoir')
      from public.assignments a join public.sessions s on s.id = a.session_id
      where a.visible_at > p_run_at - interval '24 hours' and a.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.editorial_status = 'published'
          or (s.editorial_status = 'scheduled' and s.publication_at <= p_run_at))
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
      union all
      select 'video', v.session_id, v.visible_at, coalesce(s.description, 'Nouvelle vidéo')
      from public.session_videos v join public.sessions s on s.id = v.session_id
      where v.visible_at > p_run_at - interval '24 hours' and v.visible_at <= p_run_at
        and not coalesce(s.is_draft, false)
        and (s.session_type = 'commun' or s.editorial_status = 'published'
          or (s.editorial_status = 'scheduled' and s.publication_at <= p_run_at))
        and (s.session_type = 'commun' or s.ministry_id = student.ministry_id)
        and (s.session_type = 'commun' or student.preferred_day is null or s.day = student.preferred_day)
    ), fresh as (
      select a.* from available a where not exists(
        select 1 from public.course_content_notification_log l
        where l.recipient_id = student.id and l.content_type = a.kind and l.content_id = a.content_id)
    )
    select count(*), string_agg('• ' || label, E'\n' order by available_at, label)
      into v_count, v_body from fresh;
    if v_count = 0 then continue; end if;

    insert into public.announcements(title, body, author_id, recipient_id, is_system, target_url, target_type, cta_label)
    values(
      case when v_count = 1 then 'Un nouveau contenu est disponible' else v_count || ' nouveaux contenus sont disponibles' end,
      'Voici les nouveautés accessibles depuis les dernières 24 heures :' || E'\n\n' || v_body,
      v_author, student.id, true, '/etudiant/cours', 'daily_content_digest', 'Voir les nouveautés'
    ) returning id into v_announcement;

    insert into public.course_content_notification_log(recipient_id, content_type, content_id, available_at, announcement_id, notified_at)
    select student.id, a.kind, a.content_id, a.available_at, v_announcement, p_run_at
    from (
      select 'material'::text kind, m.id content_id, m.visible_at available_at
      from public.materials m join public.sessions s on s.id=m.session_id
      where m.visible_at > p_run_at-interval '24 hours' and m.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.editorial_status='published' or (s.editorial_status='scheduled' and s.publication_at<=p_run_at))
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
      union all
      select 'assignment', a.id, a.visible_at
      from public.assignments a join public.sessions s on s.id=a.session_id
      where a.visible_at > p_run_at-interval '24 hours' and a.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.editorial_status='published' or (s.editorial_status='scheduled' and s.publication_at<=p_run_at))
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
      union all
      select 'video', v.session_id, v.visible_at
      from public.session_videos v join public.sessions s on s.id=v.session_id
      where v.visible_at > p_run_at-interval '24 hours' and v.visible_at<=p_run_at and not coalesce(s.is_draft,false)
        and (s.session_type='commun' or s.editorial_status='published' or (s.editorial_status='scheduled' and s.publication_at<=p_run_at))
        and (s.session_type='commun' or s.ministry_id=student.ministry_id) and (s.session_type='commun' or student.preferred_day is null or s.day=student.preferred_day)
    ) a on conflict do nothing;
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end $$;

revoke all on function public.create_daily_course_content_digest(timestamptz) from public;
grant execute on function public.create_daily_course_content_digest(timestamptz) to service_role;

commit;
