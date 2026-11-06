-- Generated from Profil MAPP 202610070009_recalculate_with_scoring_version.sql.
-- Do not edit this generated file; update the source migration or transformer.
create or replace function mapp.recalculate_attempt(
  target_attempt uuid,
  target_scoring_version uuid,
  recalculation_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt mapp.attempts;
  selected_scoring mapp.scoring_versions;
  new_result uuid;
  next_revision integer;
begin
  select * into current_attempt from mapp.attempts where id = target_attempt for update;
  if current_attempt.id is null or current_attempt.status <> 'completed' then
    raise exception 'Completed attempt required';
  end if;

  select * into selected_scoring from mapp.scoring_versions where id = target_scoring_version;
  if selected_scoring.id is null or selected_scoring.status <> 'published' then
    raise exception 'Published scoring version required';
  end if;
  if selected_scoring.questionnaire_version_id <> current_attempt.questionnaire_version_id then
    raise exception 'Scoring version does not belong to the attempt questionnaire version';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from mapp.result_revisions where attempt_id = target_attempt;

  insert into mapp.result_revisions(
    attempt_id,
    revision,
    questionnaire_version_id,
    scoring_version_id,
    reason,
    computed_by
  ) values (
    target_attempt,
    next_revision,
    current_attempt.questionnaire_version_id,
    selected_scoring.id,
    coalesce(nullif(trim(recalculation_reason), ''), 'recalculation'),
    (select auth.uid())
  ) returning id into new_result;

  insert into mapp.result_dimension_scores(
    result_revision_id,
    dimension_id,
    context,
    raw_score,
    max_score,
    percentage
  )
  select
    new_result,
    rule.dimension_id,
    section.context,
    sum(coalesce(
      (rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end
    ) * rule.weight),
    sum(4 * abs(rule.weight)),
    100 * sum(coalesce(
      (rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end
    ) * rule.weight) / nullif(sum(4 * abs(rule.weight)), 0)
  from mapp.attempt_answers answer
  join mapp.questions question on question.id = answer.question_id
  join mapp.questionnaire_sections section on section.id = question.section_id
  join mapp.scoring_question_rules rule
    on rule.question_id = answer.question_id
   and rule.scoring_version_id = selected_scoring.id
  where answer.attempt_id = target_attempt
    and section.context = 'natural'
  group by rule.dimension_id, section.context;

  return new_result;
end;
$$;

revoke all on function mapp.recalculate_attempt(uuid, uuid, text) from public, anon, authenticated;
grant execute on function mapp.recalculate_attempt(uuid, uuid, text) to service_role;

comment on function mapp.recalculate_attempt(uuid, uuid, text) is
  'Creates a new immutable result revision with an explicitly selected published scoring version; prior revisions remain unchanged.';
