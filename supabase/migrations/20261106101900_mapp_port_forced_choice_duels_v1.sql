-- Generated from Profil MAPP 202610120001_forced_choice_duels_v1.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- Additive support for Profil MAPP 36 natural duels + 12 pressure statements.
-- Historical questionnaire, answer and result rows are not updated or deleted.

insert into mapp.answer_scales(code, name)
values ('agreement-4', 'Accord en quatre positions')
on conflict (code) do nothing;

insert into mapp.answer_options(scale_id, value, label, position)
select scale.id, item.value, item.label, item.value
from mapp.answer_scales scale
cross join (values
  (1, 'Pas du tout d''accord'),
  (2, 'Plutôt pas d''accord'),
  (3, 'Plutôt d''accord'),
  (4, 'Tout à fait d''accord')
) item(value, label)
where scale.code = 'agreement-4'
on conflict (scale_id, value) do nothing;

create table mapp.attempt_duel_answers (
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  question_id uuid not null references mapp.questions(id) on delete restrict,
  selected_option_id uuid not null references mapp.question_options(id) on delete restrict,
  client_sequence bigint not null default 0,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create index attempt_duel_answers_attempt_idx on mapp.attempt_duel_answers(attempt_id);
alter table mapp.attempt_duel_answers enable row level security;
create policy duel_answers_read_own on mapp.attempt_duel_answers for select to authenticated using (
  exists (select 1 from mapp.attempts a where a.id=attempt_id and mapp_private.owns_participant(a.participant_id))
);
grant select on mapp.attempt_duel_answers to authenticated;
create trigger finalized_duel_answers_immutable before insert or update or delete on mapp.attempt_duel_answers
for each row execute function mapp_private.prevent_finalized_attempt_change();

alter table mapp.result_dimension_metrics add column if not exists vote_count integer;
alter table mapp.result_dimension_metrics add column if not exists pressure_raw_intensity integer;
alter table mapp.result_dimension_metrics add column if not exists independent_intensity numeric(12,6);
alter table mapp.result_tie_break_runs add column if not exists resolution_state text check (resolution_state in ('unique','persistent'));
alter table mapp.result_tie_break_runs add column if not exists persistent_codes text[];

create table mapp.result_scoring_context_versions (
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  context mapp.question_context not null check (context in ('natural','under_pressure')),
  version text not null,
  source_schema_version text not null,
  created_at timestamptz not null default now(),
  primary key (result_revision_id, context)
);
alter table mapp.result_scoring_context_versions enable row level security;
create policy scoring_context_versions_read_own on mapp.result_scoring_context_versions for select to authenticated using (
  exists (select 1 from mapp.result_revisions r join mapp.attempts a on a.id=r.attempt_id where r.id=result_revision_id and mapp_private.owns_participant(a.participant_id))
);
grant select on mapp.result_scoring_context_versions to authenticated;

create or replace function mapp.save_forced_choice_duel_answer(
  target_attempt uuid,
  target_question uuid,
  target_option uuid,
  target_sequence bigint
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare owned boolean;
begin
  select mapp_private.owns_participant(a.participant_id) and a.status='in_progress' into owned
  from mapp.attempts a where a.id=target_attempt;
  if not coalesce(owned,false) then raise exception 'Attempt unavailable'; end if;
  if not exists (select 1 from mapp.attempt_question_order where attempt_id=target_attempt and question_id=target_question) then raise exception 'Question is not part of attempt'; end if;
  if not exists (select 1 from mapp.question_options where id=target_option and question_id=target_question) then raise exception 'Option is not part of question'; end if;
  insert into mapp.attempt_duel_answers(attempt_id,question_id,selected_option_id,client_sequence)
  values(target_attempt,target_question,target_option,target_sequence)
  on conflict(attempt_id,question_id) do update set selected_option_id=excluded.selected_option_id,
    client_sequence=excluded.client_sequence,answered_at=now(),updated_at=now()
  where mapp.attempt_duel_answers.client_sequence <= excluded.client_sequence;
  update mapp.attempts set last_saved_at=now() where id=target_attempt;
  return true;
end $$;
revoke all on function mapp.save_forced_choice_duel_answer(uuid,uuid,uuid,bigint) from public,anon;
grant execute on function mapp.save_forced_choice_duel_answer(uuid,uuid,uuid,bigint) to authenticated;

create or replace function mapp.finalize_forced_choice_v1_attempt(target_attempt uuid, result_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a mapp.attempts; score mapp.scoring_versions; result_id uuid; natural_count integer; pressure_count integer;
begin
  select * into a from mapp.attempts where id=target_attempt for update;
  if a.id is null then raise exception 'Attempt unavailable'; end if;
  select * into score from mapp.scoring_versions where id=a.scoring_version_id;
  if score.code <> 'profil-mapp-duels-v1.0.0' or score.algorithm <> 'mapp-pairwise-duels-v1' then raise exception 'Pairwise scoring version required'; end if;
  if a.status='completed' then select id into result_id from mapp.result_revisions where attempt_id=target_attempt order by revision desc limit 1; return result_id; end if;
  if a.status <> 'in_progress' then raise exception 'Attempt cannot be finalized'; end if;
  select count(*) into natural_count from mapp.attempt_duel_answers where attempt_id=target_attempt;
  select count(*) into pressure_count from mapp.attempt_answers ans join mapp.questions q on q.id=ans.question_id where ans.attempt_id=target_attempt and q.metadata->>'mapp_kind'='pressure';
  if natural_count <> 36 or pressure_count <> 12 then raise exception 'Questionnaire requires 36 natural duels and 12 pressure answers'; end if;
  if result_payload->>'questionnaireVersion' <> 'profil-mapp-duels-v1.0.0' or result_payload->>'scoringVersion' <> 'profil-mapp-duels-v1.0.0' then raise exception 'Payload version mismatch'; end if;

  insert into mapp.result_revisions(attempt_id,revision,questionnaire_version_id,scoring_version_id,reason,computed_by)
  values(target_attempt,1,a.questionnaire_version_id,a.scoring_version_id,'initial',(select auth.uid())) returning id into result_id;

  insert into mapp.result_dimension_metrics(result_revision_id,context,dimension_code,vote_count,pressure_raw_intensity,independent_intensity,display_percentage,is_indeterminate)
  select result_id,(item->>'context')::mapp.question_context,item->>'dimensionCode',nullif(item->>'voteCount','')::integer,
    nullif(item->>'pressureRawIntensity','')::integer,nullif(item->>'independentIntensity','')::numeric,
    nullif(item->>'displayPercentage','')::numeric,coalesce((item->>'isIndeterminate')::boolean,false)
  from jsonb_array_elements(result_payload->'metrics') item;

  insert into mapp.result_dimension_scores(result_revision_id,dimension_id,context,raw_score,max_score,percentage)
  select result_id,d.id,m.context,case when m.context='natural' then m.vote_count else m.pressure_raw_intensity end,
    case when m.context='natural' then 36 else 9 end,coalesce(m.display_percentage,0)
  from mapp.result_dimension_metrics m join mapp.dimensions d on d.code=case m.dimension_code when 'D' then 'conquerant' when 'I' then 'communiquant' when 'S' then 'facilitateur' when 'C' then 'analyste' end
  where m.result_revision_id=result_id;

  insert into mapp.result_rankings(result_revision_id,context,scoring_version,basis,initial_order,primary_candidates,secondary_candidates,resolved_order,primary_code,secondary_code,tie_break_required,is_indeterminate)
  select result_id,(ranking->>'context')::mapp.question_context,ranking->>'contextScoringVersion',ranking->'basis',array(select jsonb_array_elements_text(ranking->'initialOrder')),
    array(select jsonb_array_elements_text(ranking->'primaryCandidates')),array(select jsonb_array_elements_text(ranking->'secondaryCandidates')),
    case when ranking ? 'resolvedOrder' then array(select jsonb_array_elements_text(ranking->'resolvedOrder')) else null end,
    nullif(ranking->>'primaryCode',''),nullif(ranking->>'secondaryCode',''),(ranking->>'tieBreakRequired')::boolean,coalesce((ranking->>'isIndeterminate')::boolean,false)
  from jsonb_array_elements(result_payload->'rankings') ranking;

  insert into mapp.result_scoring_context_versions(result_revision_id,context,version,source_schema_version)
  values (result_id,'natural','natural-duels-v1.0.0','mapp-experimental-forced-choice-v1'),
         (result_id,'under_pressure','pressure-12-v1.0.0','mapp-experimental-forced-choice-v1');

  update mapp.attempts set status='completed',completed_at=now(),updated_at=now() where id=target_attempt;
  insert into mapp.attempt_events(attempt_id,event_type,metadata) values(target_attempt,'completed',jsonb_build_object('scoring_version','profil-mapp-duels-v1.0.0'));
  return result_id;
end $$;
revoke all on function mapp.finalize_forced_choice_v1_attempt(uuid,jsonb) from public,anon,authenticated;
grant execute on function mapp.finalize_forced_choice_v1_attempt(uuid,jsonb) to service_role;

create or replace function mapp.publish_forced_choice_v1_versions(target_questionnaire_version uuid, target_scoring_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare natural_count integer; option_count integer; pressure_count integer; score mapp.scoring_versions;
begin
  select * into score from mapp.scoring_versions where id=target_scoring_version and questionnaire_version_id=target_questionnaire_version for update;
  if score.id is null or score.code<>'profil-mapp-duels-v1.0.0' or score.algorithm<>'mapp-pairwise-duels-v1' then raise exception 'Pairwise versions required'; end if;
  select count(*) into natural_count from mapp.questions where questionnaire_version_id=target_questionnaire_version and metadata->>'mapp_kind'='natural_duel';
  select count(*) into pressure_count from mapp.questions where questionnaire_version_id=target_questionnaire_version and metadata->>'mapp_kind'='pressure';
  select count(*) into option_count from mapp.question_options o join mapp.questions q on q.id=o.question_id where q.questionnaire_version_id=target_questionnaire_version and q.metadata->>'mapp_kind'='natural_duel';
  if natural_count<>36 or option_count<>72 or pressure_count<>12 then raise exception 'Publication requires 36 duels, 72 options and 12 pressure questions'; end if;
  update mapp.questionnaire_versions set status='published',published_at=now() where id=target_questionnaire_version and status='draft';
  update mapp.scoring_versions set status='published',published_at=now() where id=target_scoring_version and status='draft';
end $$;
revoke all on function mapp.publish_forced_choice_v1_versions(uuid,uuid) from public,anon,authenticated;
grant execute on function mapp.publish_forced_choice_v1_versions(uuid,uuid) to service_role;
