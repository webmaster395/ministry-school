import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workPage = readFileSync(
  new URL("../src/app/etudiant/travail/page.tsx", import.meta.url),
  "utf8",
);
const studentData = readFileSync(
  new URL("../src/lib/data/student.ts", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../src/app/etudiant/travail/actions.ts", import.meta.url),
  "utf8",
);
const homePage = readFileSync(
  new URL("../src/app/etudiant/page.tsx", import.meta.url),
  "utf8",
);

test("les travaux de la première journée ne sont plus exclus", () => {
  assert.doesNotMatch(workPage, /firstDaySessionIds/);
  assert.doesNotMatch(workPage, /FIRST_DAY/);
});

test("l’échéance utilise la prochaine séance réelle du parcours", () => {
  assert.match(studentData, /getNextRelevantSession/);
  assert.match(studentData, /session\.session_date > origin\.session_date/);
  assert.match(studentData, /session\.track[\s\S]*=== track/);
  assert.doesNotMatch(workPage, /setMonth|getMonth\(\) \+ 1/);
});

test("la Home et Travail à faire partagent la même projection des travaux", () => {
  assert.match(studentData, /export function getStudentWorkItems/);
  assert.match(workPage, /getStudentWorkItems\(assignments, sessions\)/);
  assert.match(homePage, /getStudentWorkItems\(assignments, allSessions\)/);
  assert.match(homePage, /const todoCount = todo\.length/);
  assert.doesNotMatch(homePage, /const todoCount = toPrepare\.length/);
});

test("la validation globale synchronise aussi les sous-consignes", () => {
  assert.match(actions, /from\("assignment_step_completions"\)/);
  assert.match(actions, /from\("assignment_steps"\)/);
});
