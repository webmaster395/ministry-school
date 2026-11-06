import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mon identité possède une seule entrée de navigation et aucune rubrique Mes ressources", () => {
  const nav = read("src/lib/nav.tsx");
  assert.equal((nav.match(/label: "Mon identité"/g) ?? []).length, 1);
  assert.match(nav, /href: "\/etudiant\/identite"/);
  assert.doesNotMatch(nav, /label: "Mes ressources"/);
});

test("le tableau de bord privé consolide ses lectures et ne rapproche jamais par e-mail", () => {
  const migration = read("supabase/migrations/20261106120000_student_identity_dashboard.sql");
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /participant_auth_identities[\s\S]*auth_user_id = current_user_id/);
  assert.doesNotMatch(migration, /where[^;]*email\s*=/i);
  assert.match(migration, /attempt\.status = 'completed'/);
  assert.match(migration, /assessment\.completed_at is not null/);
  assert.match(migration, /revoke all on function public\.student_identity_dashboard\(\) from public, anon/);
  assert.match(migration, /grant execute on function public\.student_identity_dashboard\(\) to authenticated/);
});

test("les stories ouvrent les outils publiés et les publications viennent des résultats terminés", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  assert.match(page, /dashboard\.profile\.certified \?/);
  assert.match(page, /getStudentTools\(\)/);
  assert.match(page, /storiesForTools\(tools\)/);
  assert.match(page, /results = \[\.\.\.dashboard\.identityResults, \.\.\.dashboard\.financeResults\]/);
  assert.match(page, /Les tests en cours ne génèrent aucune publication/);
});

test("les pages de résultats permettent un retour direct vers Mon identité", () => {
  const mapp = read("src/app/apps/profil-mapp/MappNativeExperience.tsx");
  const grace = read("src/components/apps/GraceIdentityTool.tsx");
  assert.match(mapp, /href="\/etudiant\/identite"[^>]*>← Mon identité/);
  assert.match(grace, /href="\/etudiant\/identite"/);
});
