-- Generated from Profil MAPP 202610070004_rls_and_engine.sql.
-- Do not edit this generated file; update the source migration or transformer.
create or replace function mapp_private.owns_participant(target_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from mapp.participant_auth_identities identity_link
    where identity_link.participant_id = target_participant_id
      and identity_link.auth_user_id = (select auth.uid())
      and identity_link.revoked_at is null
  );
$$;

grant usage on schema mapp_private to authenticated;
grant execute on function mapp_private.owns_participant(uuid) to authenticated;

alter table mapp.participants enable row level security;
alter table mapp.participant_profiles enable row level security;
alter table mapp.participant_auth_identities enable row level security;
alter table mapp.participant_consents enable row level security;
alter table mapp.consent_versions enable row level security;
alter table mapp.dimensions enable row level security;
alter table mapp.answer_scales enable row level security;
alter table mapp.answer_options enable row level security;
alter table mapp.questionnaires enable row level security;
alter table mapp.questionnaire_versions enable row level security;
alter table mapp.questionnaire_sections enable row level security;
alter table mapp.questions enable row level security;
alter table mapp.scoring_versions enable row level security;
alter table mapp.scoring_question_rules enable row level security;
alter table mapp.scoring_thresholds enable row level security;
alter table mapp.assessment_sessions enable row level security;
alter table mapp.session_field_definitions enable row level security;
alter table mapp.session_access_tokens enable row level security;
alter table mapp.attempts enable row level security;
alter table mapp.attempt_question_order enable row level security;
alter table mapp.attempt_answers enable row level security;
alter table mapp.attempt_events enable row level security;
alter table mapp.result_revisions enable row level security;
alter table mapp.result_dimension_scores enable row level security;
alter table mapp.result_classifications enable row level security;
alter table mapp.profiles enable row level security;
alter table mapp.profile_combinations enable row level security;
alter table mapp.restitution_versions enable row level security;
alter table mapp.restitution_blocks enable row level security;

create policy participants_read_own on mapp.participants for select to authenticated
using ((select mapp_private.owns_participant(id)));
create policy participant_profiles_read_own on mapp.participant_profiles for select to authenticated
using ((select mapp_private.owns_participant(participant_id)));
create policy participant_profiles_update_own on mapp.participant_profiles for update to authenticated
using ((select mapp_private.owns_participant(participant_id))) with check ((select mapp_private.owns_participant(participant_id)));
create policy identities_read_own on mapp.participant_auth_identities for select to authenticated
using (auth_user_id = (select auth.uid()));
create policy consents_read_own on mapp.participant_consents for select to authenticated
using ((select mapp_private.owns_participant(participant_id)));

create policy published_consent_read on mapp.consent_versions for select to authenticated
using (status = 'published');
create policy dimensions_read on mapp.dimensions for select to authenticated using (true);
create policy scales_read on mapp.answer_scales for select to authenticated using (true);
create policy options_read on mapp.answer_options for select to authenticated using (true);
create policy questionnaires_read on mapp.questionnaires for select to authenticated using (true);
create policy questionnaire_versions_read on mapp.questionnaire_versions for select to authenticated using (status = 'published');
create policy sections_read on mapp.questionnaire_sections for select to authenticated using (
  exists (select 1 from mapp.questionnaire_versions v where v.id = questionnaire_version_id and v.status = 'published')
);
create policy questions_read on mapp.questions for select to authenticated using (
  exists (select 1 from mapp.questionnaire_versions v where v.id = questionnaire_version_id and v.status = 'published')
);

create policy sessions_read_started on mapp.assessment_sessions for select to authenticated using (
  status = 'published' and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now())
);
create policy session_fields_read on mapp.session_field_definitions for select to authenticated using (
  exists (select 1 from mapp.assessment_sessions s where s.id = session_id and s.status = 'published')
);

create policy attempts_read_own on mapp.attempts for select to authenticated
using ((select mapp_private.owns_participant(participant_id)));
create policy attempt_order_read_own on mapp.attempt_question_order for select to authenticated using (
  exists (select 1 from mapp.attempts a where a.id = attempt_id and (select mapp_private.owns_participant(a.participant_id)))
);
create policy answers_read_own on mapp.attempt_answers for select to authenticated using (
  exists (select 1 from mapp.attempts a where a.id = attempt_id and (select mapp_private.owns_participant(a.participant_id)))
);
create policy results_read_own on mapp.result_revisions for select to authenticated using (
  exists (select 1 from mapp.attempts a where a.id = attempt_id and (select mapp_private.owns_participant(a.participant_id)))
);
create policy scores_read_own on mapp.result_dimension_scores for select to authenticated using (
  exists (
    select 1 from mapp.result_revisions r join mapp.attempts a on a.id = r.attempt_id
    where r.id = result_revision_id and (select mapp_private.owns_participant(a.participant_id))
  )
);
create policy classifications_read_own on mapp.result_classifications for select to authenticated using (
  exists (
    select 1 from mapp.result_revisions r join mapp.attempts a on a.id = r.attempt_id
    where r.id = result_revision_id and (select mapp_private.owns_participant(a.participant_id))
  )
);

