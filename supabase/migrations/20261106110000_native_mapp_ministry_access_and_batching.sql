begin;

-- Configuration explicite du questionnaire Ministry. Aucun token d'accès ni
-- e-mail n'est utilisé pour relier une identité : auth.uid() fait autorité.
create table if not exists mapp.native_settings (
  singleton boolean primary key default true check (singleton),
  assessment_session_id uuid references mapp.assessment_sessions(id) on delete restrict,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into mapp.native_settings(singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

alter table mapp.native_settings enable row level security;
revoke all on mapp.native_settings from public, anon, authenticated;

alter table mapp.attempts
  add column if not exists server_revision integer not null default 0 check (server_revision >= 0),
  add column if not exists last_client_sequence bigint not null default 0 check (last_client_sequence >= 0);

create table if not exists mapp.answer_mutations (
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  mutation_id uuid not null,
  expected_revision integer not null,
  server_revision integer not null,
  client_sequence bigint not null,
  answer_count integer not null check (answer_count between 1 and 5),
  acknowledgement jsonb not null,
  created_at timestamptz not null default now(),
  primary key (attempt_id, mutation_id)
);

alter table mapp.answer_mutations enable row level security;
revoke all on mapp.answer_mutations from public, anon, authenticated;
create index if not exists mapp_answer_mutations_created_at on mapp.answer_mutations(created_at);

create or replace function mapp.current_student_is_eligible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.role = 'student'
      and profile.email_confirmed
      and not coalesce(profile.deactivated, false)
  );
$$;

revoke all on function mapp.current_student_is_eligible() from public, anon;
grant execute on function mapp.current_student_is_eligible() to authenticated;

create or replace function mapp.open_native_questionnaire()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  ministry_profile public.profiles;
  verified_email text := nullif(lower(trim((select auth.jwt() ->> 'email'))), '');
  target_session mapp.assessment_sessions;
  target_participant uuid;
  target_attempt mapp.attempts;
begin
  if current_user_id is null or not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;

  select profile.* into ministry_profile
  from public.profiles profile
  where profile.id = current_user_id;

  select session.* into target_session
  from mapp.native_settings settings
  join mapp.assessment_sessions session on session.id = settings.assessment_session_id
  where settings.singleton
    and settings.enabled
    and session.status = 'published'
    and (session.starts_at is null or session.starts_at <= now())
    and (session.ends_at is null or session.ends_at >= now());

  if target_session.id is null then
    raise exception 'MAPP_QUESTIONNAIRE_UNAVAILABLE' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mapp-native-open:' || current_user_id::text || ':' || target_session.id::text, 0)
  );

  select identity_link.participant_id into target_participant
  from mapp.participant_auth_identities identity_link
  where identity_link.auth_user_id = current_user_id
    and identity_link.revoked_at is null
  limit 1;

  if target_participant is null then
    insert into mapp.participants default values returning id into target_participant;
    insert into mapp.participant_auth_identities(participant_id, auth_user_id, kind)
    values (target_participant, current_user_id, 'email'::mapp.identity_kind);
    insert into mapp.participant_profiles(participant_id, first_name, email)
    values (target_participant, nullif(trim(ministry_profile.full_name), ''), verified_email);
  end if;

  select attempt.* into target_attempt
  from mapp.attempts attempt
  where attempt.participant_id = target_participant
    and attempt.session_id = target_session.id
    and attempt.questionnaire_version_id = target_session.questionnaire_version_id
    and attempt.scoring_version_id = target_session.scoring_version_id
    and attempt.status in ('in_progress', 'completed')
  order by (attempt.status = 'in_progress') desc, attempt.started_at desc
  limit 1;

  if target_attempt.id is null then
    insert into mapp.attempts(
      participant_id, session_id, questionnaire_version_id, scoring_version_id,
      source, order_seed
    ) values (
      target_participant, target_session.id, target_session.questionnaire_version_id,
      target_session.scoring_version_id, 'ministry-native', gen_random_uuid()::text
    ) returning * into target_attempt;

    insert into mapp.attempt_question_order(attempt_id, question_id, position)
    with candidates as (
      select question.id, question.editorial_position,
        section.position as section_position, version.order_strategy,
        rule.dimension_id,
        row_number() over (
          partition by section.id, rule.dimension_id
          order by encode(extensions.digest(target_attempt.id::text || question.id::text, 'sha256'), 'hex')
        ) as dimension_round,
        encode(extensions.digest(target_attempt.id::text || coalesce(rule.dimension_id::text, question.id::text), 'sha256'), 'hex') as dimension_order,
        encode(extensions.digest(target_attempt.id::text || question.id::text, 'sha256'), 'hex') as question_order
      from mapp.questions question
      join mapp.questionnaire_versions version on version.id = question.questionnaire_version_id
      join mapp.questionnaire_sections section on section.id = question.section_id
      left join lateral (
        select scoring_rule.dimension_id
        from mapp.scoring_question_rules scoring_rule
        where scoring_rule.scoring_version_id = target_session.scoring_version_id
          and scoring_rule.question_id = question.id
        order by scoring_rule.id
        limit 1
      ) rule on true
      where question.questionnaire_version_id = target_session.questionnaire_version_id
    ), positioned as (
      select id,
        case when order_strategy = 'editorial' then editorial_position
        else row_number() over (
          order by section_position, dimension_round, dimension_order, question_order
        )::integer end as position
      from candidates
    )
    select target_attempt.id, id, position from positioned;

    insert into mapp.attempt_events(attempt_id, event_type, metadata)
    values (target_attempt.id, 'started', jsonb_build_object('source', 'ministry-native'));
  end if;

  return jsonb_build_object(
    'attemptId', target_attempt.id,
    'participantName', coalesce((
      select nullif(trim(concat_ws(' ', profile.first_name, profile.last_name)), '')
      from mapp.participant_profiles profile
      where profile.participant_id = target_attempt.participant_id
    ), 'Ton résultat'),
    'status', target_attempt.status,
    'serverRevision', target_attempt.server_revision,
    'questionnaireVersionId', target_attempt.questionnaire_version_id,
    'scoringVersionId', target_attempt.scoring_version_id,
    'expectedAnswerCount', (
      select count(*) from mapp.attempt_question_order where attempt_id = target_attempt.id
    ),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', question.id,
        'code', question.external_key,
        'position', ordered.position,
        'prompt', question.prompt,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('value', option.value, 'label', option.label) order by option.position)
          from mapp.answer_options option
          where option.scale_id = question.answer_scale_id
        ), '[]'::jsonb)
      ) order by ordered.position)
      from mapp.attempt_question_order ordered
      join mapp.questions question on question.id = ordered.question_id
      where ordered.attempt_id = target_attempt.id
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'questionId', answer.question_id,
        'value', answer.answer_value,
        'clientSequence', answer.client_sequence
      ) order by ordered.position)
      from mapp.attempt_answers answer
      join mapp.attempt_question_order ordered
        on ordered.attempt_id = answer.attempt_id and ordered.question_id = answer.question_id
      where answer.attempt_id = target_attempt.id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function mapp.save_answer_batch(
  p_attempt_id uuid,
  p_mutation_id uuid,
  p_expected_revision integer,
  p_client_sequence bigint,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_attempt mapp.attempts;
  existing_ack jsonb;
  answer_count integer;
  next_revision integer;
  acknowledgement jsonb;
begin
  if not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;

  if p_mutation_id is null or p_expected_revision < 0 or p_client_sequence < 0
    or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'MAPP_INVALID_MUTATION' using errcode = '22023';
  end if;

  answer_count := jsonb_array_length(p_answers);
  if answer_count < 1 or answer_count > 5 then
    raise exception 'MAPP_ANSWER_BATCH_SIZE' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mapp-native-save:' || p_attempt_id::text, 0)
  );

  select mutation.acknowledgement into existing_ack
  from mapp.answer_mutations mutation
  where mutation.attempt_id = p_attempt_id and mutation.mutation_id = p_mutation_id;
  if existing_ack is not null then return existing_ack; end if;

  select attempt.* into target_attempt
  from mapp.attempts attempt
  where attempt.id = p_attempt_id
  for update;

  if target_attempt.id is null
    or target_attempt.status <> 'in_progress'
    or not mapp_private.owns_participant(target_attempt.participant_id) then
    raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode = '42501';
  end if;

  if target_attempt.server_revision <> p_expected_revision then
    raise exception 'MAPP_REVISION_CONFLICT:%', target_attempt.server_revision using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_answers) as item("questionId" uuid, value integer)
    where item."questionId" is null or item.value not between 1 and 5
  ) or (
    select count(distinct item."questionId")
    from jsonb_to_recordset(p_answers) as item("questionId" uuid, value integer)
  ) <> answer_count then
    raise exception 'MAPP_INVALID_ANSWER_BATCH' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_answers) as item("questionId" uuid, value integer)
    left join mapp.attempt_question_order ordered
      on ordered.attempt_id = p_attempt_id and ordered.question_id = item."questionId"
    where ordered.question_id is null
  ) then
    raise exception 'MAPP_UNKNOWN_QUESTION' using errcode = '22023';
  end if;

  insert into mapp.attempt_answers(
    attempt_id, question_id, answer_value, client_sequence, answered_at, updated_at
  )
  select p_attempt_id, item."questionId", item.value, p_client_sequence, now(), now()
  from jsonb_to_recordset(p_answers) as item("questionId" uuid, value integer)
  on conflict (attempt_id, question_id) do update
  set answer_value = excluded.answer_value,
      client_sequence = excluded.client_sequence,
      answered_at = now(),
      updated_at = now()
  where mapp.attempt_answers.client_sequence <= excluded.client_sequence;

  next_revision := target_attempt.server_revision + 1;
  update mapp.attempts
  set server_revision = next_revision,
      last_client_sequence = greatest(last_client_sequence, p_client_sequence),
      last_saved_at = now(),
      updated_at = now()
  where id = p_attempt_id;

  acknowledgement := jsonb_build_object(
    'appliedMutationId', p_mutation_id,
    'serverRevision', next_revision,
    'savedAt', now(),
    'answerCount', answer_count,
    'completed', false
  );

  insert into mapp.answer_mutations(
    attempt_id, mutation_id, expected_revision, server_revision,
    client_sequence, answer_count, acknowledgement
  ) values (
    p_attempt_id, p_mutation_id, p_expected_revision, next_revision,
    p_client_sequence, answer_count, acknowledgement
  );

  return acknowledgement;
