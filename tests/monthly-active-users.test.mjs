import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("l'activité est agrégée à une ligne par utilisateur et par mois", async () => {
  const migration = await read("supabase/migrations/20261007080000_monthly_user_activity.sql");
  assert.match(migration, /primary key \(user_id, activity_month\)/);
  assert.match(migration, /on conflict \(user_id, activity_month\) do update/);
  assert.match(migration, /after update of last_sign_in_at on auth\.users/);
  assert.match(migration, /p\.is_test_account = false/);
});

test("l'historique antérieur n'est pas inventé à partir de last_sign_in_at", async () => {
  const migration = await read("supabase/migrations/20261007080000_monthly_user_activity.sql");
  assert.match(migration, /date_trunc\('month', now\(\) at time zone 'Europe\/Paris'\)/);
  assert.match(migration, /Aucun historique plus ancien n'est inventé/);
});

test("les statistiques conservent le KPI mensuel et affichent l'évolution hebdomadaire", async () => {
  const statistics = await read("src/components/admin/StatisticsTab.tsx");
  assert.match(statistics, /Utilisateurs actifs ce mois-ci/);
  assert.match(statistics, /Utilisateurs actifs par semaine/);
  assert.match(statistics, /activeThisMonth \/ total/);
});

test("les nouvelles collectes sont agrégées, privées et limitées aux pages étudiantes", async () => {
  const migration = await read("supabase/migrations/20261007100000_usage_analytics.sql");
  assert.match(migration, /primary key \(user_id, week_start\)/);
  assert.match(migration, /primary key \(user_id, activity_date, page_key\)/);
  assert.match(migration, /revoke all on table public\.student_page_usage_daily from public, anon, authenticated/);
  assert.match(migration, /if not public\.is_admin\(\)/);
  assert.match(migration, /page_key in \([\s\S]*?'home'[\s\S]*?'services_projects'/);
  assert.doesNotMatch(migration, /'admin'\s*,\s*'auth'/);
});

test("les téléchargements étudiants passent par l'action de comptage sécurisée", async () => {
  const course = await read("src/components/course/CourseExperience.tsx");
  const route = await read("src/app/etudiant/ressources/[materialId]/ouvrir/route.ts");
  assert.match(course, /\/etudiant\/ressources\/\$\{material\.id\}\/ouvrir/);
  assert.match(route, /record_material_download/);
});
