import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notificationSource = readFileSync(
  new URL("../supabase/migrations/20261030210000_weekly_notification_digest.sql", import.meta.url),
  "utf8",
);
const messageSource = readFileSync(
  new URL("../src/app/etudiant/messages/page.tsx", import.meta.url),
  "utf8",
);
const courseSource = readFileSync(
  new URL("../src/components/course/CourseExperience.tsx", import.meta.url),
  "utf8",
);

test("le récapitulatif ne contient que les contenus réellement disponibles", () => {
  assert.match(notificationSource, /event\.available_at <= p_run_at/);
  assert.match(notificationSource, /notification_event_audience_matches/);
  assert.doesNotMatch(notificationSource, /sera disponible/);
});

test("le récapitulatif hebdomadaire est configurable et idempotent", () => {
  assert.match(notificationSource, /Europe\/Paris/);
  assert.match(notificationSource, /frequency text not null default 'weekly'/);
  assert.match(notificationSource, /notification_event_receipts/);
  assert.match(notificationSource, /notification_digest_one_delivery_per_period/);
  assert.match(notificationSource, /pg_try_advisory_xact_lock/);
});

test("la messagerie rend la destination sous forme de bouton", () => {
  assert.match(messageSource, /href=\{m\.targetUrl\}/);
  assert.match(messageSource, /m\.ctaLabel \|\| "Voir le contenu"/);
});

test("Ton parcours est placé avant le contenu et les ancres existent", () => {
  const navigation = courseSource.indexOf('aria-label="Accès rapide au contenu du cours"');
  const content = courseSource.indexOf('id="course-content"');
  assert.ok(navigation > -1 && content > -1 && navigation < content);
  assert.match(courseSource, /id="course-resources"/);
  assert.match(courseSource, /notes\?\.enabled \? \[\["course-notes", "Mes notes"\]\]/);
  assert.match(courseSource, /id="course-notes"/);
  assert.match(courseSource, /before\.length \? \[\["before-course", "À préparer"\]\]/);
  assert.match(courseSource, /after\.length \? \[\["after-course", "Mettre en pratique"\]\]/);
});