create policy profiles_read on mapp.profiles for select to authenticated using (true);
create policy combinations_read on mapp.profile_combinations for select to authenticated using (true);
create policy published_restitution_versions_read on mapp.restitution_versions for select to authenticated using (status = 'published');
create policy published_restitution_blocks_read on mapp.restitution_blocks for select to authenticated using (
  exists (select 1 from mapp.restitution_versions v where v.id = restitution_version_id and v.status = 'published')
);

revoke all on all tables in schema mapp from anon;
revoke insert, update, delete on all tables in schema mapp from authenticated;
grant select on mapp.participants, mapp.participant_profiles, mapp.participant_auth_identities,
  mapp.participant_consents, mapp.consent_versions, mapp.dimensions, mapp.answer_scales,
  mapp.answer_options, mapp.questionnaires, mapp.questionnaire_versions, mapp.questionnaire_sections,
  mapp.questions, mapp.assessment_sessions, mapp.session_field_definitions, mapp.attempts,
  mapp.attempt_question_order, mapp.attempt_answers, mapp.result_revisions,
  mapp.result_dimension_scores, mapp.result_classifications, mapp.profiles,
  mapp.profile_combinations, mapp.restitution_versions, mapp.restitution_blocks to authenticated;
grant update (first_name, last_name, email, job_title, team_label, locale) on mapp.participant_profiles to authenticated;

