import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Travail à faire affiche explicitement les devoirs en retard", async () => {
  const source = await read("src/app/etudiant/travail/page.tsx");
  assert.match(source, /const overdue = !done && Boolean\(a\.due_at\)/);
  assert.match(source, /overdue \? "En retard" : "À faire"/);
  assert.match(source, /const key = item\.origin\.id/);
  assert.match(source, /dueLabels\(a\.due_at\)/);
});

test("le calendrier utilise toutes les dates publiées de Projets et formations", async () => {
  const source = await read("src/app/etudiant/cours/page.tsx");
  assert.match(source, /publishedOpportunityDates/);
  assert.match(source, /title: "Projets et formations"/);
  assert.match(source, /registeredDays\.has\(date\.session_date\)/);
  assert.match(source, /href: `\/etudiant\/services\?jour=\$\{date\.session_date\}/);
});

test("les mois sans activité future disparaissent et les activités passées gardent leur date", async () => {
  const source = await read("src/app/etudiant/services/page.tsx");
  assert.match(source, /candidateMonthKeys\.filter/);
  assert.match(source, /hasPastSession/);
  assert.match(source, /tab === "termines"[\s\S]*date\.session_date < cycleStart/);
  assert.match(source, /"Dernière session"/);
});

test("la super administration retrouve cours et projets au niveau principal", async () => {
  const source = await read("src/lib/nav.tsx");
  assert.match(source, /label: "Cours", href: "\/gestion\/admin\/cours-formations"/);
  assert.match(source, /label: "Projets et formations", href: "\/gestion\/projets-formations\?scope=admin"/);
  assert.ok(source.indexOf('key: "formations"') < source.indexOf('key: "steering"'));
});

test("les contributeurs de formation ne voient que leur périmètre", async () => {
  const source = await read("src/app/gestion/formations/page.tsx");
  assert.match(source, /visibleFormationIds/);
  assert.match(source, /allFormations\.filter\(\(formation\) => visibleFormationIds\.has\(formation\.id\)\)/);
  assert.match(source, /DeepeningAccessManager/);
});

test("Fruit de l'Esprit utilise l'image finale sans sacrifier la lisibilité", async () => {
  const [css, identity] = await Promise.all([
    read("src/components/apps/FruitSpiritJourney.module.css"),
    read("src/app/etudiant/identite/IdentityExperience.tsx"),
  ]);
  assert.match(css, /fruit-spirit-water-bubbles-v11\.png/);
  assert.match(css, /fruit-spirit-water-fruit-v9\.png/);
  assert.match(css, /background:\s*rgb\(255 253 248 \/ 0\.9[48]\)/);
  assert.match(identity, /fruit-spirit-post-story-v12\.webp/);
});

test("le premier mois du parcours est compté dès son démarrage réel", async () => {
  const source = await read("src/app/etudiant/identite/page.tsx");
  assert.match(source, /if \(Number\.isNaN\(start\.getTime\(\)\) \|\| start > now\) return 0/);
  assert.match(source, /start\.getUTCMonth\(\) \+\s*1/);
});

test("la migration restaure uniquement le devoir d’octobre et ses validations", async () => {
  const migration = await read("supabase/migrations/20261113162000_restore_october_personal_work.sql");
  assert.match(migration, /Identifier et nettoyer sa cuve/);
  assert.match(migration, /assignment_completions/);
  assert.match(migration, /on conflict \(assignment_id, user_id\) do nothing/);
  assert.match(migration, /due_at = null/);
  assert.match(migration, /session_date >= '2026-11-01'/);
  assert.equal((migration.match(/insert into public\.assignments \(/g) ?? []).length, 1);
});
