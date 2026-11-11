import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("les restitutions héros sont privées et rattachées au compte exact", () => {
  const migration = read("supabase/migrations/20261110213000_heroes_motors_results.sql");
  const importer = read("scripts/import-heroes-motors.mjs");

  assert.match(migration, /user_id uuid not null unique references public\.profiles\(id\)/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /publication_status = 'published'/);
  assert.match(importer, /normalizeEmail/);
  assert.match(importer, /auth\.admin\.listUsers/);
  assert.match(importer, /plusieurs réponses pour cet e-mail/);
  assert.doesNotMatch(importer, /levenshtein|fuzzy/i);
});

test("Mon identité ne montre que la restitution publiée de l'étudiant", () => {
  const identityPage = read("src/app/etudiant/identite/page.tsx");
  const resultLoader = read("src/lib/identity/heroes-motors.ts");
  const resultPage = read("src/app/etudiant/identite/mes-moteurs/page.tsx");

  assert.match(identityPage, /getPublishedHeroesMotorsResult\(viewer\.id\)/);
  assert.match(identityPage, /kind: "heroes-motors"/);
  assert.match(resultLoader, /\.eq\("user_id", userId\)/);
  assert.match(resultLoader, /\.eq\("publication_status", "published"\)/);
  assert.match(resultPage, /result\.portrait/);
  assert.match(resultPage, /result\.motors\.map/);
  assert.match(resultPage, /result\.heroes\.map/);
});
