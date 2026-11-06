-- Generated from Profil MAPP 202610080003_pressure_scoring_v1.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- Prepared locally only. Do not apply or publish without explicit approval.
-- Preserve finalization, recalculation, facets and quality metrics. Only the
-- dimension aggregation is widened to configured scoring contexts.

create or replace function mapp_private.populate_result_metrics(
  target_result uuid,
  target_attempt uuid,
  target_scoring_version uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row mapp.attempts;
begin
  select * into attempt_row from mapp.attempts where id = target_attempt;
  if attempt_row.id is null then raise exception 'Attempt unavailable'; end if;

  insert into mapp.result_dimension_scores(result_revision_id, dimension_id, context, raw_score, max_score, percentage)
  select target_result, rule.dimension_id, section.context,
    sum(coalesce((rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end) * rule.weight),
    sum(4 * abs(rule.weight)),
    100 * sum(coalesce((rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end) * rule.weight)
      / nullif(sum(4 * abs(rule.weight)), 0)
  from mapp.attempt_answers answer
  join mapp.questions question on question.id = answer.question_id
  join mapp.questionnaire_sections section on section.id = question.section_id
  join mapp.scoring_question_rules rule
    on rule.question_id = answer.question_id
   and rule.scoring_version_id = target_scoring_version
  where answer.attempt_id = target_attempt
  group by rule.dimension_id, section.context;

  insert into mapp.result_facet_scores(result_revision_id, facet_id, raw_score, max_score, index_value)
  select target_result, rule.facet_id,
    sum(coalesce((rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end) * rule.weight),
    sum(4 * abs(rule.weight)),
    100 * sum(coalesce((rule.points_map ->> answer.answer_value::text)::numeric,
      case when rule.direction = 1 then answer.answer_value - 1 else 5 - answer.answer_value end) * rule.weight)
      / nullif(sum(4 * abs(rule.weight)), 0)
  from mapp.attempt_answers answer
  join mapp.questions question on question.id = answer.question_id
  join mapp.questionnaire_sections section on section.id = question.section_id
  join mapp.scoring_question_rules rule
    on rule.question_id = answer.question_id
   and rule.scoring_version_id = target_scoring_version
  where answer.attempt_id = target_attempt
    and section.context = 'natural'
    and rule.facet_id is not null
  group by rule.facet_id;

  insert into mapp.result_quality_metrics(
    result_revision_id, answered_count, extreme_ratio, central_ratio,
    acquiescence_ratio, duration_seconds
  )
  select target_result,
    count(*)::integer,
    count(*) filter (where answer_value in (1, 5))::numeric / nullif(count(*), 0),
    count(*) filter (where answer_value = 3)::numeric / nullif(count(*), 0),
    count(*) filter (where answer_value in (4, 5))::numeric / nullif(count(*), 0),
    greatest(0, extract(epoch from (coalesce(attempt_row.completed_at, now()) - attempt_row.started_at))::integer)
  from mapp.attempt_answers
  where attempt_id = target_attempt;
end;
$$;

comment on function mapp_private.populate_result_metrics(uuid, uuid, uuid) is
  'Populates immutable dimension scores for configured contexts while preserving natural facets and full-questionnaire quality metrics.';
