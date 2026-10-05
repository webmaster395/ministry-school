import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notificationSource = readFileSync(
  new URL("../src/lib/course-notifications.ts", import.meta.url),
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

test("chaque notification pédagogique cible directement la bonne section", () => {
  assert.match(notificationSource, /course-resources/);
  assert.match(notificationSource, /before-course/);
  assert.match(notificationSource, /after-course/);
  assert.match(notificationSource, /course-content/);
});

test("les ressources rapprochées sont regroupées dans une seule notification", () => {
  assert.match(notificationSource, /10 \* 60 \* 1000/);
  assert.match(notificationSource, /De nouvelles ressources sont disponibles/);
  assert.match(notificationSource, /\.update\(/);
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
