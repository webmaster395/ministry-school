-- Generated from Profil MAPP 202610130001_hybrid_44.sql.
-- Do not edit this generated file; update the source migration or transformer.
-- Additive preparation for Profil MAPP hybrid 44. No historical row is changed.
alter table mapp.result_dimension_metrics add column if not exists pre_tie_break_score integer;
alter table mapp.result_dimension_metrics add column if not exists post_tie_break_score integer;

create table if not exists mapp.result_profile_choice_answers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references mapp.result_tie_break_runs(id) on delete cascade,
  sequence integer not null check (sequence between 1 and 2),
  candidate_codes text[] not null,
  selected_code text not null check (selected_code in ('D','I','S','C')),
  question_version text not null,
  created_at timestamptz not null default now(),
  unique(run_id,sequence),
  check (selected_code = any(candidate_codes))
);
alter table mapp.result_profile_choice_answers enable row level security;
create policy hybrid_choice_answers_read_own on mapp.result_profile_choice_answers for select to authenticated using (
  exists (select 1 from mapp.result_tie_break_runs run join mapp.result_rankings ranking on ranking.id=run.result_ranking_id join mapp.result_revisions r on r.id=ranking.result_revision_id join mapp.attempts a on a.id=r.attempt_id where run.id=run_id and mapp_private.owns_participant(a.participant_id))
);
grant select on mapp.result_profile_choice_answers to authenticated;

