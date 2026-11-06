begin;

-- Nouveau point d'entrée public : il complète le profil invité sans modifier
-- les anciennes tentatives et conserve toutes les écritures derrière service_role.
create or replace function mapp.start_guest_hybrid_44_profile(
  p_first_name text, p_last_name text, p_email text,
  p_token_hash text, p_recovery_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized_first_name text := trim(p_first_name);
  normalized_last_name text := trim(p_last_name);
  normalized_email text := lower(trim(p_email));
  target_session mapp.assessment_sessions;
  target_participant uuid;
  target_attempt mapp.attempts;
begin
  if length(normalized_first_name) not between 2 and 80
     or length(normalized_last_name) not between 2 and 80
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(normalized_email) > 254
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_recovery_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'MAPP_GUEST_INVALID' using errcode='22023';
  end if;

  select session.* into target_session
  from mapp.native_settings settings
  join mapp.assessment_sessions session on session.id=settings.assessment_session_id
  join mapp.scoring_versions scoring on scoring.id=session.scoring_version_id
  where settings.singleton and settings.enabled and session.status='published'
    and scoring.code='profil-mapp-hybrid-44-v1.0.0'
    and (session.starts_at is null or session.starts_at<=now())
    and (session.ends_at is null or session.ends_at>=now());
  if target_session.id is null then raise exception 'MAPP_QUESTIONNAIRE_UNAVAILABLE' using errcode='P0002'; end if;

  insert into mapp.participants default values returning id into target_participant;
  insert into mapp.participant_profiles(participant_id,first_name,last_name,email)
  values(target_participant,normalized_first_name,normalized_last_name,normalized_email);
  insert into mapp.attempts(participant_id,session_id,questionnaire_version_id,scoring_version_id,source,order_seed)
  values(target_participant,target_session.id,target_session.questionnaire_version_id,target_session.scoring_version_id,'ministry-guest',gen_random_uuid()::text)
  returning * into target_attempt;
  insert into mapp.attempt_question_order(attempt_id,question_id,position)
  select target_attempt.id,question.id,row_number() over(order by question.editorial_position,question.id)::integer
  from mapp.questions question where question.questionnaire_version_id=target_session.questionnaire_version_id;
  insert into mapp.guest_attempt_access(attempt_id,participant_id,email,token_hash,recovery_hash)
  values(target_attempt.id,target_participant,normalized_email,p_token_hash,p_recovery_hash);
  insert into mapp.attempt_events(attempt_id,event_type,metadata)
  values(target_attempt.id,'started',jsonb_build_object('source','ministry-guest'));
  return mapp.guest_questionnaire_bundle(target_attempt.id);
end $$;

revoke all on function mapp.start_guest_hybrid_44_profile(text,text,text,text,text) from public,anon,authenticated;
grant execute on function mapp.start_guest_hybrid_44_profile(text,text,text,text,text) to service_role;

commit;