end;
$$;

create or replace function mapp.get_native_results_bundle(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_attempt mapp.attempts;
  target_revision mapp.result_revisions;
begin
  if not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;

  select attempt.* into target_attempt
  from mapp.attempts attempt
  where attempt.id = p_attempt_id
    and attempt.status = 'completed'
    and mapp_private.owns_participant(attempt.participant_id);
  if target_attempt.id is null then
    raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode = 'P0002';
  end if;

  select revision.* into target_revision
  from mapp.result_revisions revision
  where revision.attempt_id = target_attempt.id
  order by revision.revision desc
  limit 1;
  if target_revision.id is null then
    raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'attemptId', target_attempt.id,
    'completedAt', target_attempt.completed_at,
    'resultRevisionId', target_revision.id,
    'revision', target_revision.revision,
    'scoringVersionId', target_revision.scoring_version_id,
    'scores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'context', score.context,
        'dimensionCode', dimension.code,
        'dimensionName', dimension.name,
        'rawScore', score.raw_score,
        'maxScore', score.max_score,
        'percentage', score.percentage
      ) order by dimension.position)
      from mapp.result_dimension_scores score
      join mapp.dimensions dimension on dimension.id = score.dimension_id
      where score.result_revision_id = target_revision.id
    ), '[]'::jsonb),
    'metrics', coalesce((
      select jsonb_agg(to_jsonb(metric))
      from mapp.result_dimension_metrics metric
      where metric.result_revision_id = target_revision.id
    ), '[]'::jsonb),
    'rankings', coalesce((
      select jsonb_agg(to_jsonb(ranking))
      from mapp.result_rankings ranking
      where ranking.result_revision_id = target_revision.id
    ), '[]'::jsonb),
    'tieBreak', (
      select to_jsonb(tie_break)
      from mapp.result_tie_breaks tie_break
      where tie_break.result_revision_id = target_revision.id
      limit 1
    )
  );