create or replace function mapp.finalize_hybrid_44_attempt(target_attempt uuid, result_payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare a mapp.attempts; score mapp.scoring_versions; result_id uuid; duel_count integer; scale_count integer;
begin
  select * into a from mapp.attempts where id=target_attempt for update;
  if a.id is null then raise exception 'Attempt unavailable'; end if;
  select * into score from mapp.scoring_versions where id=a.scoring_version_id;
  if score.code <> 'profil-mapp-hybrid-44-v1.0.0' or score.algorithm <> 'mapp-hybrid-44-v1' then raise exception 'Hybrid 44 scoring required'; end if;
  if a.status='completed' then select id into result_id from mapp.result_revisions where attempt_id=target_attempt order by revision desc limit 1; return result_id; end if;
  if a.status <> 'in_progress' then raise exception 'Attempt cannot be finalized'; end if;
  select count(*) into duel_count from mapp.attempt_duel_answers where attempt_id=target_attempt;
  select count(*) into scale_count from mapp.attempt_answers ans join mapp.questions q on q.id=ans.question_id where ans.attempt_id=target_attempt and q.metadata->>'mapp_kind'='natural_likert';
  if duel_count<>36 or scale_count<>8 then raise exception 'Hybrid 44 requires 36 duel answers and 8 scale answers'; end if;
  if result_payload->>'questionnaireVersion'<>'profil-mapp-hybrid-44-v1.0.0' or result_payload->>'scoringVersion'<>'profil-mapp-hybrid-44-v1.0.0' then raise exception 'Payload version mismatch'; end if;
  insert into mapp.result_revisions(attempt_id,revision,questionnaire_version_id,scoring_version_id,reason,computed_by) values(target_attempt,1,a.questionnaire_version_id,a.scoring_version_id,'initial',(select auth.uid())) returning id into result_id;
  insert into mapp.result_dimension_metrics(result_revision_id,context,dimension_code,vote_count,display_percentage,is_indeterminate,pre_tie_break_score,post_tie_break_score)
  select result_id,(item->>'context')::mapp.question_context,item->>'dimensionCode',(item->>'rawScore')::integer,(item->>'displayPercentage')::numeric,false,(item->>'rawScore')::integer,(item->>'rawScore')::integer from jsonb_array_elements(result_payload->'metrics') item;
  insert into mapp.result_dimension_scores(result_revision_id,dimension_id,context,raw_score,max_score,percentage)
  select result_id,d.id,m.context,m.vote_count,case when m.context='natural' then 48 else 12 end,m.display_percentage from mapp.result_dimension_metrics m join mapp.dimensions d on d.code=case m.dimension_code when 'D' then 'conquerant' when 'I' then 'communiquant' when 'S' then 'facilitateur' when 'C' then 'analyste' end where m.result_revision_id=result_id;
  insert into mapp.result_rankings(result_revision_id,context,scoring_version,basis,initial_order,primary_candidates,secondary_candidates,resolved_order,primary_code,secondary_code,tie_break_required,is_indeterminate)
  select result_id,(item->>'context')::mapp.question_context,item->>'contextScoringVersion',item->'basis',array(select jsonb_array_elements_text(item->'initialOrder')),array(select jsonb_array_elements_text(item->'primaryCandidates')),array(select jsonb_array_elements_text(item->'secondaryCandidates')),case when (item->>'tieBreakRequired')::boolean then null else array(select jsonb_array_elements_text(item->'initialOrder')) end,case when (item->>'tieBreakRequired')::boolean then null else item->'initialOrder'->>0 end,case when (item->>'tieBreakRequired')::boolean then null else item->'initialOrder'->>1 end,(item->>'tieBreakRequired')::boolean,false from jsonb_array_elements(result_payload->'rankings') item;
  insert into mapp.result_scoring_context_versions(result_revision_id,context,version,source_schema_version) values(result_id,'natural','natural-hybrid-32-v1.0.0','1.0'),(result_id,'under_pressure','pressure-duels-12-v1.0.0','1.0');
  update mapp.attempts set status='completed',completed_at=now(),updated_at=now() where id=target_attempt;
  insert into mapp.attempt_events(attempt_id,event_type,metadata) values(target_attempt,'completed',jsonb_build_object('scoring_version','profil-mapp-hybrid-44-v1.0.0'));
  return result_id;
end $$;
revoke all on function mapp.finalize_hybrid_44_attempt(uuid,jsonb) from public,anon,authenticated;
grant execute on function mapp.finalize_hybrid_44_attempt(uuid,jsonb) to service_role;

create or replace function mapp.publish_hybrid_44_versions(target_questionnaire_version uuid, target_scoring_version uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare score mapp.scoring_versions; natural_duels integer; natural_scales integer; pressure_duels integer; option_count integer;
begin
  select * into score from mapp.scoring_versions where id=target_scoring_version and questionnaire_version_id=target_questionnaire_version for update;
  if score.id is null or score.code<>'profil-mapp-hybrid-44-v1.0.0' or score.algorithm<>'mapp-hybrid-44-v1' then raise exception 'Hybrid 44 versions required'; end if;
  select count(*) into natural_duels from mapp.questions where questionnaire_version_id=target_questionnaire_version and metadata->>'mapp_kind'='natural_duel';
  select count(*) into natural_scales from mapp.questions where questionnaire_version_id=target_questionnaire_version and metadata->>'mapp_kind'='natural_likert';
  select count(*) into pressure_duels from mapp.questions where questionnaire_version_id=target_questionnaire_version and metadata->>'mapp_kind'='pressure_duel';
  select count(*) into option_count from mapp.question_options option join mapp.questions question on question.id=option.question_id where question.questionnaire_version_id=target_questionnaire_version and question.metadata->>'mapp_kind' in ('natural_duel','pressure_duel');
  if natural_duels<>24 or natural_scales<>8 or pressure_duels<>12 or option_count<>72 then raise exception 'Publication requires 24 natural duels, 8 natural scales, 12 pressure duels and 72 options'; end if;
  update mapp.questionnaire_versions set status='published',published_at=now() where id=target_questionnaire_version and status='draft';
  update mapp.scoring_versions set status='published',published_at=now() where id=target_scoring_version and status='draft';
end $$;
revoke all on function mapp.publish_hybrid_44_versions(uuid,uuid) from public,anon,authenticated;
grant execute on function mapp.publish_hybrid_44_versions(uuid,uuid) to service_role;
