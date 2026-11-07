import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le layout étudiant redirige une session absente au lieu de planter", async () => {
  const code = await source("src/app/etudiant/layout.tsx");
  assert.match(code, /if \(!viewer\) redirect\("\/login"\)/);
  assert.doesNotMatch(code, /viewer!\./);
});

test("les pages de cours réutilisent le viewer vérifié sans second appel Auth distant", async () => {
  const files = [
    "src/app/etudiant/cours/page.tsx",
    "src/app/etudiant/cours/[courseId]/page.tsx",
    "src/app/etudiant/cours/parcours/[slug]/page.tsx",
    "src/app/etudiant/seances/[id]/page.tsx",
  ];
  for (const file of files) {
    const code = await source(file);
    assert.match(code, /getViewer\(\)/, file);
    assert.doesNotMatch(code, /auth\.getUser\(\)/, file);
    assert.doesNotMatch(code, /user!\.id/, file);
  }
});

test("Mes cours présente une liste compacte filtrable sans supprimer Travail à faire", async () => {
  const courses = await source("src/app/etudiant/cours/page.tsx");
  const navigation = await source("src/lib/nav.tsx");

  assert.match(courses, /À venir/);
  assert.match(courses, /Passés/);
  assert.match(courses, /Formation du cœur/);
  assert.match(courses, /Caractère/);
  assert.match(courses, /Sensibilité ministérielle/);
  assert.match(courses, /Projet et formation/);
  assert.match(courses, /href="\/etudiant\/travail"/);
  assert.match(courses, /visible\.map\(\(session\)/);
  assert.match(navigation, /label: "Mes cours"/);
  assert.match(navigation, /label: "Travail à faire"/);
});

test("la page de séance dérive les permissions du même contexte sécurisé", async () => {
  const code = await source("src/app/etudiant/seances/[id]/page.tsx");
  assert.match(code, /viewer\.roles\.admin[\s\S]*?s\.session_type === "ministere"[\s\S]*?steeringMinistryIds\.includes\(s\.ministry_id\)/);
  assert.match(code, /getStudentAllSessions\(supabase, viewer\.id\)/);
  assert.match(code, /\.eq\("user_id", viewer\.id\)/);
});
