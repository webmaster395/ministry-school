-- Generated from Profil MAPP 202610110001_disc_mapp_v2.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- DISC MAPP V2 is additive. Existing questionnaire/scoring versions and historical rows are untouched.

create table mapp.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references mapp.questions(id) on delete cascade,
  option_key text not null,
  label text not null,
  position integer not null check (position between 1 and 4),
  plus_code text not null check (plus_code in ('D','I','S','C','N')),
  minus_code text not null check (minus_code in ('D','I','S','C','N')),
  definition text,
  created_at timestamptz not null default now(),
  unique (question_id, option_key),
  unique (question_id, position)
);

create or replace function mapp_private.prevent_published_question_option_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare parent_status mapp.record_status;
declare target_question uuid;
begin
  target_question := coalesce(new.question_id, old.question_id);
  select version.status into parent_status
  from mapp.questions question
  join mapp.questionnaire_versions version on version.id = question.questionnaire_version_id
  where question.id = target_question;
  if parent_status = 'published' then
    raise exception 'Options of a published questionnaire are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger published_question_options_immutable
before insert or update or delete on mapp.question_options
for each row execute function mapp_private.prevent_published_question_option_mutation();

create table mapp.attempt_forced_choice_answers (
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  question_id uuid not null references mapp.questions(id) on delete restrict,
  most_option_id uuid not null references mapp.question_options(id) on delete restrict,
  least_option_id uuid not null references mapp.question_options(id) on delete restrict,
  client_sequence bigint not null default 0,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id),
  check (most_option_id <> least_option_id)
);

create table mapp.result_dimension_metrics (
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  context mapp.question_context not null,
  dimension_code text not null check (dimension_code in ('D','I','S','C','N')),
  plus_count integer,
  minus_count integer,
  net_score integer,
  positive_opportunity integer,
  normalized_rate numeric(18,12),
  pressure_raw_sum integer,
  intensity numeric(12,6),
  display_percentage numeric(8,2),
  is_indeterminate boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (result_revision_id, context, dimension_code),
  check (context = 'natural' or dimension_code <> 'N')
);

create table mapp.result_rankings (
  id uuid primary key default gen_random_uuid(),
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  context mapp.question_context not null check (context in ('natural','under_pressure')),
  scoring_version text not null,
  basis jsonb not null,
  initial_order text[] not null,
  primary_candidates text[] not null,
  secondary_candidates text[] not null,
  resolved_order text[],
  primary_code text,
  secondary_code text,
  tie_break_required boolean not null,
  is_indeterminate boolean not null default false,
  created_at timestamptz not null default now(),
  unique (result_revision_id, context),
  check (primary_code is null or primary_code in ('D','I','S','C')),
  check (secondary_code is null or secondary_code in ('D','I','S','C'))
);

create table mapp.result_tie_break_runs (
  id uuid primary key default gen_random_uuid(),
  result_ranking_id uuid not null references mapp.result_rankings(id) on delete cascade,
  version text not null,
  context mapp.question_context not null check (context in ('natural','under_pressure')),
  rank_scope text not null check (rank_scope in ('primary','secondary')),
  candidate_codes text[] not null check (cardinality(candidate_codes) between 2 and 4),
  initial_order text[] not null,
  final_order text[],
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (result_ranking_id, rank_scope)
);

create table mapp.result_tie_break_duel_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references mapp.result_tie_break_runs(id) on delete cascade,
  duel_id text not null check (duel_id in ('D-I','D-S','D-C','I-S','I-C','S-C')),
  sequence integer not null check (sequence between 1 and 6),
  left_code text not null check (left_code in ('D','I','S','C')),
  right_code text not null check (right_code in ('D','I','S','C')),
  selected_code text not null check (selected_code in ('D','I','S','C')),
  answered_at timestamptz not null default now(),
  unique (run_id, duel_id),
  unique (run_id, sequence),
  check (left_code <> right_code and selected_code in (left_code, right_code))
);

