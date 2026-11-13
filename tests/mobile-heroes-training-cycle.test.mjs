import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { activeTrainingCycleStart, activeTrainingMonth } from "../src/lib/training-cycle.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le cycle de novembre bascule sur décembre après le premier week-end", () => {
  assert.equal(activeTrainingMonth("2026-11-08"), "2026-11");
  assert.equal(activeTrainingMonth("2026-11-09"), "2026-12");
  assert.equal(activeTrainingCycleStart("2026-11-13"), "2026-12-01");
});

test("le cycle gère correctement le changement d'année", () => {
  assert.equal(activeTrainingMonth("2026-12-07"), "2027-01");
});

test("le résultat du Test des héros évite le défilement imbriqué sur mobile", async () => {
  const [page, css] = await Promise.all([
    read("src/app/etudiant/identite/mes-moteurs/page.tsx"),
    read("src/app/etudiant/identite/mes-moteurs/prototype.module.css"),
  ]);
  assert.match(page, /max-md:!h-auto/);
  assert.match(page, /max-md:!overflow-visible/);
  assert.match(css, /grid-template-columns:42px minmax\(0,1fr\)/);
});

test("la recherche des approfondissements neutralise le style natif du champ", async () => {
  const source = await read("src/components/formations/DeepeningAccessManager.tsx");
  assert.match(source, /appearance-none border-0/);
  assert.match(source, /Rechercher par nom/);
});
