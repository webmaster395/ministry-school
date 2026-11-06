-- Generated from Profil MAPP 202610070010_facets_and_quality_metrics.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.scoring_facets (
  id uuid primary key default gen_random_uuid(),
  scoring_version_id uuid not null references mapp.scoring_versions(id) on delete cascade,
  dimension_id uuid not null references mapp.dimensions(id),
  code text not null,
  name text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (scoring_version_id, code),
  unique (scoring_version_id, position)
);

alter table mapp.scoring_question_rules
  add column facet_id uuid references mapp.scoring_facets(id);

create table mapp.result_facet_scores (
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  facet_id uuid not null references mapp.scoring_facets(id),
  raw_score numeric(12,4) not null,
  max_score numeric(12,4) not null,
  index_value numeric(8,4) not null,
  primary key (result_revision_id, facet_id)
);

create table mapp.result_quality_metrics (
  result_revision_id uuid primary key references mapp.result_revisions(id) on delete cascade,
  answered_count integer not null check (answered_count >= 0),
  extreme_ratio numeric(8,6) not null check (extreme_ratio between 0 and 1),
  central_ratio numeric(8,6) not null check (central_ratio between 0 and 1),
  acquiescence_ratio numeric(8,6) not null check (acquiescence_ratio between 0 and 1),
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create index scoring_facets_version_dimension_idx on mapp.scoring_facets(scoring_version_id, dimension_id, position);
create index scoring_rules_facet_idx on mapp.scoring_question_rules(facet_id) where facet_id is not null;

create trigger published_scoring_facets_immutable before insert or update or delete on mapp.scoring_facets
for each row execute function mapp_private.prevent_published_scoring_child_mutation();

alter table mapp.scoring_facets enable row level security;
alter table mapp.result_facet_scores enable row level security;
alter table mapp.result_quality_metrics enable row level security;

create policy scoring_facets_read on mapp.scoring_facets for select to authenticated using (
  exists (
    select 1 from mapp.scoring_versions version
    where version.id = scoring_version_id and version.status = 'published'
  )
);

create policy facet_scores_read_own on mapp.result_facet_scores for select to authenticated using (
  exists (
    select 1
    from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id = revision.attempt_id
    where revision.id = result_revision_id
      and (select mapp_private.owns_participant(attempt.participant_id))
  )
);

create policy quality_metrics_read_own on mapp.result_quality_metrics for select to authenticated using (
  exists (
    select 1
    from mapp.result_revisions revision
    join mapp.attempts attempt on attempt.id = revision.attempt_id
    where revision.id = result_revision_id
      and (select mapp_private.owns_participant(attempt.participant_id))
  )
);

grant select on mapp.scoring_facets, mapp.result_facet_scores to authenticated;
revoke all on mapp.result_quality_metrics from public, anon, authenticated;
grant select on mapp.result_quality_metrics to service_role;

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
  where answer.attempt_id = target_attempt and section.context = 'natural'
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
    result_revision_id,
    answered_count,
    extreme_ratio,
    central_ratio,
    acquiescence_ratio,
    duration_seconds
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

  update mapp.attempts set status = 'completed', completed_at = now(), updated_at = now() where id = target_attempt;
  select * into current_attempt from mapp.attempts where id = target_attempt;

  insert into mapp.result_revisions(attempt_id, revision, questionnaire_version_id, scoring_version_id, reason, computed_by)
  values (target_attempt, 1, current_attempt.questionnaire_version_id, current_attempt.scoring_version_id, 'initial', (select auth.uid()))
  returning id into result_id;

  perform mapp_private.populate_result_metrics(result_id, target_attempt, current_attempt.scoring_version_id);
  insert into mapp.attempt_events(attempt_id, event_type) values (target_attempt, 'completed');
  return result_id;
end;
$$;

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
  if current_attempt.id is null or current_attempt.status <> 'completed' then raise exception 'Completed attempt required'; end if;
  select * into selected_scoring from mapp.scoring_versions where id = target_scoring_version;
  if selected_scoring.id is null or selected_scoring.status <> 'published' then raise exception 'Published scoring version required'; end if;
  if selected_scoring.questionnaire_version_id <> current_attempt.questionnaire_version_id then
    raise exception 'Scoring version does not belong to the attempt questionnaire version';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision from mapp.result_revisions where attempt_id = target_attempt;
  insert into mapp.result_revisions(attempt_id, revision, questionnaire_version_id, scoring_version_id, reason, computed_by)
  values (target_attempt, next_revision, current_attempt.questionnaire_version_id, selected_scoring.id,
    coalesce(nullif(trim(recalculation_reason), ''), 'recalculation'), (select auth.uid()))
  returning id into new_result;

  perform mapp_private.populate_result_metrics(new_result, target_attempt, selected_scoring.id);
  return new_result;
end;
$$;

create or replace function mapp.recalculate_attempt(target_attempt uuid, recalculation_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare selected_scoring uuid;
begin
  select scoring_version_id into selected_scoring from mapp.attempts where id = target_attempt;
  return mapp.recalculate_attempt(target_attempt, selected_scoring, recalculation_reason);
end;
$$;

create or replace function mapp.publish_scoring_version(target_version uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  score_row mapp.scoring_versions;
  expected_inverted integer;
  actual_inverted integer;
  expected_per_dimension integer;
  invalid_dimensions integer;
  expected_dimensions integer;
  actual_dimensions integer;
  expected_facets integer;
  actual_facets integer;
  expected_questions_per_facet integer;
  invalid_facets integer;
  invalid_facet_dimensions integer;
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
    select count(*) into actual_inverted from mapp.scoring_question_rules rule
    join mapp.questions question on question.id = rule.question_id
    join mapp.questionnaire_sections section on section.id = question.section_id
    where rule.scoring_version_id = target_version and section.context = 'natural' and rule.direction = -1;
    if actual_inverted <> expected_inverted then raise exception 'Expected % inverted natural rules, found %', expected_inverted, actual_inverted; end if;
  end if;

  expected_per_dimension := nullif(score_row.config ->> 'expected_natural_per_dimension', '')::integer;
  if expected_per_dimension is not null then
    select count(*) into invalid_dimensions from (
      select rule.dimension_id from mapp.scoring_question_rules rule
      join mapp.questions question on question.id = rule.question_id
      join mapp.questionnaire_sections section on section.id = question.section_id
      where rule.scoring_version_id = target_version and section.context = 'natural'
      group by rule.dimension_id having count(*) <> expected_per_dimension
    ) invalid;
    if invalid_dimensions > 0 then raise exception 'Natural rule count per dimension does not match configuration'; end if;
  end if;

  expected_dimensions := nullif(score_row.config ->> 'expected_natural_dimensions', '')::integer;
  if expected_dimensions is not null then
    select count(distinct rule.dimension_id) into actual_dimensions from mapp.scoring_question_rules rule
    join mapp.questions question on question.id = rule.question_id
    join mapp.questionnaire_sections section on section.id = question.section_id
    where rule.scoring_version_id = target_version and section.context = 'natural';
    if actual_dimensions <> expected_dimensions then raise exception 'Expected % natural dimensions, found %', expected_dimensions, actual_dimensions; end if;
  end if;

  expected_facets := nullif(score_row.config ->> 'expected_facets', '')::integer;
  if expected_facets is not null then
    select count(*) into actual_facets from mapp.scoring_facets where scoring_version_id = target_version;
    if actual_facets <> expected_facets then raise exception 'Expected % facets, found %', expected_facets, actual_facets; end if;
  end if;

  expected_questions_per_facet := nullif(score_row.config ->> 'expected_questions_per_facet', '')::integer;
  if expected_questions_per_facet is not null then
    select count(*) into invalid_facets from (
      select facet.id
      from mapp.scoring_facets facet
      left join mapp.scoring_question_rules rule on rule.facet_id = facet.id and rule.scoring_version_id = target_version
      where facet.scoring_version_id = target_version
      group by facet.id
      having count(rule.id) <> expected_questions_per_facet
    ) invalid;
    if invalid_facets > 0 then raise exception 'Question count per facet does not match configuration'; end if;

    select count(*) into invalid_facet_dimensions
    from mapp.scoring_question_rules rule
    join mapp.scoring_facets facet on facet.id = rule.facet_id
    where rule.scoring_version_id = target_version
      and (facet.scoring_version_id <> target_version or facet.dimension_id <> rule.dimension_id);
    if invalid_facet_dimensions > 0 then raise exception 'Facet mappings must belong to the scoring version and match rule dimensions'; end if;
  end if;

  update mapp.scoring_versions set status = 'published', published_at = now() where id = target_version;
end;
$$;

revoke all on function mapp_private.populate_result_metrics(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function mapp.finalize_attempt(uuid) from public, anon;
revoke all on function mapp.recalculate_attempt(uuid, uuid, text) from public, anon, authenticated;
revoke all on function mapp.recalculate_attempt(uuid, text) from public, anon, authenticated;
grant execute on function mapp.finalize_attempt(uuid) to authenticated;
grant execute on function mapp.recalculate_attempt(uuid, uuid, text) to service_role;
grant execute on function mapp.recalculate_attempt(uuid, text) to service_role;
revoke all on function mapp.publish_scoring_version(uuid) from public, anon, authenticated;
grant execute on function mapp.publish_scoring_version(uuid) to service_role;

comment on table mapp.scoring_facets is 'Versioned facet definitions owned by a scoring version.';
comment on table mapp.result_quality_metrics is 'Pilot-only response-pattern indicators; never alter scores or exclude participants.';
