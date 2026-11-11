import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le préimport CSV est exhaustif, idempotent et bloqué sans validation", () => {
  const importer = read("scripts/import-heroes-motors.mjs");
  assert.match(importer, /function parseCsv/);
  assert.match(importer, /source_response_id|sourceResponseId/);
  assert.match(importer, /--confirm-production-import/);
  assert.match(importer, /if \(!apply\)/);
  assert.match(importer, /existing\?\.publication_status === "published"/);
  assert.match(importer, /normalizeEmail/);
  assert.match(importer, /verifiedPortraitNames/);
  assert.match(importer, /auth\.admin\.listUsers/);
  assert.doesNotMatch(importer, /levenshtein|fuzzy/i);
});

test("la lecture étudiante ne reçoit jamais les réponses confidentielles", () => {
  const migration = read("supabase/migrations/20261111230000_heroes_motors_complete_integration.sql");
  const loader = read("src/lib/identity/heroes-motors.ts");
  assert.match(migration, /get_my_heroes_motors_result/);
  assert.match(migration, /case when r\.communication_status = 'authorized' then r\.portrait else null end/);
  assert.match(migration, /case when r\.communication_status = 'authorized' then r\.motors else '\[\]'::jsonb end/);
  assert.match(migration, /r\.user_id = auth\.uid\(\)/);
  assert.match(migration, /a\.slug = 'test-des-heros'/);
  assert.match(migration, /a\.student_enabled/);
  assert.match(loader, /\.rpc\("get_my_heroes_motors_result"\)/);
  assert.doesNotMatch(loader, /source_payload/);
});

test("la page étudiante conserve le portrait validé et le refus de communication", () => {
  const page = read("src/app/etudiant/identite/mes-moteurs/HeroesMotorsResultView.tsx");
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  assert.match(page, /Ce qui m&apos;anime/);
  assert.match(page, /Mon portrait/);
  assert.match(page, /Mes moteurs/);
  assert.match(page, /Mes héros/);
  assert.match(page, /Une réflexion qui t&apos;appartient/);
  assert.match(page, /result\.communicationStatus === "refused"/);
  assert.match(page, /replace\(\/&nbsp;/);
  assert.match(identity, /Test des héros/);
  assert.match(identity, /Moi, \{firstName\}, je suis…/);
});

test("la super administration gère résultats, statistiques et anomalies", () => {
  const page = read("src/app/admin/apps/test-des-heros/results/page.tsx");
  const actions = read("src/app/admin/apps/test-des-heros/actions.ts");
  const lib = read("src/lib/admin/heroes-motors.ts");
  assert.match(page, /Anomalies d&apos;attribution/);
  assert.match(page, /Top 5 des héros/);
  assert.match(page, /Top 10 des moteurs/);
  assert.match(page, /Réponses confidentielles/);
  assert.match(actions, /viewer\?\.roles\.superAdmin/);
  assert.match(actions, /heroes_motors_result_audit/);
  assert.match(actions, /confirmReassignment/);
  assert.match(lib, /communication === "authorized"/);
});
