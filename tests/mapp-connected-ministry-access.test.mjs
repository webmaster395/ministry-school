import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Profil MAPP est accessible à tout compte Ministry connecté et actif", () => {
  const migration = read("supabase/migrations/20261111195500_mapp_connected_ministry_access.sql");

  assert.match(migration, /profile\.id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /not coalesce\(profile\.deactivated, false\)/);
  assert.doesNotMatch(migration, /profile\.role|email_confirmed|is_super_admin|student_enabled/);
  assert.match(migration, /grant execute on function mapp\.current_student_is_eligible\(\) to authenticated/);
});

test("la restriction Fruit de l’Esprit reste distincte et réservée aux super admins", () => {
  const fruitRoute = read("src/components/student/GraceIdentityStudentPage.tsx");

  assert.match(fruitRoute, /!viewer\.roles\.superAdmin\) notFound\(\)/);
});

test("MAPP ouvre le test à faire ou le résultat déjà finalisé", () => {
  const page = read("src/app/apps/profil-mapp/page.tsx");

  assert.match(page, /if \(existingResult\?\.attemptId\)/);
  assert.match(page, /redirect\(`\/apps\/profil-mapp\/test\/\$\{existingResult\.attemptId\}\/resultat/);
  assert.match(page, /const questionnaire = await openMappQuestionnaire\(\)/);
  assert.match(page, /destination = `\/apps\/profil-mapp\/test\/\$\{questionnaire\.attemptId\}`/);
});