end;
$$;

create or replace function mapp.finalize_native_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result_revision_id uuid;
begin
  if not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;
  result_revision_id := mapp.finalize_attempt(p_attempt_id);
  return jsonb_build_object(
    'resultRevisionId', result_revision_id,
    'bundle', mapp.get_native_results_bundle(p_attempt_id)
  );
end;
$$;

create or replace function mapp.submit_native_tie_break(
  p_attempt_id uuid,
  p_result_revision_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_codes text[];
  tie_scope text;
  persistent_codes text[];
  selected_code text;
  maximum_votes integer;
begin
  if not mapp.current_student_is_eligible() then
    raise exception 'MAPP_ACCESS_DENIED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id = revision.attempt_id
    where revision.id = p_result_revision_id
      and attempt.id = p_attempt_id
      and attempt.status = 'completed'
      and mapp_private.owns_participant(attempt.participant_id)
  ) then
    raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode = 'P0002';
  end if;

  select array_agg(dimension.code order by dimension.position)
  into candidate_codes
  from mapp.result_dimension_scores score
  join mapp.dimensions dimension on dimension.id = score.dimension_id
  where score.result_revision_id = p_result_revision_id
    and score.context = 'natural'
    and score.percentage = (
      select max(candidate.percentage)
      from mapp.result_dimension_scores candidate
      where candidate.result_revision_id = p_result_revision_id and candidate.context = 'natural'
    );
  tie_scope := 'primary';

  if cardinality(candidate_codes) = 1 then
    select array_agg(dimension.code order by dimension.position)
    into candidate_codes
    from mapp.result_dimension_scores score
    join mapp.dimensions dimension on dimension.id = score.dimension_id
    where score.result_revision_id = p_result_revision_id
      and score.context = 'natural'
      and dimension.code <> candidate_codes[1]
      and score.percentage = (
        select max(candidate.percentage)
        from mapp.result_dimension_scores candidate
        join mapp.dimensions candidate_dimension on candidate_dimension.id = candidate.dimension_id
        where candidate.result_revision_id = p_result_revision_id
          and candidate.context = 'natural'
          and candidate_dimension.code <> candidate_codes[1]
      );
    tie_scope := 'secondary';
  end if;

  if coalesce(cardinality(candidate_codes), 0) < 2 then
    return mapp.get_native_results_bundle(p_attempt_id);
  end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> 3 then
    raise exception 'MAPP_TIE_BREAK_INVALID' using errcode = '22023';
  end if;
  if (
    select count(distinct answer ->> 'questionId') <> 3
      or bool_or((answer ->> 'questionId') not in ('tie-01', 'tie-02', 'tie-03'))
      or bool_or(not ((answer ->> 'selectedCode') = any(candidate_codes)))
    from jsonb_array_elements(p_answers) answer
  ) then
    raise exception 'MAPP_TIE_BREAK_INVALID' using errcode = '22023';
  end if;

  with votes as (
    select candidate, count(answer.*)::integer as vote_count
    from unnest(candidate_codes) candidate
    left join jsonb_array_elements(p_answers) answer
      on answer ->> 'selectedCode' = candidate
    group by candidate
  ) select max(vote_count) into maximum_votes from votes;

  with votes as (
    select candidate, count(answer.*)::integer as vote_count
    from unnest(candidate_codes) candidate
    left join jsonb_array_elements(p_answers) answer
      on answer ->> 'selectedCode' = candidate
    group by candidate
  ) select array_agg(candidate order by array_position(candidate_codes, candidate))
    into persistent_codes from votes where vote_count = maximum_votes;

  selected_code := case when cardinality(persistent_codes) = 1 then persistent_codes[1] else null end;
  insert into mapp.result_tie_breaks(
    result_revision_id, version, scope, candidate_codes, answers, selected_code, persistent_codes
  ) values (
    p_result_revision_id, 'mapp-v10-tie-break-v1', tie_scope, candidate_codes,
    p_answers, selected_code, persistent_codes
  ) on conflict (result_revision_id) do nothing;

  return mapp.get_native_results_bundle(p_attempt_id);
