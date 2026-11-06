begin;

-- Acces public programme de Profil MAPP. Les secrets ne sont jamais stockes
-- en clair et cette table n'est jamais exposee aux roles navigateur.
create table if not exists mapp.guest_attempt_access (
  attempt_id uuid primary key references mapp.attempts(id) on delete cascade,
  participant_id uuid not null references mapp.participants(id) on delete restrict,
  email text not null,
  token_hash text not null unique check (length(token_hash) = 64),
  recovery_hash text not null unique check (length(recovery_hash) = 64),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  check (email = lower(trim(email)))
);

alter table mapp.guest_attempt_access enable row level security;
revoke all on mapp.guest_attempt_access from public, anon, authenticated;
create index if not exists guest_attempt_access_participant_idx on mapp.guest_attempt_access(participant_id);

create or replace function mapp.guest_access_allowed(p_attempt_id uuid, p_token_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from mapp.guest_attempt_access access
    where access.attempt_id = p_attempt_id
      and access.token_hash = p_token_hash
      and access.expires_at > now()
      and access.claimed_at is null
  )
$$;

create or replace function mapp.guest_questionnaire_bundle(p_attempt_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'attemptId', attempt.id,
    'participantName', 'Ton résultat',
    'status', attempt.status,
    'serverRevision', attempt.server_revision,
    'questionnaireVersionId', attempt.questionnaire_version_id,
    'scoringVersionId', attempt.scoring_version_id,
    'expectedAnswerCount', (select count(*) from mapp.attempt_question_order where attempt_id=attempt.id),
    'engine', 'hybrid-44',
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',q.id,'code',q.external_key,'position',ordered.position,'prompt',q.prompt,'metadata',q.metadata,
        'options',coalesce((select jsonb_agg(jsonb_build_object('value',ao.value,'label',ao.label) order by ao.position) from mapp.answer_options ao where ao.scale_id=q.answer_scale_id),'[]'::jsonb),
        'questionOptions',coalesce((select jsonb_agg(jsonb_build_object('id',qo.id,'key',qo.option_key,'label',qo.label,'position',qo.position) order by qo.position) from mapp.question_options qo where qo.question_id=q.id),'[]'::jsonb)
      ) order by ordered.position)
      from mapp.attempt_question_order ordered join mapp.questions q on q.id=ordered.question_id
      where ordered.attempt_id=attempt.id
    ),'[]'::jsonb),
    'answers',coalesce((
      select jsonb_agg(jsonb_build_object('questionId',answer.question_id,'value',answer.answer_value,'clientSequence',answer.client_sequence))
      from mapp.attempt_answers answer where answer.attempt_id=attempt.id
    ),'[]'::jsonb),
    'duelAnswers',coalesce((
      select jsonb_agg(jsonb_build_object('questionId',answer.question_id,'optionId',answer.selected_option_id,'clientSequence',answer.client_sequence))
      from mapp.attempt_duel_answers answer where answer.attempt_id=attempt.id
    ),'[]'::jsonb)
  ) from mapp.attempts attempt where attempt.id=p_attempt_id
$$;

