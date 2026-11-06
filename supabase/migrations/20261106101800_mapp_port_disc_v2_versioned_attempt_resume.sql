-- Generated from Profil MAPP 202610110002_disc_v2_versioned_attempt_resume.sql.
-- Do not edit this generated file; update the source migration or transformer.
create unique index if not exists attempts_one_active_per_participant_session_version_idx
on mapp.attempts(participant_id, session_id, questionnaire_version_id, scoring_version_id)
where status = 'in_progress' and session_id is not null;

drop index if exists mapp.attempts_one_active_per_participant_session_idx;

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
  else
    update mapp.participant_profiles set
      first_name = coalesce(nullif(trim(supplied_profile ->> 'first_name'), ''), first_name),
      last_name = coalesce(nullif(trim(supplied_profile ->> 'last_name'), ''), last_name),
      email = coalesce(nullif(lower(trim(supplied_profile ->> 'email')), ''), email),
      job_title = coalesce(nullif(trim(supplied_profile ->> 'job_title'), ''), job_title),
      team_label = coalesce(nullif(trim(supplied_profile ->> 'team_label'), ''), team_label)
    where participant_id = target_participant;
  end if;

  consent_needed := target_session.consent_required;
  if consent_needed and not accepts_consent then raise exception 'Consent required'; end if;
  if consent_needed and target_session.consent_version_id is not null then
    insert into mapp.participant_consents(participant_id, consent_version_id, status, session_id)
    values (target_participant, target_session.consent_version_id, 'accepted', target_session.id)
    on conflict (participant_id, consent_version_id, session_id) do update set status = 'accepted', recorded_at = now();
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_participant::text || ':' || target_session.id::text || ':' ||
    target_session.questionnaire_version_id::text || ':' || target_session.scoring_version_id::text, 0
  ));

  select id into new_attempt
  from mapp.attempts
  where participant_id = target_participant
    and session_id = target_session.id
    and questionnaire_version_id = target_session.questionnaire_version_id
    and scoring_version_id = target_session.scoring_version_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;
  if new_attempt is not null then return new_attempt; end if;

  insert into mapp.attempts(participant_id, session_id, questionnaire_version_id, scoring_version_id, order_seed)
  values (target_participant, target_session.id, target_session.questionnaire_version_id, target_session.scoring_version_id, gen_random_uuid()::text)
  returning id into new_attempt;

  insert into mapp.attempt_question_order(attempt_id, question_id, position)
  with candidates as (
    select q.id, q.editorial_position, section.position as section_position, qv.order_strategy,
      rule.dimension_id,
      row_number() over (partition by section.id, rule.dimension_id order by encode(extensions.digest(new_attempt::text || q.id::text, 'sha256'), 'hex')) as dimension_round,
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

  insert into mapp.attempt_events(attempt_id, event_type, metadata)
  values (new_attempt, 'started', jsonb_build_object(
    'questionnaire_version_id', target_session.questionnaire_version_id,
    'scoring_version_id', target_session.scoring_version_id
  ));
  return new_attempt;
end;
$$;

revoke all on function mapp.start_session_attempt(text, jsonb, boolean) from public, anon;
grant execute on function mapp.start_session_attempt(text, jsonb, boolean) to authenticated;

comment on function mapp.start_session_attempt(text, jsonb, boolean) is
  'Resumes only an in-progress attempt on the session current questionnaire and scoring versions; historical attempts remain accessible by id.';

