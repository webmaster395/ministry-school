-- Generated from Profil MAPP 202610070007_integrity_and_usage.sql.
-- Do not edit this generated file; update the source migration or transformer.
create or replace function mapp_private.prevent_published_questionnaire_child_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare parent_status mapp.record_status;
declare version_id uuid;
begin
  version_id := coalesce(new.questionnaire_version_id, old.questionnaire_version_id);
  select status into parent_status from mapp.questionnaire_versions where id = version_id;
  if parent_status = 'published' then raise exception 'Children of a published questionnaire are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function mapp_private.prevent_published_scoring_child_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare parent_status mapp.record_status;
declare version_id uuid;
begin
  version_id := coalesce(new.scoring_version_id, old.scoring_version_id);
  select status into parent_status from mapp.scoring_versions where id = version_id;
  if parent_status = 'published' then raise exception 'Rules of a published scoring are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger published_sections_immutable before insert or update or delete on mapp.questionnaire_sections
for each row execute function mapp_private.prevent_published_questionnaire_child_mutation();
create trigger published_questions_immutable before insert or update or delete on mapp.questions
for each row execute function mapp_private.prevent_published_questionnaire_child_mutation();
create trigger published_scoring_rules_immutable before insert or update or delete on mapp.scoring_question_rules
for each row execute function mapp_private.prevent_published_scoring_child_mutation();
create trigger published_scoring_thresholds_immutable before insert or update or delete on mapp.scoring_thresholds
for each row execute function mapp_private.prevent_published_scoring_child_mutation();

create or replace view mapp.database_usage_estimate
with (security_invoker = true)
as
select
  pg_database_size(current_database()) as database_bytes,
  (select count(*) from mapp.participants) as participants,
  (select count(*) from mapp.attempts) as attempts,
  (select count(*) from mapp.attempt_answers) as answers,
  (select count(*) from mapp.result_revisions) as result_revisions,
  now() as measured_at;

revoke all on mapp.database_usage_estimate from public, anon, authenticated;
grant select on mapp.database_usage_estimate to service_role;

comment on view mapp.database_usage_estimate is 'Low-cost DB footprint counters for Free-plan monitoring; service role only.';
