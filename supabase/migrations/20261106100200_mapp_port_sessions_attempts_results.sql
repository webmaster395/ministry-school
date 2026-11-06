-- Generated from Profil MAPP 202610070003_sessions_attempts_results.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id),
  scoring_version_id uuid not null references mapp.scoring_versions(id),
  status mapp.record_status not null default 'draft',
  consent_version_id uuid references mapp.consent_versions(id),
  consent_required boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mapp.participant_consents
  add constraint participant_consents_session_fk foreign key (session_id) references mapp.assessment_sessions(id) on delete set null;

create table mapp.session_field_definitions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references mapp.assessment_sessions(id) on delete cascade,
  field_code text not null check (field_code in ('first_name', 'last_name', 'email', 'job_title', 'team_label', 'consent')),
  requirement mapp.field_requirement not null default 'hidden',
  position integer not null,
  unique (session_id, field_code),
  unique (session_id, position)
);

create table mapp.session_access_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references mapp.assessment_sessions(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table mapp.attempts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references mapp.participants(id) on delete restrict,
  session_id uuid references mapp.assessment_sessions(id) on delete restrict,
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id) on delete restrict,
  scoring_version_id uuid not null references mapp.scoring_versions(id) on delete restrict,
  status mapp.attempt_status not null default 'in_progress',
  source text not null default 'session',
  order_seed text not null,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table mapp.attempt_question_order (
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  question_id uuid not null references mapp.questions(id) on delete restrict,
  position integer not null,
  primary key (attempt_id, question_id),
  unique (attempt_id, position)
);

create table mapp.attempt_answers (
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  question_id uuid not null references mapp.questions(id) on delete restrict,
  answer_value integer not null check (answer_value between 1 and 5),
  client_sequence bigint not null default 0,
  answered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

create table mapp.attempt_events (
  id bigint generated always as identity primary key,
  attempt_id uuid not null references mapp.attempts(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table mapp.result_revisions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references mapp.attempts(id) on delete restrict,
  revision integer not null check (revision > 0),
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id),
  scoring_version_id uuid not null references mapp.scoring_versions(id),
  restitution_version_id uuid,
  reason text not null default 'initial',
  computed_at timestamptz not null default now(),
  computed_by uuid references auth.users(id),
  unique (attempt_id, revision)
);

create table mapp.result_dimension_scores (
  result_revision_id uuid not null references mapp.result_revisions(id) on delete cascade,
  dimension_id uuid not null references mapp.dimensions(id),
  context mapp.question_context not null,
  raw_score numeric(12,4) not null,
  max_score numeric(12,4) not null,
  percentage numeric(8,4) not null,
  primary key (result_revision_id, dimension_id, context)
);

create table mapp.result_classifications (
  result_revision_id uuid primary key references mapp.result_revisions(id) on delete cascade,
  primary_dimension_id uuid references mapp.dimensions(id),
  secondary_dimension_id uuid references mapp.dimensions(id),
  classification_code text
);

create table mapp.profiles (
  id uuid primary key default gen_random_uuid(),
  dimension_id uuid not null unique references mapp.dimensions(id),
  code text not null unique,
  name text not null
);

create table mapp.profile_combinations (
  id uuid primary key default gen_random_uuid(),
  primary_profile_id uuid not null references mapp.profiles(id),
  secondary_profile_id uuid not null references mapp.profiles(id),
  code text not null unique,
  unique (primary_profile_id, secondary_profile_id)
);

create table mapp.restitution_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  status mapp.record_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table mapp.restitution_blocks (
  id uuid primary key default gen_random_uuid(),
  restitution_version_id uuid not null references mapp.restitution_versions(id) on delete cascade,
  target_type text not null check (target_type in ('profile', 'combination', 'result', 'generic')),
  target_id uuid,
  block_key text not null,
  title text,
  body text,
  position integer not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (restitution_version_id, target_type, target_id, block_key)
);

alter table mapp.result_revisions
  add constraint result_revisions_restitution_version_fk
  foreign key (restitution_version_id) references mapp.restitution_versions(id);

create trigger sessions_updated_at before update on mapp.assessment_sessions
for each row execute function mapp_private.set_updated_at();
create trigger attempts_updated_at before update on mapp.attempts
for each row execute function mapp_private.set_updated_at();

create index attempts_participant_status_idx on mapp.attempts(participant_id, status, started_at desc);
create index attempts_session_status_idx on mapp.attempts(session_id, status, completed_at);
create index answers_attempt_idx on mapp.attempt_answers(attempt_id);
create index results_attempt_idx on mapp.result_revisions(attempt_id, revision desc);

create or replace function mapp_private.prevent_finalized_attempt_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare current_status mapp.attempt_status;
begin
  select status into current_status from mapp.attempts where id = coalesce(new.attempt_id, old.attempt_id);
  if current_status = 'completed' then
    raise exception 'A completed attempt is immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger finalized_answers_immutable before insert or update or delete on mapp.attempt_answers
for each row execute function mapp_private.prevent_finalized_attempt_change();
