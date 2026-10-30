import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = source("supabase/migrations/20261030110000_smart_daily_notification_digest.sql");

test("toutes les notifications automatiques passent par une file centralisée", () => {
  assert.match(migration, /create table if not exists public\.notification_events/);
  assert.match(migration, /create trigger zz_queue_automatic_announcement/);
  assert.match(migration, /return null;/);
  assert.match(migration, /queue_material_notification/);
  assert.match(migration, /queue_assignment_notification/);
  assert.match(migration, /queue_video_notification/);
  assert.match(migration, /queue_session_notification/);
  assert.match(migration, /queue_opportunity_notification/);
});

test("une personne ne peut recevoir qu'un récapitulatif par journée de Paris", () => {
  assert.match(migration, /unique\(recipient_id, digest_date\)/);
  assert.match(migration, /announcements_one_daily_digest_per_recipient/);
  assert.match(migration, /at time zone 'Europe\/Paris'/);
  assert.match(migration, /extract\(hour from \(p_run_at at time zone 'Europe\/Paris'\)\) <> 9/);
  assert.match(migration, /pg_try_advisory_xact_lock/);
});

test("les contenus sont dédupliqués par identité et par ressource agrégée", () => {
  assert.match(migration, /dedupe_key text not null unique/);
  assert.match(migration, /distinct on \(aggregate_key\)/);
  assert.match(migration, /resource_type in \('video', 'material', 'assignment'\)/);
  assert.match(migration, /course\.session_id = c\.session_id/);
});

test("un événement n'est marqué livré qu'après la création réussie du digest", () => {
  const announcement = migration.indexOf("insert into public.announcements(", migration.indexOf("create or replace function public.create_daily_notification_digest"));
  const delivery = migration.indexOf("insert into public.notification_digest_deliveries", announcement);
  const receipt = migration.indexOf("insert into public.notification_event_receipts", delivery);
  assert.ok(announcement > 0 && delivery > announcement && receipt > delivery);
  assert.match(migration, /notification_digest_failures/);
  assert.match(migration, /exception when others/);
});

test("les préférences existantes et les permissions déterminent les événements éligibles", () => {
  assert.match(migration, /notification_preference_enabled\(person\.notification_prefs/);
  assert.match(migration, /notification_event_audience_matches/);
  assert.match(migration, /s\.ministry_id = p_profile\.ministry_id/);
  assert.match(migration, /o\.publication_status = 'scheduled' and o\.published_at <= p_run_at/);
});

test("le centre de notifications propose un détail navigable du récapitulatif", () => {
  const page = source("src/app/etudiant/messages/[id]/page.tsx");
  const data = source("src/lib/data/messages.ts");
  assert.match(migration, /daily_notification_digest_details/);
  assert.match(data, /getDailyDigestDetails/);
  assert.match(page, /Toutes les informations du jour/);
  assert.match(page, /item\.targetUrl/);
});
