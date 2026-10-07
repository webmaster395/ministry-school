import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la vidéo réserve son espace et précède le contenu secondaire", async () => {
  const code = await source("src/components/course/CourseExperience.tsx");
  const video = code.indexOf('aria-label="Vidéo du cours"');
  const about = code.indexOf("À propos de ce cours");
  assert.ok(video > -1 && about > -1 && video < about);
  assert.match(code, /aspect-video w-full/);
  assert.match(code, /loading="lazy"/);
  assert.match(code, /playsInline/);
});

test("la navigation mobile du cours reste compacte et contextuelle", async () => {
  const code = await source("src/components/course/CourseExperience.tsx");
  for (const label of [
    "À préparer",
    "Suivre le cours",
    "Ressources",
    "Mettre en pratique",
    "Mes notes",
  ])
    assert.match(code, new RegExp(`"${label}"`));
  assert.match(code, /sticky top-/);
});

test("les notes utilisent une toolbar mobile sans débordement", async () => {
  const code = await source("src/components/course/CourseNotesEditor.tsx");
  assert.match(code, /grid grid-cols-5/);
  assert.match(code, /max-h-\[58dvh\]/);
  assert.match(code, /grid grid-cols-2 gap-2/);
  assert.match(code, /useState\(false\)/);
});

test("le contenu du cours utilise la largeur disponible sans colonne latérale vide", async () => {
  const code = await source("src/components/course/CourseExperience.tsx");
  assert.match(code, /max-w-\[92ch\]/);
  assert.doesNotMatch(code, /grid-cols-\[minmax\(0,1fr\)_360px\]/);
  assert.doesNotMatch(code, /lg:sticky lg:top-24/);
});

test("les états vides pédagogiques ne sont pas empilés", async () => {
  const detail = await source("src/app/etudiant/cours/[courseId]/page.tsx");
  assert.doesNotMatch(detail, /Disponibles après la séance/);
  const experience = await source("src/components/course/CourseExperience.tsx");
  assert.match(experience, /if \(!items\.length\) return null/);
});
