import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mes outils montre les brouillons aux seuls super-administrateurs", () => {
  const page = read("src/app/etudiant/outils/page.tsx");
  assert.match(page, /viewer\?\.roles\.superAdmin/);
  assert.match(page, /includeUnpublished: true, channel: "admin"/);
  assert.match(page, /enabled \? await getStudentTools\(\) : \[\]/);
});

test("la route MAPP reste servie par l'application officielle", () => {
  const vercel = read("vercel.json");
  assert.match(vercel, /profil-mapp\.vercel\.app\/apps\/profil-mapp/);
  assert.doesNotMatch(vercel, /"source": "\/apps\/profil-mapp\/officiel"/);
});

test("le parcours invité MAPP est désactivé", () => {
  const start = read("src/app/api/mapp/guest/start/route.ts");
  const proxy = read("src/proxy.ts");
  assert.match(start, /status: 410/);
  assert.match(start, /Connectez-vous à Ministry School/);
  assert.doesNotMatch(start, /start_guest_hybrid_44_profile|setGuestCredential/);
  assert.doesNotMatch(proxy, /isProfilMappRoute|\/api\/mapp\/guest\/start/);
});

test("Mon identité rattache une tentative possédée sans dépendre de l'e-mail saisi", () => {
  const route = read("src/app/api/mapp/guest/claim/route.ts");
  const migration = read("supabase/migrations/20261107003000_mapp_claim_owned_guest_attempt.sql");
  assert.match(route, /mapp_claim_owned_guest_attempt/);
  assert.match(route, /sha256\(credential\.secret\)/);
  assert.match(migration, /access\.token_hash = p_token_hash/);
  assert.match(migration, /access\.expires_at > now\(\)/);
  assert.match(migration, /access\.claimed_at is null or access\.claimed_by = current_user_id/);
  assert.doesNotMatch(migration, /guest\.email/);
  assert.match(migration, /revoke all on function public\.mapp_claim_owned_guest_attempt\(uuid, text\) from public, anon/);
});

test("la porte SQL contrôle publication étudiante et aperçu super-admin", () => {
  const sql = read("supabase/migrations/20261106140000_mapp_superadmin_preview_gate.sql");
  assert.match(sql, /public\.is_super_admin\(profile\.id\)/);
  assert.match(sql, /app\.slug = 'profil-mapp'/);
  assert.match(sql, /app\.student_enabled/);
  assert.match(sql, /profile\.email_confirmed/);
  assert.match(sql, /not coalesce\(profile\.deactivated, false\)/);
});

test("la session officielle est additive et ne publie pas le catalogue étudiant", () => {
  const sql = read("supabase/migrations/20261106141000_mapp_official_questionnaire_session.sql");
  assert.equal((sql.match(/insert into mapp\.questions/g) ?? []).length, 50);
  assert.equal((sql.match(/insert into mapp\.scoring_question_rules/g) ?? []).length, 40);
  assert.match(sql, /on conflict \(code\) do nothing/);
  assert.match(sql, /capacity\)\s*\n\s*values \('ministry-mapp-2026-11-07'[\s\S]*600\)/);
  assert.doesNotMatch(sql, /update public\.app_catalog/);
  assert.doesNotMatch(sql, /delete from|drop table|truncate/i);
});

test("l'administration propose le parcours réel sans modifier la publication", () => {
  const page = read("src/app/admin/apps/[slug]/settings/page.tsx");
  assert.match(page, /href="\/apps\/profil-mapp"/);
  assert.match(page, /Il ne publie pas (?:l'outil|l&apos;outil) aux étudiants/);
});
