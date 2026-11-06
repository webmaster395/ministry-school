import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mon identité possède une seule entrée réservée aux super administrateurs", () => {
  const nav = read("src/lib/nav.tsx");
  const navBlocks = read("src/components/NavBlocks.tsx");
  const page = read("src/app/etudiant/identite/page.tsx");
  assert.equal((nav.match(/label: "Mon identité"/g) ?? []).length, 1);
  assert.match(nav, /href: "\/etudiant\/identite"/);
  assert.doesNotMatch(nav, /label: "Mes ressources"/);
  assert.match(navBlocks, /item\.label !== "Mon identité" \|\| isSuperAdmin/);
  assert.match(page, /!viewer\?\.roles\.superAdmin[\s\S]*redirect\("\/etudiant"\)/);
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
  assert.match(page, /getStudentTools\(\)/);
  assert.match(page, /buildStories\(tools, dashboard\.recommendations\)/);
  assert.match(page, /results=\{\[\.\.\.dashboard\.identityResults, \.\.\.dashboard\.financeResults\]\}/);

  const experience = read("src/app/etudiant/identite/IdentityExperience.tsx");
  assert.match(experience, /props\.certified \?/);
  assert.match(experience, /Les résultats apparaîtront après la finalisation d’un test/);
  assert.match(experience, /result\.attemptId[\s\S]*\/apps\/profil-mapp\/test\/\$\{result\.attemptId\}\/resultat/);
  assert.doesNotMatch(experience, /Retrouve les réponses et résultats enregistrés par l’outil/);
});

test("le genre est ajouté à la lecture consolidée sans requête supplémentaire", () => {
  const migration = read("supabase/migrations/20261106130000_student_identity_profile_gender.sql");
  assert.match(migration, /'gender',current_profile\.gender/);
  assert.match(migration, /participant_auth_identities[\s\S]*auth_user_id\s*=\s*current_user_id/);
  assert.doesNotMatch(migration, /where[^;]*email\s*=/i);
});

test("les pages de résultats permettent un retour direct vers Mon identité", () => {
  const mapp = read("src/app/apps/profil-mapp/MappNativeExperience.tsx");
  const grace = read("src/components/apps/GraceIdentityTool.tsx");
  assert.match(mapp, /href="\/etudiant\/identite"[^>]*>← Mon identité/);
  assert.match(grace, /href="\/etudiant\/identite"/);
});
