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

test("la super-administration peut prévisualiser son brouillon sans ouvrir l'outil aux étudiants", () => {
  const migration = read("supabase/migrations/20261111235500_heroes_super_admin_preview.sql");
  assert.match(migration, /public\.is_super_admin\(\)/);
  assert.match(migration, /r\.publication_status = 'published'/);
  assert.match(migration, /and r\.visible/);
  assert.match(migration, /a\.student_enabled/);
  assert.match(migration, /r\.user_id = auth\.uid\(\)/);
});

test("les résultats non attribués se rattachent automatiquement par e-mail exact", () => {
  const migration = read("supabase/migrations/20261112003000_heroes_account_claim_and_art_direction.sql");
  assert.match(migration, /lower\(btrim\(r\.source_email\)\) = lower\(btrim\(target_email\)\)/);
  assert.match(migration, /after insert or update of email on auth\.users/);
  assert.match(migration, /after insert on public\.profiles/);
  assert.match(migration, /existing_result_for_account|exists\(select 1 from public\.heroes_motors_results where user_id = target_user_id\)/);
});

test("la DA héros utilise la colombe abstraite et une écriture foncée", () => {
  const identity = read("src/app/etudiant/identite/identity.module.css");
  const result = read("src/app/etudiant/identite/mes-moteurs/prototype.module.css");
  const page = read("src/app/etudiant/identite/page.tsx");
  assert.match(identity, /dove-abstract-v1\.webp/);
  assert.match(identity, /color: #183750/);
  assert.match(result, /dove-abstract-v1\.webp/);
  assert.match(result, /--ink:#183750/);
  assert.match(page, /dove-abstract-v1\.webp/);
});

test("la page étudiante conserve le portrait validé et le refus de communication", () => {
  const page = read("src/app/etudiant/identite/mes-moteurs/HeroesMotorsResultView.tsx");
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  assert.doesNotMatch(page, /Ce qui m&apos;anime/);
  assert.doesNotMatch(page, /Les qualités qui m&apos;inspirent/);
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
  assert.match(actions, /APPROVED_SOURCE_HASH/);
  assert.match(actions, /rawRows\.length !== 249/);
  assert.match(actions, /confirmImport/);
  assert.match(lib, /communication === "authorized"/);
});
