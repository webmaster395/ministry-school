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

test("la route MAPP propose directement le parcours invité", () => {
  const vercel = read("vercel.json");
  assert.match(vercel, /profil-mapp\.vercel\.app\/apps\/profil-mapp/);
  assert.doesNotMatch(vercel, /"source": "\/apps\/profil-mapp\/officiel"/);
});

test("les tentatives invitées gardent leur secret hors du navigateur Supabase", () => {
  const migration = read("supabase/migrations/20261106203000_mapp_secure_guest_attempts.sql");
  const profileMigration = read("supabase/migrations/20261106220000_mapp_guest_profile_and_immediate_access.sql");
  const start = read("src/app/api/mapp/guest/start/route.ts");
  assert.match(migration, /token_hash text not null unique/);
  assert.match(migration, /revoke all on mapp\.guest_attempt_access from public, anon, authenticated/);
  assert.match(profileMigration, /start_guest_hybrid_44_profile/);
  assert.match(profileMigration, /first_name,last_name,email/);
  assert.doesNotMatch(profileMigration, /MAPP_GUEST_NOT_OPEN/);
  assert.match(start, /setGuestCredential/);
  assert.doesNotMatch(start, /SUPABASE_SERVICE_ROLE_KEY/);
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
  assert.match(page, /Il ne publie pas l'outil aux étudiants/);
});