create or replace function mapp.start_guest_hybrid_44(
  p_email text, p_token_hash text, p_recovery_hash text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  normalized_email text := lower(trim(p_email));
  target_session mapp.assessment_sessions;
  target_participant uuid;
  target_attempt mapp.attempts;
begin
  if now() < timestamptz '2026-11-07 06:00:00+00' then
    raise exception 'MAPP_GUEST_NOT_OPEN' using errcode='42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
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
  insert into mapp.participant_profiles(participant_id,email) values(target_participant,normalized_email);
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

create or replace function mapp.open_guest_hybrid_44(p_attempt_id uuid,p_token_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not mapp.guest_access_allowed(p_attempt_id,p_token_hash) then
    raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode='42501';
  end if;
  update mapp.guest_attempt_access set last_accessed_at=now() where attempt_id=p_attempt_id;
  return mapp.guest_questionnaire_bundle(p_attempt_id);
end $$;

create or replace function mapp.save_guest_answer_batch(
  p_attempt_id uuid,p_token_hash text,p_mutation_id uuid,p_expected_revision integer,p_client_sequence bigint,p_answers jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_attempt mapp.attempts; existing_ack jsonb; answer_count integer; next_revision integer; acknowledgement jsonb;
begin
  if not mapp.guest_access_allowed(p_attempt_id,p_token_hash) then raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode='42501'; end if;
  if p_mutation_id is null or p_expected_revision<0 or p_client_sequence<0 or jsonb_typeof(p_answers)<>'array' then raise exception 'MAPP_INVALID_MUTATION' using errcode='22023'; end if;
  answer_count:=jsonb_array_length(p_answers);
  if answer_count<1 or answer_count>5 then raise exception 'MAPP_ANSWER_BATCH_SIZE' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mapp-guest-save:'||p_attempt_id::text,0));
  select mutation.acknowledgement into existing_ack from mapp.answer_mutations mutation where mutation.attempt_id=p_attempt_id and mutation.mutation_id=p_mutation_id;
  if existing_ack is not null then return existing_ack; end if;
  select * into target_attempt from mapp.attempts where id=p_attempt_id for update;
  if target_attempt.id is null or target_attempt.status<>'in_progress' then raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode='42501'; end if;
  if target_attempt.server_revision<>p_expected_revision then raise exception 'MAPP_REVISION_CONFLICT:%',target_attempt.server_revision using errcode='40001'; end if;
  if exists(select 1 from jsonb_to_recordset(p_answers) item("questionId" uuid,value integer) where item."questionId" is null or item.value not between 1 and 5)
     or (select count(distinct item."questionId") from jsonb_to_recordset(p_answers) item("questionId" uuid,value integer))<>answer_count
     or exists(select 1 from jsonb_to_recordset(p_answers) item("questionId" uuid,value integer) left join mapp.attempt_question_order ordered on ordered.attempt_id=p_attempt_id and ordered.question_id=item."questionId" where ordered.question_id is null)
  then raise exception 'MAPP_INVALID_ANSWER_BATCH' using errcode='22023'; end if;
  insert into mapp.attempt_answers(attempt_id,question_id,answer_value,client_sequence,answered_at,updated_at)
  select p_attempt_id,item."questionId",item.value,p_client_sequence,now(),now() from jsonb_to_recordset(p_answers) item("questionId" uuid,value integer)
  on conflict(attempt_id,question_id) do update set answer_value=excluded.answer_value,client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now()
  where mapp.attempt_answers.client_sequence<=excluded.client_sequence;
  next_revision:=target_attempt.server_revision+1;
  update mapp.attempts set server_revision=next_revision,last_client_sequence=greatest(last_client_sequence,p_client_sequence),last_saved_at=now(),updated_at=now() where id=p_attempt_id;
  acknowledgement:=jsonb_build_object('appliedMutationId',p_mutation_id,'serverRevision',next_revision,'savedAt',now(),'answerCount',answer_count,'completed',false);
  insert into mapp.answer_mutations(attempt_id,mutation_id,expected_revision,server_revision,client_sequence,answer_count,acknowledgement)
  values(p_attempt_id,p_mutation_id,p_expected_revision,next_revision,p_client_sequence,answer_count,acknowledgement);
  return acknowledgement;
end $$;

create or replace function mapp.save_guest_duel_answer(p_attempt_id uuid,p_token_hash text,p_question_id uuid,p_option_id uuid,p_client_sequence bigint)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not mapp.guest_access_allowed(p_attempt_id,p_token_hash) then raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode='42501'; end if;
  if not exists(select 1 from mapp.attempts where id=p_attempt_id and status='in_progress')
    or not exists(select 1 from mapp.attempt_question_order where attempt_id=p_attempt_id and question_id=p_question_id)
    or not exists(select 1 from mapp.question_options where id=p_option_id and question_id=p_question_id)
  then raise exception 'MAPP_INVALID_DUEL' using errcode='22023'; end if;
  insert into mapp.attempt_duel_answers(attempt_id,question_id,selected_option_id,client_sequence)
  values(p_attempt_id,p_question_id,p_option_id,p_client_sequence)
  on conflict(attempt_id,question_id) do update set selected_option_id=excluded.selected_option_id,client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now()
  where mapp.attempt_duel_answers.client_sequence<=excluded.client_sequence;
  update mapp.attempts set last_saved_at=now(),last_client_sequence=greatest(last_client_sequence,p_client_sequence) where id=p_attempt_id;
end $$;

-- Une seule transaction par etape (quatre questions), quel que soit le type
-- de reponse. L'autorisation est verifiee par la route serveur avant cet appel
-- service_role; la revision CAS et mutation_id rendent les retries idempotents.
create or replace function mapp.save_hybrid_step(
  p_attempt_id uuid,p_mutation_id uuid,p_expected_revision integer,p_client_sequence bigint,
  p_scale_answers jsonb,p_duel_answers jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare target_attempt mapp.attempts; existing_ack jsonb; answer_count integer; next_revision integer; acknowledgement jsonb;
begin
  if p_mutation_id is null or p_expected_revision<0 or p_client_sequence<0
     or jsonb_typeof(p_scale_answers)<>'array' or jsonb_typeof(p_duel_answers)<>'array' then raise exception 'MAPP_INVALID_MUTATION' using errcode='22023'; end if;
  answer_count:=jsonb_array_length(p_scale_answers)+jsonb_array_length(p_duel_answers);
  if answer_count<1 or answer_count>4 then raise exception 'MAPP_STEP_SIZE' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mapp-hybrid-step:'||p_attempt_id::text,0));
  select mutation.acknowledgement into existing_ack from mapp.answer_mutations mutation where mutation.attempt_id=p_attempt_id and mutation.mutation_id=p_mutation_id;
  if existing_ack is not null then return existing_ack; end if;
  select * into target_attempt from mapp.attempts where id=p_attempt_id for update;
  if target_attempt.id is null or target_attempt.status<>'in_progress' then raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode='42501'; end if;
  if target_attempt.server_revision<>p_expected_revision then raise exception 'MAPP_REVISION_CONFLICT:%',target_attempt.server_revision using errcode='40001'; end if;
  if exists(select 1 from jsonb_to_recordset(p_scale_answers) item("questionId" uuid,value integer) left join mapp.attempt_question_order ordered on ordered.attempt_id=p_attempt_id and ordered.question_id=item."questionId" join mapp.questions q on q.id=item."questionId" where ordered.question_id is null or item.value not between 1 and 5 or q.metadata->>'mapp_kind'<>'natural_likert')
     or exists(select 1 from jsonb_to_recordset(p_duel_answers) item("questionId" uuid,"optionId" uuid) left join mapp.attempt_question_order ordered on ordered.attempt_id=p_attempt_id and ordered.question_id=item."questionId" left join mapp.question_options option on option.id=item."optionId" and option.question_id=item."questionId" where ordered.question_id is null or option.id is null)
  then raise exception 'MAPP_INVALID_STEP' using errcode='22023'; end if;
  insert into mapp.attempt_answers(attempt_id,question_id,answer_value,client_sequence,answered_at,updated_at)
  select p_attempt_id,item."questionId",item.value,p_client_sequence,now(),now() from jsonb_to_recordset(p_scale_answers) item("questionId" uuid,value integer)
  on conflict(attempt_id,question_id) do update set answer_value=excluded.answer_value,client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now() where mapp.attempt_answers.client_sequence<=excluded.client_sequence;
  insert into mapp.attempt_duel_answers(attempt_id,question_id,selected_option_id,client_sequence)
  select p_attempt_id,item."questionId",item."optionId",p_client_sequence from jsonb_to_recordset(p_duel_answers) item("questionId" uuid,"optionId" uuid)
  on conflict(attempt_id,question_id) do update set selected_option_id=excluded.selected_option_id,client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now() where mapp.attempt_duel_answers.client_sequence<=excluded.client_sequence;
  next_revision:=target_attempt.server_revision+1;
  update mapp.attempts set server_revision=next_revision,last_client_sequence=greatest(last_client_sequence,p_client_sequence),last_saved_at=now(),updated_at=now() where id=p_attempt_id;
  acknowledgement:=jsonb_build_object('appliedMutationId',p_mutation_id,'serverRevision',next_revision,'savedAt',now(),'answerCount',answer_count,'completed',false);
  insert into mapp.answer_mutations(attempt_id,mutation_id,expected_revision,server_revision,client_sequence,answer_count,acknowledgement)
  values(p_attempt_id,p_mutation_id,p_expected_revision,next_revision,p_client_sequence,answer_count,acknowledgement);
  return acknowledgement;
end $$;

create or replace function mapp.guest_result_bundle(p_attempt_id uuid,p_token_hash text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare target_attempt mapp.attempts; target_revision mapp.result_revisions;
begin
  if not mapp.guest_access_allowed(p_attempt_id,p_token_hash) then raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode='42501'; end if;
  select * into target_attempt from mapp.attempts where id=p_attempt_id and status='completed';
  select * into target_revision from mapp.result_revisions where attempt_id=p_attempt_id order by revision desc limit 1;
  if target_attempt.id is null or target_revision.id is null then raise exception 'MAPP_RESULT_UNAVAILABLE' using errcode='P0002'; end if;
  return jsonb_build_object(
    'attemptId',target_attempt.id,'participantName','Ton résultat','completedAt',target_attempt.completed_at,
    'resultRevisionId',target_revision.id,'revision',target_revision.revision,'scoringVersionId',target_revision.scoring_version_id,
    'scores',coalesce((select jsonb_agg(jsonb_build_object('context',score.context,'dimensionCode',dimension.code,'dimensionName',dimension.name,'rawScore',score.raw_score,'maxScore',score.max_score,'percentage',score.percentage) order by dimension.position) from mapp.result_dimension_scores score join mapp.dimensions dimension on dimension.id=score.dimension_id where score.result_revision_id=target_revision.id),'[]'::jsonb),
    'metrics',coalesce((select jsonb_agg(to_jsonb(metric)) from mapp.result_dimension_metrics metric where metric.result_revision_id=target_revision.id),'[]'::jsonb),
    'rankings',coalesce((select jsonb_agg(to_jsonb(ranking)) from mapp.result_rankings ranking where ranking.result_revision_id=target_revision.id),'[]'::jsonb),
    'tieBreak',(select to_jsonb(tie_break) from mapp.result_tie_breaks tie_break where tie_break.result_revision_id=target_revision.id limit 1)
  );
end $$;

create or replace function public.mapp_claim_guest_attempt(p_attempt_id uuid,p_recovery_code text)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_user_id uuid:=(select auth.uid()); verified_email text:=lower(trim(coalesce((select auth.jwt()->>'email'),''))); guest mapp.guest_attempt_access; existing_participant uuid;
begin
  if current_user_id is null or not mapp.current_student_is_eligible() then raise exception 'MAPP_ACCESS_DENIED' using errcode='42501'; end if;
  select * into guest from mapp.guest_attempt_access where attempt_id=p_attempt_id and recovery_hash=encode(extensions.digest(upper(trim(p_recovery_code)),'sha256'),'hex') and claimed_at is null for update;
  if guest.attempt_id is null or guest.email<>verified_email then raise exception 'MAPP_CLAIM_DENIED' using errcode='42501'; end if;
  select participant_id into existing_participant from mapp.participant_auth_identities where auth_user_id=current_user_id and revoked_at is null limit 1;
  if existing_participant is null then
    insert into mapp.participant_auth_identities(participant_id,auth_user_id,kind) values(guest.participant_id,current_user_id,'email'::mapp.identity_kind);
  else
    update mapp.attempts set participant_id=existing_participant where id=p_attempt_id and participant_id=guest.participant_id;
  end if;
  update mapp.guest_attempt_access set claimed_by=current_user_id,claimed_at=now() where attempt_id=p_attempt_id;
  return true;
end $$;

revoke all on function mapp.guest_access_allowed(uuid,text),mapp.guest_questionnaire_bundle(uuid),mapp.start_guest_hybrid_44(text,text,text),mapp.open_guest_hybrid_44(uuid,text),mapp.save_guest_answer_batch(uuid,text,uuid,integer,bigint,jsonb),mapp.save_guest_duel_answer(uuid,text,uuid,uuid,bigint),mapp.save_hybrid_step(uuid,uuid,integer,bigint,jsonb,jsonb),mapp.guest_result_bundle(uuid,text) from public,anon,authenticated;
grant execute on function mapp.guest_access_allowed(uuid,text),mapp.guest_questionnaire_bundle(uuid),mapp.start_guest_hybrid_44(text,text,text),mapp.open_guest_hybrid_44(uuid,text),mapp.save_guest_answer_batch(uuid,text,uuid,integer,bigint,jsonb),mapp.save_guest_duel_answer(uuid,text,uuid,uuid,bigint),mapp.save_hybrid_step(uuid,uuid,integer,bigint,jsonb,jsonb),mapp.guest_result_bundle(uuid,text) to service_role;
revoke all on function public.mapp_claim_guest_attempt(uuid,text) from public,anon;
grant execute on function public.mapp_claim_guest_attempt(uuid,text) to authenticated;

commit;
