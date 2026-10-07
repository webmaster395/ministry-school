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

test("les statistiques affichent le KPI et le graphique mensuels", async () => {
  const statistics = await read("src/components/admin/StatisticsTab.tsx");
  assert.match(statistics, /Utilisateurs actifs ce mois-ci/);
  assert.match(statistics, /Utilisateurs actifs par mois/);
  assert.match(statistics, /activeThisMonth \/ total/);
});
