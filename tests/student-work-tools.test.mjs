import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workPage = readFileSync(
  new URL("../src/app/etudiant/travail/page.tsx", import.meta.url),
  "utf8",
);
const tabs = readFileSync(
  new URL("../src/components/TravailTabs.tsx", import.meta.url),
  "utf8",
);
const nav = readFileSync(
  new URL("../src/lib/nav.tsx", import.meta.url),
  "utf8",
);

test("Travail à faire conserve les devoirs et isole Mes outils", () => {
  assert.match(workPage, /type Tab = "a-faire" \| "termines" \| "outils"/);
  assert.match(workPage, /tab === "outils" \? \(\s*<ToolsPanel/);
  assert.match(workPage, /Chaque consigne reste visible jusqu’à ce que vous la cochiez/);
  assert.match(tabs, /Les statuts des devoirs restent groupés ; Mes outils est un espace distinct/);
  assert.doesNotMatch(nav, /label: "Mes outils"[\s\S]*href: "\/apps"/);
});

test("les compteurs des devoirs excluent les outils", () => {
  assert.match(workPage, /count: open\.length/);
  assert.match(workPage, /count: finished\.length/);
  assert.doesNotMatch(workPage, /label: "Mes outils",\s*count:/);
});

test("les tests et les outils libres n'utilisent pas le même statut", () => {
  assert.match(workPage, /tracked\.filter\(\(tool\) => tool\.completed\)/);
  assert.match(workPage, /Outils à explorer/);
  assert.match(workPage, /Accessibles à tout moment, sans statut de réalisation/);
  assert.match(workPage, /Généropoly/);
  assert.match(workPage, /Simulateur de générosité/);
});

test("les outils réutilisent les routes déjà employées dans Mon identité", () => {
  for (const route of [
    "/apps/profil-mapp",
    "/etudiant/identite/mes-moteurs",
    "/etudiant/identite/fruit-de-lesprit",
    "/etudiant/identite/dons-spirituels",
    "/etudiant/identite/competences-naturelles",
    "/etudiant/ligne-de-vie",
    "/apps/generopoly",
    "https://generosite.jeveuxdonner.fr/",
  ]) {
    assert.match(workPage, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
