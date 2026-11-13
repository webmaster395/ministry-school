import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("les cartes utilisent le compteur de la prochaine séance et non le total du projet", async () => {
  const page = await source("src/app/etudiant/services/page.tsx");
  assert.match(page, /getOpportunityDateCounts/);
  assert.doesNotMatch(page, /getOpportunityCounts/);
  assert.match(page, /sessionTaken/);
  assert.match(page, /sessionCapacity/);
  assert.match(page, /Prochaine session/);
  assert.match(page, /inscrits ·/);
});

test("la découverte se parcourt par mois puis par date jusqu’en juin", async () => {
  const page = await source("src/app/etudiant/services/page.tsx");
  assert.match(page, /endYear/);
  assert.match(page, /Date\.UTC\(endYear, 5, 1\)/);
  assert.match(page, /aria-label="Mois"/);
  assert.match(page, /aria-label="Dates du mois"/);
  assert.match(page, /Tout le mois/);
  assert.match(page, /opportunityIdsForDay/);
});

test("les étudiants ne voient plus les séances passées, contrairement aux responsables", async () => {
  const detail = await source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(detail, /canInspectHistory = rights\.admin \|\| rights\.assignments\.has\(id\)/);
  assert.match(detail, /canInspectHistory \? dates : dates\.filter\(\(date\) => date\.session_date >= today\)/);
  assert.match(detail, /visibleDates\.map/);
  assert.match(detail, /visibleDates\.some/);
});
