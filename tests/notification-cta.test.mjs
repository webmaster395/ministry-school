import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notificationSource = readFileSync(
  new URL("../supabase/migrations/20261029130000_opportunity_sessions_and_daily_digest.sql", import.meta.url),
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
  assert.match(notificationSource, /visible_at > p_run_at - interval '24 hours'/);
  assert.match(notificationSource, /visible_at <= p_run_at/);
  assert.doesNotMatch(notificationSource, /sera disponible/);
});

test("le récapitulatif de 9 h est quotidien et idempotent", () => {
  assert.match(notificationSource, /Europe\/Paris/);
  assert.match(notificationSource, /extract\(hour/);
  assert.match(notificationSource, /course_content_notification_log/);
  assert.match(notificationSource, /primary key\(recipient_id, content_type, content_id\)/);
  assert.match(notificationSource, /'0 \* \* \* \*'/);
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
