import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la navigation Admin mobile ne dépend plus d'un défilement horizontal", async () => {
  const code = await source("src/components/SpaceTabs.tsx");
  assert.match(code, /sm:hidden/);
  assert.match(code, /<details/);
  assert.match(code, /hidden flex-wrap items-center gap-2 sm:flex/);
});

test("les KPI Statistiques restent compacts dès 320 px", async () => {
  const code = await source("src/components/admin/StatisticsTab.tsx");
  assert.match(code, /grid grid-cols-2 gap-2\.5/);
  assert.match(code, /min-h-\[104px\]/);
  assert.match(code, /grid w-full grid-cols-2/);
  assert.match(code, /lg:grid-cols-4/);
});

test("les tableaux critiques deviennent des listes ou cartes sur mobile", async () => {
  const code = await source("src/components/admin/StatisticsTab.tsx");
  assert.match(code, /sm:hidden.*document_title/s);
  assert.match(code, /space-y-3 sm:hidden.*program\.tracks/s);
  assert.doesNotMatch(code, /overflow-x-auto/);
});

test("les formulaires et filtres sensibles au tactile utilisent un panneau mobile", async () => {
  const [courseEntry, course, memberFilters, stats] = await Promise.all([
    source("src/components/admin/QuickCourseForm.tsx"),
    source("src/components/gestion/CourseCreationDialog.tsx"),
    source("src/components/admin/MemberFilters.tsx"),
    source("src/components/admin/StatisticsTab.tsx"),
  ]);
  assert.match(course, /h-dvh w-full/);
  assert.match(course, /safe-area-inset-bottom/);
  assert.match(courseEntry, /CourseCreationDialog/);
  assert.match(memberFilters, /w-full flex-col.*sm:w-\[430px\]/s);
  assert.match(stats, /max-h-\[85dvh\].*rounded-t-2xl/s);
});

test("la page Membres reste dans le flux et utilise des cartes avant le grand écran", async () => {
  const [members, filters] = await Promise.all([
    source("src/components/admin/MembersTab.tsx"),
    source("src/components/admin/MemberFilters.tsx"),
  ]);
  assert.match(members, /overflow-x-hidden/);
  assert.match(members, /lg:grid-cols-\[1\.4fr_1fr_1\.6fr_110px_90px\]/);
  assert.match(members, /lg:hidden/);
  assert.match(filters, /grid-cols-\[minmax\(0,1fr\)_auto\]/);
  assert.match(filters, /min-h-0 flex-1.*overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(members, /\bsticky\b|\bfixed\b/);
});
