import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la liste personnelle ne montre que les affectations et la vue globale est explicite", () => {
  const page = source("src/app/gestion/projets-formations/page.tsx");
  assert.match(page, /globalScope \? rows : rows\.filter\(\(row\) => rights\.assignments\.has\(row\.id\)\)/);
  assert.match(page, /\["admin", "super"\]\.includes\(query\.scope/);
  assert.match(page, /Uniquement les éléments auxquels vous êtes affecté/);
});

test("l'accès direct exige une affectation et l'écriture contributeur est explicite", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const form = source("src/components/OpportunityEditForms.tsx");
  assert.match(page, /if \(!responsibility\) redirect\("\/gestion\/projets-formations"\)/);
  assert.match(page, /rights\.editableAssignments\.has\(id\)/);
  assert.match(page, /superAdminView \? <DeleteOpportunityButton/);
  assert.match(page, /!globalScope && responsibility === "manager" \? <ArchiveOpportunityRequest/);
  assert.match(form, /canEdit: boolean/);
});

test("la base sépare lecture, écriture, soumission et suppression", () => {
  const migration = source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  const actions = source("src/app/etudiant/services/actions.ts");
  assert.match(migration, /can_edit_opportunity[\s\S]*?assignment\.can_edit/);
  assert.match(migration, /can_submit_opportunity[\s\S]*?responsibility = 'manager'/);
  assert.match(migration, /delete_opportunity_admin[\s\S]*?is_super_admin/);
  assert.match(actions, /\.eq\("id", id\)\.select\("id"\)/);
  assert.match(actions, /if \(!updated\?\.length\)/);
});
