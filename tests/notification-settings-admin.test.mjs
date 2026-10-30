import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Notifications est la huitième carte réservée aux super admins", async () => {
  const [home, page] = await Promise.all([
    source("src/components/admin/AdminHome.tsx"),
    source("src/app/gestion/admin/page.tsx"),
  ]);
  assert.match(home, /viewer\.roles\.superAdmin \? \[/);
  assert.match(home, /title: "Notifications"/);
  assert.match(home, /onglet=notifications/);
  assert.match(page, /!viewer\.roles\.superAdmin && !\["accueil", "pilotage"\]\.includes\(tab\)/);
  assert.match(page, /NotificationSettingsForm/);
});

test("l'action et les RPC répètent le contrôle Super admin", async () => {
  const [actions, migration] = await Promise.all([
    source("src/app/gestion/admin/actions.ts"),
    source("supabase/migrations/20261030210000_weekly_notification_digest.sql"),
  ]);
  const start = actions.indexOf("saveNotificationDigestSettings");
  const end = actions.indexOf("/**", start + 10);
  assert.match(actions.slice(start, end > start ? end : undefined), /await assertSuperAdmin\(\)/);
  assert.match(migration, /notification_digest_admin_state[\s\S]*?if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
  assert.match(migration, /update_notification_digest_settings[\s\S]*?if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
});

test("le formulaire configure activation fréquence jour heure et fuseau", async () => {
  const form = await source("src/components/admin/NotificationSettingsForm.tsx");
  assert.match(form, /name="enabled"/);
  assert.match(form, /name="frequency"/);
  assert.match(form, /name="weekday"/);
  assert.match(form, /name="send_time"/);
  assert.match(form, /Europe\/Paris/);
  assert.match(form, /Prochain envoi/);
  assert.match(form, /Dernier traitement/);
  assert.match(form, /Enregistrer les paramètres/);
});
