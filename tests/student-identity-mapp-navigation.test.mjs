import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la story et la tâche MAPP ouvrent toujours le parcours officiel authentifié", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  const mappRoute = read("src/app/apps/profil-mapp/page.tsx");

  assert.match(page, /key: "profil-mapp",[\s\S]*?href: "\/apps\/profil-mapp"/);
  assert.match(page, /tool\.slug === "profil-mapp"[\s\S]*?href: "\/apps\/profil-mapp"/);
  assert.match(mappRoute, /const viewer = await getViewer\(\)/);
  assert.match(mappRoute, /const questionnaire = await openMappQuestionnaire\(\)/);
  assert.match(mappRoute, /redirect\(destination\)/);
  assert.doesNotMatch(mappRoute, /GuestMappEntry|api\/mapp\/guest\/start/);
});

test("la jauge ouvre l'onglet À faire et le recadre", () => {
  const experience = read("src/app/etudiant/identite/IdentityExperience.tsx");

  assert.match(experience, /function openUpcoming\(\)[\s\S]*?setActiveTab\("upcoming"\)/);
  assert.match(experience, /feedRef\.current\?\.scrollIntoView/);
  assert.match(experience, /className=\{styles\.discoveryProgress\}[\s\S]*?onClick=\{openUpcoming\}/);
  assert.match(experience, /<section ref=\{feedRef\} className=\{styles\.feed\}/);
});

test("la jauge reste cadrée sur mobile et la story MAPP porte l'anneau Instagram", () => {
  const styles = read("src/app/etudiant/identite/identity.module.css");

  assert.match(styles, /\.storyRing\[data-story-key="profil-mapp"\][\s\S]*?conic-gradient/);
  assert.match(styles, /#feda75[\s\S]*?#fa7e1e[\s\S]*?#d62976[\s\S]*?#962fbf[\s\S]*?#4f5bd5/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.discoveryProgress \{[\s\S]*?width: calc\(100% - 36px\);[\s\S]*?margin: 6px 18px 0;/);
});
