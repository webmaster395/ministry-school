-- Restaure le travail d'octobre sans recréer un devoir de novembre.
-- Les validations archivées lors du nettoyage du 9 novembre sont remappées
-- vers le devoir existant afin de ne jamais redemander un travail terminé.
do $$
declare
  v_session constant uuid := 'd7e9aebb-8514-458c-94d5-49ea65b4a2b4';
  v_assignment uuid;
  v_assignment_count integer;
  v_payload jsonb;
begin
  if not exists (
    select 1 from public.sessions
    where id = v_session and session_date = '2026-10-03'
  ) then
    raise exception 'La séance d’octobre La Cuve est introuvable : restauration interrompue';
  end if;

  select count(*)
  into v_assignment_count
  from public.assignments
  where session_id = v_session
    and coalesce(title, '') in (
      'Identifier et nettoyer',
      'Identifier et nettoyer sa cuve',
      'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter'
    );

  if v_assignment_count > 1 then
    raise exception 'Plusieurs devoirs La Cuve existent pour octobre : fusion manuelle requise';
  end if;

  select id
  into v_assignment
  from public.assignments
  where session_id = v_session
    and coalesce(title, '') in (
      'Identifier et nettoyer',
      'Identifier et nettoyer sa cuve',
      'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter'
    )
  limit 1;

  if v_assignment is null then
    select backup.payload
    into v_payload
    from public.maintenance_cleanup_backups backup
    where backup.batch_key = 'clear-current-assignments-2026-11-09'
      and backup.entity_type = 'assignment'
      and backup.payload ->> 'session_id' = v_session::text
      and coalesce(backup.payload ->> 'title', '') in (
        'Identifier et nettoyer',
        'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter'
      )
    order by backup.archived_at desc
    limit 1;

    if v_payload is null then
      raise exception 'La sauvegarde du devoir d’octobre est introuvable : restauration interrompue';
    end if;

    v_assignment := (v_payload ->> 'id')::uuid;
    insert into public.assignments (
      id, session_id, instructions, created_by, created_at, title, description,
      content_type, resource_url, file_url, phase, sort_order, kind,
      duration_min, due_at, visible_at
    ) values (
      v_assignment,
      v_session,
      coalesce(v_payload ->> 'instructions', 'Identifier et nettoyer sa cuve.'),
      nullif(v_payload ->> 'created_by', '')::uuid,
      coalesce(nullif(v_payload ->> 'created_at', '')::timestamptz, now()),
      'Identifier et nettoyer sa cuve',
      nullif(v_payload ->> 'description', ''),
      coalesce(nullif(v_payload ->> 'content_type', ''), 'Travail personnel'),
      nullif(v_payload ->> 'resource_url', ''),
      nullif(v_payload ->> 'file_url', ''),
      'after',
      coalesce(nullif(v_payload ->> 'sort_order', '')::integer, 1),
      nullif(v_payload ->> 'kind', ''),
      coalesce(nullif(v_payload ->> 'duration_min', '')::integer, 60),
      null,
      coalesce(nullif(v_payload ->> 'visible_at', '')::timestamptz, now())
    );
  end if;

  -- L'ancien 10 octobre était une date codée en dur, pas une échéance saisie
  -- par un administrateur. Sans date réelle, le devoir reste à faire mais ne
  -- porte pas l'étiquette « En retard ».
  update public.assignments
  set title = 'Identifier et nettoyer sa cuve',
      phase = 'after',
      due_at = null
  where id = v_assignment;

  insert into public.assignment_completions (assignment_id, user_id, completed_at)
  select
    v_assignment,
    (completion.payload ->> 'user_id')::uuid,
    coalesce(nullif(completion.payload ->> 'completed_at', '')::timestamptz, now())
  from public.maintenance_cleanup_backups completion
  where completion.batch_key = 'clear-current-assignments-2026-11-09'
    and completion.entity_type = 'assignment_completion'
    and completion.payload ->> 'assignment_id' in (
      select assignment.entity_key
      from public.maintenance_cleanup_backups assignment
      where assignment.batch_key = 'clear-current-assignments-2026-11-09'
        and assignment.entity_type = 'assignment'
        and assignment.payload ->> 'session_id' = v_session::text
        and coalesce(assignment.payload ->> 'title', '') in (
          'Identifier et nettoyer',
          'Travail personnel : nettoyer, remplir, s’entourer et réinterpréter'
        )
    )
  on conflict (assignment_id, user_id) do nothing;

  -- Aucun devoir n'est créé pour les séances de novembre. Si un devoir existe
  -- déjà, la migration s'arrête au lieu de supprimer une donnée potentiellement
  -- ajoutée par un administrateur.
  if exists (
    select 1
    from public.assignments assignment
    join public.sessions session on session.id = assignment.session_id
    where session.session_date >= '2026-11-01'
      and session.session_date < '2026-12-01'
  ) then
    raise exception 'Un devoir de novembre existe déjà : vérification administrative requise';
  end if;
end
$$;