alter table mapp.live_presentations drop constraint if exists live_presentations_display_mode_check;
alter table mapp.live_presentations add constraint live_presentations_display_mode_check
  check (display_mode in ('distribution','averages','pressure_distribution','pressure_averages','qr'));

create index question_options_question_idx on mapp.question_options(question_id, position);
create index forced_answers_attempt_idx on mapp.attempt_forced_choice_answers(attempt_id);
create index result_metrics_revision_context_idx on mapp.result_dimension_metrics(result_revision_id, context);
create index result_rankings_revision_idx on mapp.result_rankings(result_revision_id, context);
create index tie_break_runs_ranking_idx on mapp.result_tie_break_runs(result_ranking_id, context);
create index tie_break_answers_run_idx on mapp.result_tie_break_duel_answers(run_id, sequence);

alter table mapp.question_options enable row level security;
alter table mapp.attempt_forced_choice_answers enable row level security;
alter table mapp.result_dimension_metrics enable row level security;
alter table mapp.result_rankings enable row level security;
alter table mapp.result_tie_break_runs enable row level security;
alter table mapp.result_tie_break_duel_answers enable row level security;

create policy published_question_options_read on mapp.question_options for select to authenticated using (
  exists (select 1 from mapp.questions q join mapp.questionnaire_versions v on v.id=q.questionnaire_version_id where q.id=question_id and v.status='published')
);
create policy forced_answers_read_own on mapp.attempt_forced_choice_answers for select to authenticated using (
  exists (select 1 from mapp.attempts a where a.id=attempt_id and mapp_private.owns_participant(a.participant_id))
);
create policy result_metrics_read_own on mapp.result_dimension_metrics for select to authenticated using (
  exists (select 1 from mapp.result_revisions r join mapp.attempts a on a.id=r.attempt_id where r.id=result_revision_id and mapp_private.owns_participant(a.participant_id))
);
create policy result_rankings_read_own on mapp.result_rankings for select to authenticated using (
  exists (select 1 from mapp.result_revisions r join mapp.attempts a on a.id=r.attempt_id where r.id=result_revision_id and mapp_private.owns_participant(a.participant_id))
);
create policy tie_runs_read_own on mapp.result_tie_break_runs for select to authenticated using (
  exists (select 1 from mapp.result_rankings ranking join mapp.result_revisions r on r.id=ranking.result_revision_id join mapp.attempts a on a.id=r.attempt_id where ranking.id=result_ranking_id and mapp_private.owns_participant(a.participant_id))
);
create policy duel_answers_read_own on mapp.result_tie_break_duel_answers for select to authenticated using (
  exists (select 1 from mapp.result_tie_break_runs run join mapp.result_rankings ranking on ranking.id=run.result_ranking_id join mapp.result_revisions r on r.id=ranking.result_revision_id join mapp.attempts a on a.id=r.attempt_id where run.id=run_id and mapp_private.owns_participant(a.participant_id))
);

grant select on mapp.question_options, mapp.attempt_forced_choice_answers, mapp.result_dimension_metrics,
  mapp.result_rankings, mapp.result_tie_break_runs, mapp.result_tie_break_duel_answers to authenticated;

create trigger finalized_forced_answers_immutable before insert or update or delete on mapp.attempt_forced_choice_answers
for each row execute function mapp_private.prevent_finalized_attempt_change();

