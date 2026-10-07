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
  assert.match(code, /grid w-full grid-cols-3/);
});

test("les tableaux critiques deviennent des listes ou cartes sur mobile", async () => {
  const code = await source("src/components/admin/StatisticsTab.tsx");
  assert.match(code, /sm:hidden.*document_title/s);
  assert.match(code, /space-y-3 sm:hidden.*program\.tracks/s);
  assert.doesNotMatch(code, /overflow-x-auto/);
});

test("les formulaires et filtres sensibles au tactile utilisent un panneau mobile", async () => {
  const [course, memberFilters, stats] = await Promise.all([
    source("src/components/admin/QuickCourseForm.tsx"),
    source("src/components/admin/MemberFilters.tsx"),
    source("src/components/admin/StatisticsTab.tsx"),
  ]);
  assert.match(course, /h-dvh w-full/);
  assert.match(course, /safe-area-inset-bottom/);
  assert.match(memberFilters, /w-full flex-col.*sm:w-\[430px\]/s);
  assert.match(stats, /max-h-\[85dvh\].*rounded-t-2xl/s);
});
