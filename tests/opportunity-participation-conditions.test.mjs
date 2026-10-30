import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la création et la modification partagent les conditions de participation", () => {
  const create = source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = source("src/components/OpportunityEditForms.tsx");
  const fields = source("src/components/ParticipationConditionsFields.tsx");
  assert.match(create, /<ParticipationConditionsFields/);
  assert.match(edit, /<ParticipationConditionsFields/);
  assert.match(fields, /name="participation_audience" value="all"/);
  assert.match(fields, /name="participation_audience" value="specific"/);
  assert.match(fields, /name="participation_audience_details" required/);
  assert.match(fields, /name="participation_prerequisites_required"/);
});

test("le public spécifique et les prérequis nécessaires sont contrôlés côté serveur", () => {
  const actions = source("src/app/etudiant/services/actions.ts");
  const migration = source("supabase/migrations/20261030260000_opportunity_participation_conditions.sql");
  assert.match(actions, /participationConditionsFrom\(formData\)/);
  assert.match(actions, /set_opportunity_participation_conditions/);
  assert.match(migration, /PARTICIPATION_AUDIENCE_DETAILS_REQUIRED/);
  assert.match(migration, /PARTICIPATION_PREREQUISITES_REQUIRED/);
  assert.match(migration, /opportunity_missing_participation_fields/);
  assert.match(migration, /array_remove\(public\.opportunity_missing_required_fields\(p_opportunity\),'prérequis'\)/);
  assert.doesNotMatch(migration, /insert into public\.notifications/);
});

test("la fiche étudiante affiche seulement les conditions pertinentes avant les séances", () => {
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  const summary = source("src/components/ParticipationConditionsSummary.tsx");
  const conditionsIndex = student.indexOf("Conditions de participation");
  const sessionsIndex = student.indexOf("Les séances");
  assert.ok(conditionsIndex > -1 && conditionsIndex < sessionsIndex);
  assert.match(summary, /Ouvert à tous/);
  assert.match(summary, /Réservé à : \$\{audienceDetails\}/);
  assert.match(summary, /prerequisitesRequired &&/);
  assert.match(summary, /Prérequis nécessaires/);
});

test("les fiches existantes restent ouvertes à tous sans prérequis exigé", () => {
  const migration = source("supabase/migrations/20261030260000_opportunity_participation_conditions.sql");
  assert.match(migration, /participation_audience text not null default 'all'/);
  assert.match(migration, /participation_prerequisites_required boolean not null default false/);
});
