begin;

create or replace function mapp.guest_hybrid_finalize_input(
  p_attempt_id uuid,
  p_token_hash text
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_attempt mapp.attempts;
  target_revision_id uuid;
  duel_answers jsonb;
  scale_answers jsonb;
begin
  if not mapp.guest_access_allowed(p_attempt_id, p_token_hash) then
    raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode = '42501';
  end if;

  select * into target_attempt
  from mapp.attempts
  where id = p_attempt_id;

  if target_attempt.id is null or target_attempt.status not in ('in_progress', 'completed') then
    raise exception 'MAPP_ATTEMPT_UNAVAILABLE' using errcode = '42501';
  end if;

  if target_attempt.status = 'completed' then
    select revision.id into target_revision_id
    from mapp.result_revisions revision
    where revision.attempt_id = p_attempt_id
    order by revision.revision desc
    limit 1;

    return jsonb_build_object(
      'status', target_attempt.status,
      'revisionId', target_revision_id,
      'duelAnswers', '{}'::jsonb,
      'scaleAnswers', '{}'::jsonb
    );
  end if;

  select coalesce(jsonb_object_agg(question.metadata->>'source_id', option.option_key), '{}'::jsonb)
  into duel_answers
  from mapp.attempt_duel_answers answer
  join mapp.questions question on question.id = answer.question_id
  join mapp.question_options option on option.id = answer.selected_option_id
  where answer.attempt_id = p_attempt_id;

  select coalesce(jsonb_object_agg(question.metadata->>'source_id', answer.answer_value), '{}'::jsonb)
  into scale_answers
  from mapp.attempt_answers answer
  join mapp.questions question on question.id = answer.question_id
  where answer.attempt_id = p_attempt_id
    and question.metadata->>'mapp_kind' = 'natural_likert';

  return jsonb_build_object(
    'status', target_attempt.status,
    'revisionId', null,
    'duelAnswers', duel_answers,
    'scaleAnswers', scale_answers
  );
end;
$$;

revoke all on function mapp.guest_hybrid_finalize_input(uuid,text)
  from public, anon, authenticated;
grant execute on function mapp.guest_hybrid_finalize_input(uuid,text)
  to service_role;

comment on function mapp.guest_hybrid_finalize_input(uuid,text) is
  'Validates a guest secret and returns the complete Hybrid 44 scoring input in one RPC.';

commit;
