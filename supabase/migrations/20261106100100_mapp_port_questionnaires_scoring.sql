-- Generated from Profil MAPP 202610070002_questionnaires_scoring.sql.
-- Do not edit this generated file; update the source migration or transformer.
create table mapp.dimensions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  color text not null,
  biblical_figure text,
  position integer not null,
  created_at timestamptz not null default now()
);

create table mapp.answer_scales (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table mapp.answer_options (
  id uuid primary key default gen_random_uuid(),
  scale_id uuid not null references mapp.answer_scales(id) on delete cascade,
  value integer not null,
  label text not null,
  position integer not null,
  unique (scale_id, value),
  unique (scale_id, position)
);

create table mapp.questionnaires (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table mapp.questionnaire_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references mapp.questionnaires(id) on delete cascade,
  version integer not null check (version > 0),
  status mapp.record_status not null default 'draft',
  publication_rules jsonb not null default '{}'::jsonb,
  order_strategy text not null default 'editorial' check (order_strategy in ('editorial', 'deterministic_rules')),
  order_rules jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (questionnaire_id, version)
);

create table mapp.questionnaire_sections (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id) on delete cascade,
  code text not null,
  title text not null,
  context mapp.question_context not null,
  position integer not null,
  unique (questionnaire_version_id, code),
  unique (questionnaire_version_id, position)
);

create table mapp.questions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id) on delete cascade,
  section_id uuid not null references mapp.questionnaire_sections(id) on delete cascade,
  answer_scale_id uuid not null references mapp.answer_scales(id),
  external_key text not null,
  prompt text not null,
  editorial_position integer not null,
  metadata jsonb not null default '{}'::jsonb,
  unique (questionnaire_version_id, external_key),
  unique (questionnaire_version_id, editorial_position)
);

create table mapp.scoring_versions (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references mapp.questionnaire_versions(id) on delete cascade,
  code text not null,
  version integer not null check (version > 0),
  status mapp.record_status not null default 'draft',
  algorithm text not null,
  config jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (questionnaire_version_id, code, version)
);

create table mapp.scoring_question_rules (
  id uuid primary key default gen_random_uuid(),
  scoring_version_id uuid not null references mapp.scoring_versions(id) on delete cascade,
  question_id uuid not null references mapp.questions(id) on delete cascade,
  dimension_id uuid not null references mapp.dimensions(id),
  direction smallint not null default 1 check (direction in (-1, 1)),
  weight numeric(8,4) not null default 1,
  points_map jsonb,
  unique (scoring_version_id, question_id, dimension_id)
);

create table mapp.scoring_thresholds (
  id uuid primary key default gen_random_uuid(),
  scoring_version_id uuid not null references mapp.scoring_versions(id) on delete cascade,
  kind text not null,
  config jsonb not null,
  unique (scoring_version_id, kind)
);

create trigger questionnaire_versions_immutable before update or delete on mapp.questionnaire_versions
for each row execute function mapp_private.prevent_published_mutation();
create trigger scoring_versions_immutable before update or delete on mapp.scoring_versions
for each row execute function mapp_private.prevent_published_mutation();

create index questions_version_section_idx on mapp.questions(questionnaire_version_id, section_id, editorial_position);
create index scoring_rules_version_question_idx on mapp.scoring_question_rules(scoring_version_id, question_id);

comment on column mapp.questionnaire_versions.publication_rules is 'Contraintes propres à cette version; le moteur ne fixe aucun nombre global.';
comment on column mapp.scoring_question_rules.direction is '-1 indique une règle inversée pour cette version de scoring.';
