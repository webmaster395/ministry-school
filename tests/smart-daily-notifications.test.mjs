import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261030210000_weekly_notification_digest.sql");

test("la configuration initiale est hebdomadaire, dimanche à 10 h à Paris", () => {
  assert.match(migration, /frequency text not null default 'weekly'/);
  assert.match(migration, /weekday smallint not null default 0/);
  assert.match(migration, /send_time time without time zone not null default '10:00'/);
  assert.match(migration, /timezone text not null default 'Europe\/Paris'/);
  assert.match(migration, /enabled boolean not null default true/);
});

test("l'ancien historique est remis à zéro sans supprimer de données métier", () => {
  for (const table of [
    "notification_digest_items",
    "notification_event_receipts",
    "notification_digest_failures",
    "notification_digest_deliveries",
    "notification_events",
    "course_content_notification_log",
    "announcements",
  ]) assert.match(migration, new RegExp(`delete from public\\.${table}`));
  assert.doesNotMatch(migration, /delete from public\.(sessions|materials|assignments|enrollments|opportunities|profiles);/);
  assert.match(migration, /activated_at = now\(\)/);
  assert.match(migration, /event\.occurred_at >= settings\.activated_at/);
});

test("les producteurs mettent en file sans créer de message immédiat", () => {
  assert.match(migration, /queue_material_notification/);
  assert.match(migration, /queue_assignment_notification/);
  assert.match(migration, /queue_video_notification/);
  assert.match(migration, /queue_opportunity_resource_notification/);
  assert.match(migration, /if coalesce\(new\.is_system, false\) then return null/);
  assert.match(migration, /'information'.*'recipient'/s);
  assert.doesNotMatch(migration, /sera disponible/);
});

test("les workflows, plannings et contenus futurs ne sont jamais annoncés", () => {
  assert.match(migration, /drop trigger if exists queue_session_notification/);
  assert.match(migration, /drop trigger if exists queue_opportunity_date_notification/);
  assert.match(migration, /event\.available_at <= p_run_at/);
  assert.match(migration, /event\.category in \('video', 'material', 'assignment', 'information'\)/);
  assert.match(migration, /session\.editorial_status = 'scheduled' and session\.publication_at <= p_run_at/);
  assert.doesNotMatch(migration.slice(migration.indexOf("notification_events_for_recipient"), migration.indexOf("next_notification_digest_run")), /workflow|planning|deadline/);
});

test("une personne reçoit au plus un digest par période et les reprises restent idempotentes", () => {
  assert.match(migration, /notification_digest_one_delivery_per_period/);
  assert.match(migration, /announcements_one_digest_per_recipient_period/);
  assert.match(migration, /pg_try_advisory_xact_lock/);
  assert.match(migration, /not exists\([\s\S]*notification_event_receipts/);
  assert.match(migration, /on conflict do nothing/);
  const announcement = migration.indexOf("insert into public.announcements(", migration.indexOf("create_notification_digest"));
  const delivery = migration.indexOf("insert into public.notification_digest_deliveries", announcement);
  const receipts = migration.indexOf("insert into public.notification_event_receipts", delivery);
  assert.ok(announcement > 0 && delivery > announcement && receipts > delivery);
});

test("l'ordonnanceur suit les réglages persistés et le fuseau Europe Paris", () => {
  assert.match(migration, /update_notification_digest_settings/);
  assert.match(migration, /p_frequency not in \('daily', 'weekly'\)/);
  assert.match(migration, /p_timezone <> 'Europe\/Paris'/);
  assert.match(migration, /at time zone settings\.timezone/);
  assert.match(migration, /extract\(dow from local_time\)/);
  assert.match(migration, /'\* \* \* \* \*'/);
  assert.match(migration, /select public\.create_notification_digest\(now\(\)\)/);
});

test("l'interface détail regroupe les nouveautés par cours", () => {
  const page = source("src/app/etudiant/messages/[id]/page.tsx");
  const data = source("src/lib/data/messages.ts");
  assert.match(migration, /'courseTitle'/);
  assert.match(migration, /'typeLabel'/);
  assert.match(data, /courseTitle/);
  assert.match(page, /details\.items\.reduce/);
  assert.match(page, /Nouveautés disponibles/);
  assert.match(page, /Accéder à mes cours/);
  assert.doesNotMatch(page, /À traiter|Validation demandée|Du nouveau dans Ministry School/);
});
