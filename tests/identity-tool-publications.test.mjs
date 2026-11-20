import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Mes résultats est une galerie unique avec les publications À faire en premier", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  const experience = read("src/app/etudiant/identite/IdentityExperience.tsx");
  const styles = read("src/app/etudiant/identite/identity.module.css");

  assert.match(page, /const feedItems: IdentityFeedItem\[\] = \[[\s\S]*?todoItems\.map[\s\S]*?visibleResults\.map/);
  assert.match(page, /importanceOrder\[left\.importance\] - importanceOrder\[right\.importance\]/);
  assert.match(experience, /<Grid3X3 \/> Mes résultats/);
  assert.doesNotMatch(experience, /role="tablist"|setActiveTab\(|props\.upcoming/);
  assert.match(experience, /styles\.todoBadge}>À faire/);
  assert.match(styles, /\.grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
  assert.match(styles, /\.todoPost \.postImage\s*\{[\s\S]*grayscale/);
});

test("un résultat publié exclut l’état À faire sans supprimer l’historique MAPP", () => {
  const page = read("src/app/etudiant/identite/page.tsx");

  assert.match(page, /const completed = providerKinds\(tool\)\.some\(\(kind\) => completedKinds\.has\(kind\)\);[\s\S]*if \(completed\) return \[\];/);
  assert.match(page, /const selectedMappResults = \[[\s\S]*\.\.\.nativeMappResults,[\s\S]*\.\.\.officialMappResults/);
  assert.match(page, /\.filter\(\(result, index, results\)[\s\S]*candidate\.attemptId === result\.attemptId/);
  assert.match(page, /\.\.\.visibleResults\.map\(\(result\)/);
  assert.doesNotMatch(page, /selectedMappResults\[0\]|selectedMappResults\.slice\(0,\s*1\)/);
});

test("les liens externes enregistrent l’ouverture sans la confondre avec une soumission", () => {
  const route = read("src/app/etudiant/outils/[slug]/ouvrir/route.ts");
  const migration = read("supabase/migrations/20261120213000_identity_tool_publications.sql");
  const page = read("src/app/etudiant/identite/page.tsx");

  assert.match(route, /rpc\("record_app_open", \{ p_app_id: app\.id \}\)/);
  assert.match(route, /NextResponse\.redirect\(new URL\(app\.destination_url/);
  assert.match(migration, /first_opened_at[\s\S]*last_opened_at[\s\S]*submission_confirmed_at/);
  const recordOpen = migration.slice(migration.indexOf("create or replace function public.record_app_open"), migration.indexOf("create or replace function public.reset_app_progress"));
  assert.doesNotMatch(recordOpen, /submission_confirmed_at/);
  assert.match(page, /external && tool\.identityResultMode !== "automatic" && wasOpenedAfterReset/);
});

test("le Test des héros reste en attente après le clic et n’apparaît qu’une fois publié", () => {
  const migration = read("supabase/migrations/20261120213000_identity_tool_publications.sql");
  const actions = read("src/app/admin/apps/test-des-heros/actions.ts");

  assert.match(migration, /where slug = 'test-des-heros'/);
  assert.match(migration, /identity_result_mode = 'manual'/);
  assert.match(migration, /result\.publication_status = 'published'[\s\S]*and result\.visible/);
  assert.match(migration, /public\.can_access_resource\('app_catalog', app\.id, auth\.uid\(\)\)/);
  assert.match(actions, /rpc\("confirm_app_submissions"/);
  assert.match(actions, /publication_status: visible \? "published" : "draft"/);
});

test("les listes contrôlent aussi les publications et les accès directs", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  const migration = read("supabase/migrations/20261120213000_identity_tool_publications.sql");
  const consolidatedFeed = read("supabase/migrations/20261120221000_student_identity_feed.sql");

  assert.match(page, /getStudentIdentityFeed\(viewer\.id, viewer\.roles\.superAdmin\)/);
  assert.match(page, /accessibleResultKinds = new Set\(visibleTools\.flatMap\(providerKinds\)\)/);
  assert.match(consolidatedFeed, /public\.can_access_resource\('app_catalog', app\.id, current_user_id\)/);
  assert.match(migration, /public\.can_access_resource\('app_catalog', app\.id, auth\.uid\(\)\)/);
});

test("l’administration configure le résultat et peut remettre un clic externe à faire", () => {
  const form = read("src/components/apps-studio/AppSettingsForm.tsx");
  const actions = read("src/app/admin/apps/actions.ts");
  const catalog = read("src/lib/apps/catalog.ts");
  const migration = read("supabase/migrations/20261120213000_identity_tool_publications.sql");

  for (const field of ["identityResultMode", "identityImportance", "resultProvider", "postDescription"]) {
    assert.match(form, new RegExp(`name="${field}"`));
    assert.match(actions, new RegExp(field));
  }
  assert.match(catalog, /identityResultMode[\s\S]*identityImportance[\s\S]*resultProvider[\s\S]*postDescription/);
  assert.match(form, /action=\{resetExternalToolProgress\}/);
  assert.match(actions, /rpc\("reset_app_progress"/);
  assert.match(migration, /reset_at = now\(\)/);
  assert.doesNotMatch(actions, /from\("app_user_progress"\)\.delete/);
});

