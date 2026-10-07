import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const courseExperience = await readFile(
  new URL("../src/components/course/CourseExperience.tsx", import.meta.url),
  "utf8",
);
const studentWork = await readFile(
  new URL("../src/app/etudiant/travail/page.tsx", import.meta.url),
  "utf8",
);
const studentData = await readFile(
  new URL("../src/lib/data/student.ts", import.meta.url),
  "utf8",
);
const assignmentStepper = await readFile(
  new URL("../src/components/course/AssignmentStepper.tsx", import.meta.url),
  "utf8",
);
const teacherPanels = await readFile(
  new URL("../src/components/gestion/TeacherPanels.tsx", import.meta.url),
  "utf8",
);
const teacherSupports = await readFile(
  new URL("../src/app/enseignant/supports/page.tsx", import.meta.url),
  "utf8",
);

test("la fiche cours conserve toutes les sections métier", () => {
  for (const marker of [
    "À faire avant le cours",
    "Mettre en pratique",
    "Ressources du cours",
    "Objectifs à l’issue de ce cours",
    "course-notes",
    "videoUrl",
    "trainers",
  ]) {
    assert.match(courseExperience, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("les travaux utilisent la même source sur la fiche et la page Travail", () => {
  assert.match(studentWork, /getStudentAssignments/);
  assert.match(studentWork, /getStudentWorkItems/);
  assert.match(studentData, /\.from\("assignments"\)/);
  assert.match(studentData, /phase === "after"/);
  assert.match(studentWork, /after \? "after-course" : "before-course"/);
});

test("la navigation du cours distingue explicitement avant et après", () => {
  assert.match(courseExperience, /\["before-course", "À préparer"\]/);
  assert.match(courseExperience, /\["after-course", "Mettre en pratique"\]/);
});

test("un devoir long retrouve le rendu structuré des sous-consignes", () => {
  assert.match(courseExperience, /match\(\/\^#\{1,6\}/);
  assert.match(courseExperience, /sections\.length < 2/);
  assert.match(courseExperience, /section\.number\.padStart\(2, "0"\)/);
  assert.match(courseExperience, /bg-\[var\(--course-accent\)\]/);
  assert.match(courseExperience, /divide-y divide-border/);
  assert.match(courseExperience, /emphasizedQuestion/);
  assert.match(courseExperience, /rounded-lg bg-surface/);
});

test("les échéances pédagogiques suivent les cours réels et jamais un délai arbitraire", () => {
  assert.match(courseExperience, /À terminer avant le cours concerné/);
  assert.match(courseExperience, /À terminer avant le prochain cours/);
  assert.match(courseExperience, /nextCourseDate/);
  assert.match(assignmentStepper, /Prochain cours/);
  assert.match(studentWork, /dueLabels\(after, targetDate\)/);
  assert.doesNotMatch(teacherPanels, /setDate\(/);
  assert.doesNotMatch(teacherPanels, /afterDue/);
  assert.doesNotMatch(teacherSupports, /name="due_at"/);
});