create or replace function mapp.save_disc_forced_choice_answer(
  target_attempt uuid,
  target_question uuid,
  target_most_option uuid,
  target_least_option uuid,
  target_sequence bigint
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owned boolean;
begin
  if target_most_option = target_least_option then raise exception 'Most and least choices must be distinct'; end if;
  select mapp_private.owns_participant(a.participant_id) and a.status='in_progress' into owned from mapp.attempts a where a.id=target_attempt;
  if not coalesce(owned,false) then raise exception 'Attempt unavailable'; end if;
  if not exists (select 1 from mapp.attempt_question_order where attempt_id=target_attempt and question_id=target_question) then raise exception 'Question is not part of attempt'; end if;
  if not exists (select 1 from mapp.question_options where id=target_most_option and question_id=target_question)
    or not exists (select 1 from mapp.question_options where id=target_least_option and question_id=target_question) then raise exception 'Option is not part of question'; end if;
  insert into mapp.attempt_forced_choice_answers(attempt_id,question_id,most_option_id,least_option_id,client_sequence)
  values(target_attempt,target_question,target_most_option,target_least_option,target_sequence)
  on conflict(attempt_id,question_id) do update set most_option_id=excluded.most_option_id,least_option_id=excluded.least_option_id,
    client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now()
  where mapp.attempt_forced_choice_answers.client_sequence <= excluded.client_sequence;
  update mapp.attempts set last_saved_at=now() where id=target_attempt;
  return true;
end $$;

revoke all on function mapp.save_disc_forced_choice_answer(uuid,uuid,uuid,uuid,bigint) from public,anon;
grant execute on function mapp.save_disc_forced_choice_answer(uuid,uuid,uuid,uuid,bigint) to authenticated;

-- The immutable scoring package is executed by the application/server implementation. This finalizer
-- atomically records its verified output after checking ownership, version and questionnaire completeness.
create or replace function mapp.finalize_disc_v2_attempt(target_attempt uuid, result_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a mapp.attempts; score mapp.scoring_versions; result_id uuid; natural_count integer; pressure_count integer;
begin
  select * into a from mapp.attempts where id=target_attempt for update;
  if a.id is null then raise exception 'Attempt unavailable'; end if;
  select * into score from mapp.scoring_versions where id=a.scoring_version_id;
  if score.code <> 'disc-mapp-v2.0.0' or score.algorithm <> 'disc-forced-choice-v2' then raise exception 'DISC V2 scoring version required'; end if;
  if a.status='completed' then select id into result_id from mapp.result_revisions where attempt_id=target_attempt order by revision desc limit 1; return result_id; end if;
  if a.status <> 'in_progress' then raise exception 'Attempt cannot be finalized'; end if;
  select count(*) into natural_count from mapp.attempt_forced_choice_answers where attempt_id=target_attempt;
  select count(*) into pressure_count from mapp.attempt_answers ans join mapp.questions q on q.id=ans.question_id where ans.attempt_id=target_attempt and q.metadata->>'disc_kind'='pressure';
  if natural_count <> 28 or pressure_count <> 8 then raise exception 'DISC V2 requires 28 natural groups and 8 pressure answers'; end if;
  if result_payload->>'questionnaireVersion' <> 'disc-mapp-v2.0.0' or result_payload->>'scoringVersion' <> 'disc-mapp-v2.0.0' then raise exception 'Payload version mismatch'; end if;

  insert into mapp.result_revisions(attempt_id,revision,questionnaire_version_id,scoring_version_id,reason,computed_by)
  values(target_attempt,1,a.questionnaire_version_id,a.scoring_version_id,'initial',(select auth.uid())) returning id into result_id;

  insert into mapp.result_dimension_metrics(result_revision_id,context,dimension_code,plus_count,minus_count,net_score,positive_opportunity,normalized_rate,pressure_raw_sum,intensity,display_percentage,is_indeterminate)
  select result_id,(item->>'context')::mapp.question_context,item->>'dimensionCode',nullif(item->>'plusCount','')::integer,nullif(item->>'minusCount','')::integer,
    nullif(item->>'netScore','')::integer,nullif(item->>'positiveOpportunity','')::integer,nullif(item->>'normalizedRate','')::numeric,
    nullif(item->>'pressureRawSum','')::integer,nullif(item->>'intensity','')::numeric,nullif(item->>'displayPercentage','')::numeric,coalesce((item->>'isIndeterminate')::boolean,false)
  from jsonb_array_elements(result_payload->'metrics') item;

  insert into mapp.result_dimension_scores(result_revision_id,dimension_id,context,raw_score,max_score,percentage)
  select result_id,d.id,m.context,case when m.context='natural' then m.net_score else m.pressure_raw_sum end,
    case when m.context='natural' then m.positive_opportunity else 10 end,coalesce(m.display_percentage,0)
  from mapp.result_dimension_metrics m join mapp.dimensions d on d.code=case m.dimension_code when 'D' then 'conquerant' when 'I' then 'communiquant' when 'S' then 'facilitateur' when 'C' then 'analyste' end
  where m.result_revision_id=result_id and m.dimension_code<>'N';

  insert into mapp.result_rankings(result_revision_id,context,scoring_version,basis,initial_order,primary_candidates,secondary_candidates,resolved_order,primary_code,secondary_code,tie_break_required,is_indeterminate)
  select result_id,(ranking->>'context')::mapp.question_context,'disc-mapp-v2.0.0',ranking->'basis',array(select jsonb_array_elements_text(ranking->'initialOrder')),
    array(select jsonb_array_elements_text(ranking->'primaryCandidates')),array(select jsonb_array_elements_text(ranking->'secondaryCandidates')),
    case when ranking ? 'resolvedOrder' then array(select jsonb_array_elements_text(ranking->'resolvedOrder')) else null end,
    nullif(ranking->>'primaryCode',''),nullif(ranking->>'secondaryCode',''),(ranking->>'tieBreakRequired')::boolean,coalesce((ranking->>'isIndeterminate')::boolean,false)
  from jsonb_array_elements(result_payload->'rankings') ranking;

  update mapp.attempts set status='completed',completed_at=now(),updated_at=now() where id=target_attempt;
  insert into mapp.attempt_events(attempt_id,event_type,metadata) values(target_attempt,'completed',jsonb_build_object('scoring_version','disc-mapp-v2.0.0'));
  return result_id;
end $$;

revoke all on function mapp.finalize_disc_v2_attempt(uuid,jsonb) from public,anon,authenticated;
grant execute on function mapp.finalize_disc_v2_attempt(uuid,jsonb) to service_role;

create or replace function mapp.publish_disc_v2_versions(target_questionnaire_version uuid, target_scoring_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare group_count integer; option_count integer; pressure_count integer; score mapp.scoring_versions;
begin
  select * into score from mapp.scoring_versions where id=target_scoring_version and questionnaire_version_id=target_questionnaire_version for update;
  if score.id is null or score.code<>'disc-mapp-v2.0.0' or score.algorithm<>'disc-forced-choice-v2' then raise exception 'DISC V2 versions required'; end if;
  select count(*) into group_count from mapp.questions q where q.questionnaire_version_id=target_questionnaire_version and q.metadata->>'disc_kind'='forced_choice_plus_minus';
  select count(*) into pressure_count from mapp.questions q where q.questionnaire_version_id=target_questionnaire_version and q.metadata->>'disc_kind'='pressure';
  select count(*) into option_count from mapp.question_options o join mapp.questions q on q.id=o.question_id where q.questionnaire_version_id=target_questionnaire_version;
  if group_count<>28 or option_count<>112 or pressure_count<>8 then raise exception 'DISC V2 publication requires 28 groups, 112 options and 8 pressure questions'; end if;
  if exists (
    select 1 from mapp.questions q join mapp.question_options o on o.question_id=q.id
    where q.questionnaire_version_id=target_questionnaire_version
    group by q.id having count(*)<>4
  ) then raise exception 'Each natural group requires four options'; end if;
  update mapp.questionnaire_versions set status='published',published_at=now() where id=target_questionnaire_version and status='draft';
  update mapp.scoring_versions set status='published',published_at=now() where id=target_scoring_version and status='draft';
end $$;

revoke all on function mapp.publish_disc_v2_versions(uuid,uuid) from public,anon,authenticated;
grant execute on function mapp.publish_disc_v2_versions(uuid,uuid) to service_role;

comment on table mapp.result_rankings is 'Authoritative exact rankings. DISC V2 consumers must not reclassify from display percentages.';
comment on function mapp.finalize_disc_v2_attempt(uuid,jsonb) is 'Version-gated additive finalizer for immutable DISC MAPP V2 attempts.';
