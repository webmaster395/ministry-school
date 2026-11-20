import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la navigation Admin utilise des liens autonomes et conserve tous les paramètres d’URL", () => {
  const tabs = read("src/components/SpaceTabs.tsx");
  assert.match(tabs, /<a key=\{item\.href\} href=\{item\.href\}/);
  assert.match(tabs, /new URLSearchParams\(query\)\.entries\(\)/);
  assert.doesNotMatch(tabs, /<Link[\s\S]*item\.href/);
});

test("les quatre vues du Pilotage ont une URL directe et un contenu exclusif", () => {
  const statistics = read("src/components/admin/StatisticsTab.tsx");
  for (const section of ["utilisation", "membres", "programmes", "initiatives"]) {
    assert.match(statistics, new RegExp(`statistiques=\\$\\{key\\}`));
    assert.match(statistics, new RegExp(`section === "${section}"`));
  }
  assert.match(statistics, /<a key=\{key\} href=\{`\/gestion\/admin\?onglet=pilotage&statistiques=\$\{key\}`\}/);
  assert.match(read("src/app/gestion/admin/loading.tsx"), /Chargement des données administratives/);
  assert.match(read("src/app/gestion/admin/error.tsx"), /données de cette section n’ont pas pu être chargées/);
});

test("Généropoly est servi par Ministry School et ne dépend plus du déploiement suspendu", () => {
  const page = read("src/app/apps/generopoly/page.tsx");
  const game = read("src/app/apps/generopoly/GeneropolyExperience.tsx");
  const config = read("vercel.json");
  assert.match(page, /GeneropolyExperience/);
  assert.doesNotMatch(config, /ma-generosite\.vercel\.app/);
  assert.match(game, /SESSION_STORAGE_KEY = "generopoly-progress"/);
  assert.doesNotMatch(game, /fetch\(appPath\("\/api\/(join|table|day)"\)/);
});

test("le parcours Généropoly conserve les montants et la synthèse validés", () => {
  const content = read("src/lib/generopoly/content-config.ts");
  assert.match(content, /amount: 750, unit: "€"/);
  assert.match(content, /Une semaine compte 168 heures/);
  assert.match(content, /amount: 28, unit: "h"/);
  assert.match(content, /id: "synthesis"/);
  assert.match(content, /id: "complete"/);
});
