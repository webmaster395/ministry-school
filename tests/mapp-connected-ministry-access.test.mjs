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
  const landing = read("src/app/apps/profil-mapp/MappLanding.tsx");
  const startPage = read("src/app/apps/profil-mapp/commencer/page.tsx");
  const questionnairePage = read("src/app/apps/profil-mapp/test/[attemptId]/page.tsx");
  const runner = read("src/app/apps/profil-mapp/OfficialHybrid44Runner.tsx");
  const resultPage = read("src/app/apps/profil-mapp/test/[attemptId]/resultat/page.tsx");
  const resultPanel = read("src/app/apps/profil-mapp/MappNativeExperience.tsx");
  const oldTieBreakRoute = read("src/app/apps/profil-mapp/test/[attemptId]/departage/page.tsx");
  const vercel = JSON.parse(read("vercel.json"));
  const testRewrite = vercel.rewrites.find((rewrite) => rewrite.source === "/apps/profil-mapp/test/:path*");

  assert.match(page, /if \(existingResult\?\.attemptId\)/);
  assert.match(page, /redirect\(`\/apps\/profil-mapp\/test\/\$\{existingResult\.attemptId\}\/resultat/);
  assert.match(page, /return <MappLanding \/>/);
  assert.match(landing, /href="\/apps\/profil-mapp\/commencer"/);
  assert.doesNotMatch(page, /openMappQuestionnaire/);
  assert.match(startPage, /const questionnaire = await openMappQuestionnaire\(\)/);
  assert.match(startPage, /destination = `\/apps\/profil-mapp\/test\/\$\{questionnaire\.attemptId\}\?native=1`/);
  assert.match(questionnairePage, /!guestQuestionnaire && \(!viewer \|\| viewer\.deactivated\)/);
  assert.doesNotMatch(questionnairePage, /viewer\.roles\.superAdmin/);
  assert.match(questionnairePage, /questionnaire\.attemptId !== attemptId\) redirect\(`\/apps\/profil-mapp\/test\/\$\{questionnaire\.attemptId\}\?native=1`\)/);
  assert.deepEqual(testRewrite.has, [{ type: "query", key: "legacy", value: "1" }]);
  assert.equal("missing" in testRewrite, false);
  assert.match(runner, /resultat\?revision=\$\{payload\.revisionId\}&native=1/);
  assert.doesNotMatch(resultPage, /departage/);
  assert.doesNotMatch(resultPanel, /Précisons votre profil|tieBreakQuestions|submitMappTieBreak/);
  assert.match(oldTieBreakRoute, /redirect\(`\/apps\/profil-mapp\/test\/\$\{attemptId\}\/resultat/);
});

test("les styles MAPP ne modifient plus les typographies de Ministry", () => {
  const designSystem = read("src/app/mapp-results-design-system.css");
  const mappStyles = read("src/app/apps/profil-mapp/official-mapp.css");
  const layout = read("src/app/apps/profil-mapp/layout.tsx");

  assert.doesNotMatch(designSystem, /body, body \*/);
  assert.match(designSystem, /\.results-design-system, \.results-design-system \*/);
  assert.doesNotMatch(mappStyles, /@import "tailwindcss"/);
  assert.doesNotMatch(mappStyles, /(?:^|\n)h1 \{/);
  assert.match(mappStyles, /\.profil-mapp-scope h1 \{/);
  assert.match(layout, /profil-mapp-scope results-design-system/);
});
