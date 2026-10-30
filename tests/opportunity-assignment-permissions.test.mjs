import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la liste de gestion ne montre que les affectations sauf pour un administrateur", () => {
  const page = source("src/app/gestion/projets-formations/page.tsx");
  assert.match(page, /rights\.admin \? rows : rows\.filter\(\(row\) => rights\.assignments\.has\(row\.id\)\)/);
  assert.match(page, /Uniquement les éléments auxquels vous êtes affecté/);
});

test("l'accès direct exige une affectation et les deux rôles peuvent gérer", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const form = source("src/components/OpportunityEditForms.tsx");
  assert.match(page, /if \(!responsibility\) redirect\("\/gestion\/projets-formations"\)/);
  assert.match(page, /responsibility === "contributor"/);
  assert.match(form, /responsibility === "contributor"/);
  assert.doesNotMatch(page, /rights\.admin && <DeleteOpportunityButton/);
});

test("la base limite modification et suppression aux affectations ou à l'admin global", () => {
  const migration = source("supabase/migrations/20261030080000_opportunity_assignment_permissions.sql");
  const actions = source("src/app/etudiant/services/actions.ts");
  assert.match(migration, /public\.is_platform_admin\(p_user\) or exists/);
  assert.match(migration, /a\.responsibility in \('manager', 'contributor'\)/);
  assert.match(migration, /if not public\.can_contribute_opportunity\(p_opportunity\)/);
  assert.match(actions, /\.eq\("id", id\)\.select\("id"\)/);
  assert.match(actions, /if \(!updated\?\.length\)/);
});
