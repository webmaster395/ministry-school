import { readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync(new URL("../src/data/editorial/profil-mapp-bibliotheque-integrale-v10.json", import.meta.url))).questionnaireSource;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;
const natural = source.questions.filter((question) => question.section === "natural");

const questions = source.questions.map((question) => `  insert into mapp.questions(questionnaire_version_id, section_id, answer_scale_id, external_key, prompt, editorial_position, metadata)
  values (questionnaire_version, ${question.section === "natural" ? "natural_section" : "pressure_section"}, answer_scale, ${quote(question.externalKey)}, ${quote(question.text)}, ${question.order}, ${json({ source_order: question.sourceOrder, inverted: question.inverted, weight: question.weight })});`).join("\n");

const rules = natural.map((question) => `  insert into mapp.scoring_question_rules(scoring_version_id, question_id, dimension_id, direction, weight)
  select scoring_version, question.id, dimension.id, ${question.inverted ? -1 : 1}, ${question.weight}
  from mapp.questions question, mapp.dimensions dimension
  where question.questionnaire_version_id = questionnaire_version
    and question.external_key = ${quote(question.externalKey)}
    and dimension.code = ${quote(question.dimension)};`).join("\n");

const migration = `begin;

-- Contenu officiel issu de la bibliothèque éditoriale validée. Cette migration
-- crée uniquement la version absente et ne remplace aucune donnée existante.
do $$
declare
  questionnaire uuid;
  questionnaire_version uuid;
  scoring_version uuid;
  answer_scale uuid;
  natural_section uuid;
  pressure_section uuid;
  target_session uuid;
begin
  insert into mapp.questionnaires(code, name, description)
  values ('profil-mapp', 'Profil MAPP', 'Questionnaire officiel Ministry School')
  on conflict (code) do nothing;
  select id into questionnaire from mapp.questionnaires where code = 'profil-mapp';

  select id into questionnaire_version from mapp.questionnaire_versions
  where questionnaire_id = questionnaire and version = 3;

  if questionnaire_version is null then
    insert into mapp.questionnaire_versions(questionnaire_id, version, status, publication_rules, order_strategy)
    values (questionnaire, 3, 'draft', ${json(source.publicationRules)}, 'editorial')
    returning id into questionnaire_version;

    select id into answer_scale from mapp.answer_scales where code = 'truth-5';
    if answer_scale is null then raise exception 'MAPP answer scale truth-5 is missing'; end if;

    insert into mapp.questionnaire_sections(questionnaire_version_id, code, title, context, position)
    values (questionnaire_version, 'natural', 'Comportement naturel', 'natural', 1)
    returning id into natural_section;
    insert into mapp.questionnaire_sections(questionnaire_version_id, code, title, context, position)
    values (questionnaire_version, 'under_pressure', 'Comportement sous pression', 'under_pressure', 2)
    returning id into pressure_section;

${questions}

    insert into mapp.scoring_versions(questionnaire_version_id, code, version, status, algorithm, config)
    values (questionnaire_version, 'natural-v3', 3, 'draft', 'weighted-likert',
      ${json({ expected_natural_inverted: source.publicationRules.natural_inverted_questions, expected_natural_per_dimension: source.publicationRules.natural_questions_per_dimension, expected_natural_dimensions: 4 })})
    returning id into scoring_version;

${rules}

    perform mapp.publish_questionnaire_version(questionnaire_version);
    perform mapp.publish_scoring_version(scoring_version);
  else
    select id into scoring_version from mapp.scoring_versions
    where questionnaire_version_id = questionnaire_version and code = 'natural-v3' and version = 3;
    if scoring_version is null then
      raise exception 'MAPP questionnaire v3 exists without its expected scoring version';
    end if;
  end if;

  insert into mapp.assessment_sessions(code, title, questionnaire_version_id, scoring_version_id, status, capacity)
  values ('ministry-mapp-2026-11-07', 'Profil MAPP Ministry School', questionnaire_version, scoring_version, 'published', 600)
  on conflict (code) do nothing;
  select id into target_session from mapp.assessment_sessions where code = 'ministry-mapp-2026-11-07';

  if not exists (
    select 1 from mapp.assessment_sessions
    where id = target_session
      and questionnaire_version_id = questionnaire_version
      and scoring_version_id = scoring_version
      and status = 'published'
  ) then
    raise exception 'Existing Ministry MAPP session is incompatible';
  end if;

  -- La session technique est sélectionnée, mais la publication étudiante reste
  -- entièrement pilotée par app_catalog et la porte serveur de la migration 140000.
  update mapp.native_settings
  set assessment_session_id = target_session, enabled = true, updated_at = now()
  where singleton;
end;
$$;

commit;
`;

writeFileSync(new URL("../supabase/migrations/20261106141000_mapp_official_questionnaire_session.sql", import.meta.url), migration);