end;
$$;

-- Les anciens chemins provoquaient une écriture par réponse et permettaient
-- un parcours autonome. Ils restent disponibles au service_role pour migration,
-- mais ne sont plus accessibles au navigateur étudiant.
revoke all on function mapp.start_session_attempt(text, jsonb, boolean) from authenticated;
revoke all on function mapp.save_attempt_answer(uuid, uuid, integer, bigint) from authenticated;
revoke all on function mapp.finalize_attempt(uuid) from authenticated;
grant execute on function mapp.start_session_attempt(text, jsonb, boolean) to service_role;
grant execute on function mapp.save_attempt_answer(uuid, uuid, integer, bigint) to service_role;
grant execute on function mapp.finalize_attempt(uuid) to service_role;

-- PostgREST expose deja le schema public du projet Ministry. Ces quatre
-- wrappers evitent d'exposer tout le schema mapp dans la configuration API :
-- le navigateur ne peut appeler que les operations explicites ci-dessous.
create or replace function public.mapp_open_questionnaire()
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$ select mapp.open_native_questionnaire() $$;

create or replace function public.mapp_save_answer_batch(
  p_attempt_id uuid,
  p_mutation_id uuid,
  p_expected_revision integer,
  p_client_sequence bigint,
  p_answers jsonb
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$
  select mapp.save_answer_batch(
    p_attempt_id, p_mutation_id, p_expected_revision, p_client_sequence, p_answers
  )
$$;

create or replace function public.mapp_get_results(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select mapp.get_native_results_bundle(p_attempt_id) $$;

create or replace function public.mapp_finalize_attempt(p_attempt_id uuid)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$ select mapp.finalize_native_attempt(p_attempt_id) $$;

create or replace function public.mapp_submit_tie_break(
  p_attempt_id uuid,
  p_result_revision_id uuid,
  p_answers jsonb
)
returns jsonb
language sql
volatile
security definer
set search_path = ''
as $$ select mapp.submit_native_tie_break(p_attempt_id, p_result_revision_id, p_answers) $$;

revoke all on function mapp.open_native_questionnaire() from public, anon, authenticated;
revoke all on function mapp.save_answer_batch(uuid, uuid, integer, bigint, jsonb) from public, anon, authenticated;
revoke all on function mapp.get_native_results_bundle(uuid) from public, anon, authenticated;
revoke all on function mapp.finalize_native_attempt(uuid) from public, anon, authenticated;
revoke all on function mapp.submit_native_tie_break(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.mapp_open_questionnaire() from public, anon;
revoke all on function public.mapp_save_answer_batch(uuid, uuid, integer, bigint, jsonb) from public, anon;
revoke all on function public.mapp_get_results(uuid) from public, anon;
revoke all on function public.mapp_finalize_attempt(uuid) from public, anon;
revoke all on function public.mapp_submit_tie_break(uuid, uuid, jsonb) from public, anon;
grant execute on function public.mapp_open_questionnaire() to authenticated;
grant execute on function public.mapp_save_answer_batch(uuid, uuid, integer, bigint, jsonb) to authenticated;
grant execute on function public.mapp_get_results(uuid) to authenticated;
grant execute on function public.mapp_finalize_attempt(uuid) to authenticated;
grant execute on function public.mapp_submit_tie_break(uuid, uuid, jsonb) to authenticated;

comment on function mapp.open_native_questionnaire() is
  'Ouvre ou reprend MAPP depuis la session Ministry et renvoie questions et réponses en un appel.';
comment on function mapp.save_answer_batch(uuid, uuid, integer, bigint, jsonb) is
  'Sauvegarde atomiquement 1 à 5 réponses avec mutation idempotente et révision CAS.';
comment on function mapp.finalize_native_attempt(uuid) is
  'Finalise avec le calculateur MAPP officiel puis renvoie la restitution consolidée.';
comment on function mapp.submit_native_tie_break(uuid, uuid, jsonb) is
  'Applique les trois questions officielles V10 uniquement aux profils ex aequo, sans modifier les scores naturels.';

commit;
