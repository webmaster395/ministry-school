import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la story MAPP et l'entrée principale ouvrent un résultat existant sans relancer le test", () => {
  const page = read("src/app/etudiant/identite/page.tsx");
  const mappRoute = read("src/app/apps/profil-mapp/page.tsx");
  const landing = read("src/app/apps/profil-mapp/MappLanding.tsx");
  const startRoute = read("src/app/apps/profil-mapp/commencer/page.tsx");
  const vercel = read("vercel.json");

  assert.match(page, /const mappHref = mapp\?\.attemptId[\s\S]*?\/apps\/profil-mapp\/test\/\$\{mapp\.attemptId\}\/resultat/);
  assert.match(page, /key: "profil-mapp",[\s\S]*?href: mappHref/);
  assert.match(page, /tool\.slug === "profil-mapp"[\s\S]*?href: "\/apps\/profil-mapp"/);
  assert.match(mappRoute, /const viewer = await getViewer\(\)/);
  assert.match(mappRoute, /const nativeResult = dashboard\.identityResults\.find/);
  assert.match(mappRoute, /const \[archivedResult\] = nativeResult \? \[\] : await getOfficialMappIdentityResults\(\)/);
  assert.match(mappRoute, /existingResult\.attemptId[\s\S]*?\/resultat/);
  assert.match(mappRoute, /if \(nativeResult\) query\.set\("native", "1"\)/);
  assert.match(mappRoute, /else query\.set\("legacy", "1"\)/);
  assert.match(mappRoute, /return <MappLanding \/>/);
  assert.match(landing, /Découvre comment tu fonctionnes/);
  assert.match(landing, /href="\/apps\/profil-mapp\/commencer"/);
  assert.doesNotMatch(mappRoute, /openMappQuestionnaire/);
  assert.match(startRoute, /const questionnaire = await openMappQuestionnaire\(\)/);
  assert.match(startRoute, /redirect\(destination\)/);
  assert.doesNotMatch(mappRoute, /GuestMappEntry|api\/mapp\/guest\/start/);
  assert.match(vercel, /"source": "\/apps\/profil-mapp\/test\/:path\*"/);
  assert.match(vercel, /"has": \[\{ "type": "query", "key": "legacy", "value": "1" \}\]/);
  assert.match(vercel, /"source": "\/apps\/profil-mapp\/admin\/:path\*"/);
  assert.doesNotMatch(vercel, /"missing": \[\{ "type": "query", "key": "native"/);
});

test("les pages étudiantes privilégient le résultat MAPP natif et conservent le routage Ministry", () => {
  const identity = read("src/app/etudiant/identite/page.tsx");
  const work = read("src/app/etudiant/travail/page.tsx");

  for (const page of [identity, work]) {
    assert.match(page, /const nativeMappResults = dashboard\.identityResults/);
    assert.match(page, /const selectedMappResults = \[[\s\S]*?\.\.\.nativeMappResults,[\s\S]*?officialMappResults\.map\(\(result\) => \(\{ \.\.\.result, legacy: true \}\)\)/);
    assert.match(page, /\.filter\(\(result, index, results\)[\s\S]*?candidate\.attemptId === result\.attemptId/);
    assert.match(page, /if \(mapp\?\.native\) mappQuery\.set\("native", "1"\)/);
    assert.match(page, /if \(mapp\?\.legacy\) mappQuery\.set\("legacy", "1"\)/);
  }
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
