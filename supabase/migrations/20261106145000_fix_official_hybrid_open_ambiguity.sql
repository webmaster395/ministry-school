begin;

-- Corrige uniquement l'ambiguïté PL/pgSQL entre la variable attempt_id et
-- les colonnes homonymes. Aucun questionnaire ni résultat n'est modifié.
create or replace function mapp.open_official_hybrid_questionnaire()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  base jsonb;
  v_attempt_id uuid;
begin
  base := mapp.open_native_questionnaire();
  v_attempt_id := (base->>'attemptId')::uuid;
  return base || jsonb_build_object(
    'engine', 'hybrid-44',
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'code', q.external_key,
        'position', o.position,
        'prompt', q.prompt,
        'metadata', q.metadata,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('value', ao.value, 'label', ao.label) order by ao.position)
          from mapp.answer_options ao
          where ao.scale_id = q.answer_scale_id
        ), '[]'::jsonb),
        'questionOptions', coalesce((
          select jsonb_agg(jsonb_build_object('id', qo.id, 'key', qo.option_key, 'label', qo.label, 'position', qo.position) order by qo.position)
          from mapp.question_options qo
          where qo.question_id = q.id
        ), '[]'::jsonb)
      ) order by o.position)
      from mapp.attempt_question_order o
      join mapp.questions q on q.id = o.question_id
      where o.attempt_id = v_attempt_id
    ), '[]'::jsonb),
    'duelAnswers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'questionId', a.question_id,
        'optionId', a.selected_option_id,
        'clientSequence', a.client_sequence
      ))
      from mapp.attempt_duel_answers a
      where a.attempt_id = v_attempt_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function mapp.open_official_hybrid_questionnaire() from public, anon, authenticated;
grant execute on function mapp.open_official_hybrid_questionnaire() to service_role;

commit;