create or replace function mapp.start_session_attempt(
  access_token text,
  supplied_profile jsonb default '{}'::jsonb,
  accepts_consent boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_session mapp.assessment_sessions;
  target_participant uuid;
  new_attempt uuid;
  consent_needed boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select s.* into target_session
  from mapp.session_access_tokens t
  join mapp.assessment_sessions s on s.id = t.session_id
  where t.token_hash = encode(extensions.digest(access_token, 'sha256'), 'hex')
    and t.revoked_at is null and (t.expires_at is null or t.expires_at > now())
    and s.status = 'published'
    and (s.starts_at is null or s.starts_at <= now())
    and (s.ends_at is null or s.ends_at >= now());
  if target_session.id is null then raise exception 'Session unavailable'; end if;

  select participant_id into target_participant
  from mapp.participant_auth_identities
  where auth_user_id = current_user_id and revoked_at is null;

  if target_participant is null then
    insert into mapp.participants default values returning id into target_participant;
    insert into mapp.participant_auth_identities(participant_id, auth_user_id, kind)
    values (target_participant, current_user_id, (case when coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then 'anonymous' else 'email' end)::mapp.identity_kind);
    insert into mapp.participant_profiles(participant_id, first_name, last_name, email, job_title, team_label)
    values (
      target_participant,
      nullif(trim(supplied_profile ->> 'first_name'), ''), nullif(trim(supplied_profile ->> 'last_name'), ''),
      nullif(lower(trim(supplied_profile ->> 'email')), ''), nullif(trim(supplied_profile ->> 'job_title'), ''),
      nullif(trim(supplied_profile ->> 'team_label'), '')
    );
  end if;

  consent_needed := target_session.consent_required;
  if consent_needed and not accepts_consent then raise exception 'Consent required'; end if;
  if consent_needed and target_session.consent_version_id is not null then
    insert into mapp.participant_consents(participant_id, consent_version_id, status, session_id)
    values (target_participant, target_session.consent_version_id, 'accepted', target_session.id)
    on conflict (participant_id, consent_version_id, session_id) do update set status = 'accepted', recorded_at = now();
  end if;

  select id into new_attempt from mapp.attempts
  where participant_id = target_participant and session_id = target_session.id and status = 'in_progress'
  order by started_at desc limit 1;
  if new_attempt is not null then return new_attempt; end if;

  insert into mapp.attempts(participant_id, session_id, questionnaire_version_id, scoring_version_id, order_seed)
  values (target_participant, target_session.id, target_session.questionnaire_version_id, target_session.scoring_version_id, gen_random_uuid()::text)
  returning id into new_attempt;

  insert into mapp.attempt_question_order(attempt_id, question_id, position)
  with candidates as (
    select q.id, q.editorial_position, section.position as section_position, qv.order_strategy,
      rule.dimension_id,
      row_number() over (
        partition by section.id, rule.dimension_id
        order by encode(extensions.digest(new_attempt::text || q.id::text, 'sha256'), 'hex')
      ) as dimension_round,
      encode(extensions.digest(new_attempt::text || coalesce(rule.dimension_id::text, q.id::text), 'sha256'), 'hex') as dimension_order,
      encode(extensions.digest(new_attempt::text || q.id::text, 'sha256'), 'hex') as question_order
    from mapp.questions q
    join mapp.questionnaire_versions qv on qv.id = q.questionnaire_version_id
    join mapp.questionnaire_sections section on section.id = q.section_id
    left join lateral (
      select scoring_rule.dimension_id from mapp.scoring_question_rules scoring_rule
      where scoring_rule.scoring_version_id = target_session.scoring_version_id and scoring_rule.question_id = q.id
      order by scoring_rule.id limit 1
    ) rule on true
    where q.questionnaire_version_id = target_session.questionnaire_version_id
  ), positioned as (
    select id, case when order_strategy = 'editorial' then editorial_position else
      row_number() over (order by section_position, dimension_round, dimension_order, question_order)::integer end as position
    from candidates
  )
  select new_attempt, id, position from positioned;

  insert into mapp.attempt_events(attempt_id, event_type) values (new_attempt, 'started');
  return new_attempt;
end;
$$;

create or replace function mapp.save_attempt_answer(
  target_attempt uuid,
  target_question uuid,
  target_value integer,
  target_sequence bigint
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare owned boolean;
begin
  if target_value < 1 or target_value > 5 then raise exception 'Answer outside scale'; end if;
  select mapp_private.owns_participant(a.participant_id) and a.status = 'in_progress'
    into owned from mapp.attempts a where a.id = target_attempt;
  if not coalesce(owned, false) then raise exception 'Attempt unavailable'; end if;
  if not exists (select 1 from mapp.attempt_question_order where attempt_id = target_attempt and question_id = target_question)
    then raise exception 'Question is not part of attempt'; end if;

  insert into mapp.attempt_answers(attempt_id, question_id, answer_value, client_sequence)
  values (target_attempt, target_question, target_value, target_sequence)
  on conflict (attempt_id, question_id) do update
    set answer_value = excluded.answer_value, client_sequence = excluded.client_sequence,
        answered_at = now(), updated_at = now()
    where mapp.attempt_answers.client_sequence <= excluded.client_sequence;
  update mapp.attempts set last_saved_at = now() where id = target_attempt;
  return true;
end;
$$;

create or replace function mapp.finalize_attempt(target_attempt uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt mapp.attempts;
  result_id uuid;
  expected_count integer;
  answered_count integer;
begin
  select * into current_attempt from mapp.attempts where id = target_attempt for update;
  if current_attempt.id is null or not mapp_private.owns_participant(current_attempt.participant_id) then raise exception 'Attempt unavailable'; end if;
  if current_attempt.status = 'completed' then
    select id into result_id from mapp.result_revisions where attempt_id = target_attempt order by revision desc limit 1;
    return result_id;
  end if;
  if current_attempt.status <> 'in_progress' then raise exception 'Attempt cannot be finalized'; end if;

  select count(*) into expected_count from mapp.attempt_question_order where attempt_id = target_attempt;
  select count(*) into answered_count from mapp.attempt_answers where attempt_id = target_attempt;
  if expected_count = 0 or answered_count <> expected_count then raise exception 'All questions must be answered'; end if;

  insert into mapp.result_revisions(attempt_id, revision, questionnaire_version_id, scoring_version_id, reason, computed_by)
  values (target_attempt, 1, current_attempt.questionnaire_version_id, current_attempt.scoring_version_id, 'initial', (select auth.uid()))
  returning id into result_id;

  insert into mapp.result_dimension_scores(result_revision_id, dimension_id, context, raw_score, max_score, percentage)
  select result_id, r.dimension_id, s.context,
    sum(coalesce((r.points_map ->> a.answer_value::text)::numeric,
      case when r.direction = 1 then a.answer_value - 1 else 5 - a.answer_value end) * r.weight),
    sum(4 * abs(r.weight)),
    case when sum(4 * abs(r.weight)) = 0 then 0 else
      100 * sum(coalesce((r.points_map ->> a.answer_value::text)::numeric,
        case when r.direction = 1 then a.answer_value - 1 else 5 - a.answer_value end) * r.weight)
      / sum(4 * abs(r.weight)) end
  from mapp.attempt_answers a
  join mapp.questions q on q.id = a.question_id
  join mapp.questionnaire_sections s on s.id = q.section_id
  join mapp.scoring_question_rules r on r.question_id = a.question_id and r.scoring_version_id = current_attempt.scoring_version_id
  where a.attempt_id = target_attempt and s.context = 'natural'
  group by r.dimension_id, s.context;

  update mapp.attempts set status = 'completed', completed_at = now(), updated_at = now() where id = target_attempt;
  insert into mapp.attempt_events(attempt_id, event_type) values (target_attempt, 'completed');
  return result_id;
end;
$$;

revoke all on function mapp.start_session_attempt(text, jsonb, boolean) from public, anon;
revoke all on function mapp.save_attempt_answer(uuid, uuid, integer, bigint) from public, anon;
revoke all on function mapp.finalize_attempt(uuid) from public, anon;
grant execute on function mapp.start_session_attempt(text, jsonb, boolean) to authenticated;
grant execute on function mapp.save_attempt_answer(uuid, uuid, integer, bigint) to authenticated;
grant execute on function mapp.finalize_attempt(uuid) to authenticated;
