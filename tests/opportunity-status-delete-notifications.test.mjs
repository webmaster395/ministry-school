import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("les affectations et les créations sont idempotentes", () => {
  const migration = source("supabase/migrations/20261029230000_opportunity_status_delete_and_notification_dedupe.sql");
  const form = source("src/components/admin/OpportunityCreateForm.tsx");
  const action = source("src/app/etudiant/services/actions.ts");
  assert.match(migration, /announcements_unique_opportunity_assignment/);
  assert.match(migration, /claim_opportunity_creation/);
  assert.match(form, /useFormStatus/);
  assert.match(form, /creation_token/);
  assert.match(action, /bind_opportunity_creation/);
});

test("la gestion affiche les cinq états et expose la suppression sécurisée", () => {
  const list = source("src/app/gestion/projets-formations/page.tsx");
  const detail = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const migration = source("supabase/migrations/20261029230000_opportunity_status_delete_and_notification_dedupe.sql");
  for (const label of ["Brouillon", "Soumis à validation", "Publié", "Passé"]) assert.match(list, new RegExp(label));
  assert.match(detail, /DeleteOpportunityButton/);
  assert.match(migration, /delete_opportunity_admin/);
});

test("l'ancien intitulé Services & Projets n'est plus visible", () => {
  const quick = source("src/components/admin/QuickCourseForm.tsx");
  const stats = source("src/components/admin/StatisticsTab.tsx");
  const student = source("src/app/etudiant/services/page.tsx");
  assert.doesNotMatch(quick, /Services & Projets/);
  assert.doesNotMatch(stats, /Services & Projets/);
  assert.match(student, /projets et formations validés/);
});
