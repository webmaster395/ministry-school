import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la migration rattache les formations sans supprimer les cours existants", () => {
  const sql = read("supabase/migrations/20261113113000_formation_spaces_and_deepening.sql");
  assert.match(sql, /alter table public\.courses add column if not exists formation_id/);
  assert.match(sql, /alter table public\.sessions add column if not exists formation_id/);
  assert.match(sql, /update public\.sessions session set formation_id=formation\.id/);
  assert.match(sql, /update public\.courses course set formation_id=session\.formation_id/);
  assert.match(sql, /formation_migration_audit/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.(courses|sessions|materials|assignments)/i);
  assert.doesNotMatch(sql, /truncate\s+public\.(courses|sessions|materials|assignments)/i);
});

test("le libellé historique est harmonisé sans fusion destructive", () => {
  const sql = read("supabase/migrations/20261113113000_formation_spaces_and_deepening.sql");
  assert.match(sql, /set track='Projets et formations'/);
  assert.match(sql, /accélérateur de projet/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.sessions/i);
});

test("les responsables et contributeurs restent bornés à leur formation", () => {
  const sql = read("supabase/migrations/20261113113000_formation_spaces_and_deepening.sql");
  assert.match(sql, /create or replace function public\.can_manage_formation\(/);
  assert.match(sql, /formation_category_assignments/);
  assert.match(sql, /formation_assignments/);
  assert.match(sql, /course_assignments/);
  assert.match(sql, /session_assignments/);
  assert.match(sql, /can_publish boolean not null default false/);
});

test("un approfondissement exige autorisation générale et inscription précise", () => {
  const sql = read("supabase/migrations/20261113113000_formation_spaces_and_deepening.sql");
  assert.match(sql, /create table if not exists public\.deepening_access/);
  assert.match(sql, /create table if not exists public\.deepening_enrollments/);
  assert.match(sql, /join public\.deepening_access access on access\.user_id=p_user and access\.enabled=true/);
  assert.match(sql, /create policy sessions_deepening_access[\s\S]*as restrictive/);
  assert.match(sql, /audience='present'/);
});

test("la navigation étudiante ne crée pas d'espace approfondissements", () => {
  const nav = read("src/lib/nav.tsx");
  assert.match(nav, /label: "Mon ministère"/);
  assert.doesNotMatch(nav, /Mes approfondissements/);
  assert.doesNotMatch(nav, /\/etudiant\/approfondissements/);
});

test("le pilotage compte les mêmes étudiants actifs que Mon identité", () => {
  const statistics = read("src/components/admin/StatisticsTab.tsx");
  assert.match(statistics, /member\.role === "student" && !member\.deactivated/);
});
