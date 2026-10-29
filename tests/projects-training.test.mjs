import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la migration conserve les données et migre les anciens rôles", async () => {
  const sql = await source("supabase/migrations/20261029090000_projects_and_training.sql");
  assert.match(sql, /is_projects_training_member/);
  assert.match(sql, /coalesce\(is_service_lead, false\) or coalesce\(is_project_lead, false\)/);
  assert.match(sql, /update public\.profiles set role = 'student' where role = 'teacher'/);
  assert.doesNotMatch(sql, /delete from public\.opportunities/);
});

test("les responsables historiques lead_id conservent leurs accès", async () => {
  const sql = await source("supabase/migrations/20261029110000_preserve_opportunity_leads.sql");
  assert.match(sql, /select id, lead_id, 'manager', created_by/);
  assert.match(sql, /on conflict \(opportunity_id, user_id\)/);
  assert.match(sql, /is_projects_training_member = true/);
});

test("seuls les administrateurs créent et les inscriptions verrouillent la capacité", async () => {
  const sql = (await source("supabase/migrations/20261029090000_projects_and_training.sql")) + (await source("supabase/migrations/20261029130000_opportunity_sessions_and_daily_digest.sql"));
  assert.match(sql, /if not public\.is_platform_admin\(\) then raise exception 'FORBIDDEN'/);
  assert.match(sql, /where id = p_opportunity for update/);
  assert.match(sql, /ALREADY_REGISTERED/);
  assert.match(sql, /CAPACITY_REACHED/);
});

test("le catalogue inclut les éléments mixtes dans les deux filtres", async () => {
  const data = await source("src/lib/data/opportunities.ts");
  const page = await source("src/app/etudiant/services/page.tsx");
  assert.match(data, /kind === "projet" \? o\.is_project : o\.is_training/);
  assert.match(page, /matchesKind\(o, filter\)/);
  assert.match(page, /isPublished\(o\)/);
});

test("les mutations utilisent les fonctions serveur sécurisées sans notification", async () => {
  const actions = await source("src/app/etudiant/services/actions.ts");
  assert.match(actions, /register_for_opportunity_dates/);
  assert.match(actions, /create_opportunity_admin/);
  assert.match(actions, /replace_opportunity_assignments/);
  assert.doesNotMatch(actions, /from\("announcements"\)\.insert/);
});
