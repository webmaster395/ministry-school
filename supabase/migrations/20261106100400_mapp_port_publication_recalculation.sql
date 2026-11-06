-- Generated from Profil MAPP 202610070005_publication_recalculation.sql.
-- Do not edit this generated file; update the source migration or transformer.
create or replace function mapp.publish_questionnaire_version(target_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_row mapp.questionnaire_versions;
  expected_total integer;
  actual_total integer;
  rule jsonb;
  actual_count integer;
begin
  select * into version_row from mapp.questionnaire_versions where id = target_version for update;
  if version_row.id is null then raise exception 'Questionnaire version not found'; end if;
  if version_row.status = 'published' then return; end if;

  expected_total := nullif(version_row.publication_rules ->> 'total_questions', '')::integer;
  select count(*) into actual_total from mapp.questions where questionnaire_version_id = target_version;
  if expected_total is not null and actual_total <> expected_total then
    raise exception 'Expected % questions, found %', expected_total, actual_total;
  end if;

  for rule in select * from jsonb_array_elements(coalesce(version_row.publication_rules -> 'section_counts', '[]'::jsonb)) loop
    select count(*) into actual_count
    from mapp.questions q join mapp.questionnaire_sections s on s.id = q.section_id
    where q.questionnaire_version_id = target_version and s.code = rule ->> 'section';
    if actual_count <> (rule ->> 'count')::integer then
      raise exception 'Section % expected % questions, found %', rule ->> 'section', rule ->> 'count', actual_count;
    end if;
  end loop;

  update mapp.questionnaire_versions set status = 'published', published_at = now() where id = target_version;
end;
$$;

create or replace function mapp.publish_scoring_version(target_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare score_row mapp.scoring_versions;
declare expected_inverted integer;
declare actual_inverted integer;
declare expected_per_dimension integer;
declare invalid_dimensions integer;
declare expected_dimensions integer;
declare actual_dimensions integer;
begin
  select * into score_row from mapp.scoring_versions where id = target_version for update;
  if score_row.id is null then raise exception 'Scoring version not found'; end if;
  if score_row.status = 'published' then return; end if;
  if not exists (select 1 from mapp.scoring_question_rules where scoring_version_id = target_version) then
    raise exception 'A scoring version requires at least one rule';
  end if;
  if not exists (select 1 from mapp.questionnaire_versions where id = score_row.questionnaire_version_id and status = 'published') then
    raise exception 'Questionnaire version must be published first';
  end if;
  expected_inverted := nullif(score_row.config ->> 'expected_natural_inverted', '')::integer;
  if expected_inverted is not null then
    select count(*) into actual_inverted from mapp.scoring_question_rules r
    join mapp.questions q on q.id = r.question_id join mapp.questionnaire_sections s on s.id = q.section_id
    where r.scoring_version_id = target_version and s.context = 'natural' and r.direction = -1;
    if actual_inverted <> expected_inverted then raise exception 'Expected % inverted natural rules, found %', expected_inverted, actual_inverted; end if;
  end if;
  expected_per_dimension := nullif(score_row.config ->> 'expected_natural_per_dimension', '')::integer;
  if expected_per_dimension is not null then
    select count(*) into invalid_dimensions from (
      select r.dimension_id from mapp.scoring_question_rules r
      join mapp.questions q on q.id = r.question_id join mapp.questionnaire_sections s on s.id = q.section_id
      where r.scoring_version_id = target_version and s.context = 'natural'
      group by r.dimension_id having count(*) <> expected_per_dimension
    ) invalid;
    if invalid_dimensions > 0 then raise exception 'Natural rule count per dimension does not match configuration'; end if;
  end if;
  expected_dimensions := nullif(score_row.config ->> 'expected_natural_dimensions', '')::integer;
  if expected_dimensions is not null then
    select count(distinct r.dimension_id) into actual_dimensions from mapp.scoring_question_rules r
    join mapp.questions q on q.id = r.question_id join mapp.questionnaire_sections s on s.id = q.section_id
    where r.scoring_version_id = target_version and s.context = 'natural';
    if actual_dimensions <> expected_dimensions then raise exception 'Expected % natural dimensions, found %', expected_dimensions, actual_dimensions; end if;
  end if;
  update mapp.scoring_versions set status = 'published', published_at = now() where id = target_version;
end;
$$;

create or replace function mapp.recalculate_attempt(target_attempt uuid, recalculation_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_attempt mapp.attempts;
  new_result uuid;
  next_revision integer;
begin
  select * into current_attempt from mapp.attempts where id = target_attempt for update;
  if current_attempt.id is null or current_attempt.status <> 'completed' then raise exception 'Completed attempt required'; end if;
  select coalesce(max(revision), 0) + 1 into next_revision from mapp.result_revisions where attempt_id = target_attempt;
  insert into mapp.result_revisions(attempt_id, revision, questionnaire_version_id, scoring_version_id, reason, computed_by)
  values (target_attempt, next_revision, current_attempt.questionnaire_version_id, current_attempt.scoring_version_id,
    nullif(trim(recalculation_reason), ''), (select auth.uid())) returning id into new_result;

  insert into mapp.result_dimension_scores(result_revision_id, dimension_id, context, raw_score, max_score, percentage)
  select new_result, r.dimension_id, s.context,
    sum(coalesce((r.points_map ->> a.answer_value::text)::numeric,
      case when r.direction = 1 then a.answer_value - 1 else 5 - a.answer_value end) * r.weight),
    sum(4 * abs(r.weight)),
    100 * sum(coalesce((r.points_map ->> a.answer_value::text)::numeric,
      case when r.direction = 1 then a.answer_value - 1 else 5 - a.answer_value end) * r.weight)
      / nullif(sum(4 * abs(r.weight)), 0)
  from mapp.attempt_answers a
  join mapp.questions q on q.id = a.question_id
  join mapp.questionnaire_sections s on s.id = q.section_id
  join mapp.scoring_question_rules r on r.question_id = a.question_id and r.scoring_version_id = current_attempt.scoring_version_id
  where a.attempt_id = target_attempt and s.context = 'natural'
  group by r.dimension_id, s.context;
  return new_result;
end;
$$;

revoke all on function mapp.publish_questionnaire_version(uuid) from public, anon, authenticated;
revoke all on function mapp.publish_scoring_version(uuid) from public, anon, authenticated;
revoke all on function mapp.recalculate_attempt(uuid, text) from public, anon, authenticated;
grant execute on function mapp.publish_questionnaire_version(uuid) to service_role;
grant execute on function mapp.publish_scoring_version(uuid) to service_role;
grant execute on function mapp.recalculate_attempt(uuid, text) to service_role;

comment on function mapp.recalculate_attempt(uuid, text) is 'Creates a new immutable result revision; never overwrites prior results.';
