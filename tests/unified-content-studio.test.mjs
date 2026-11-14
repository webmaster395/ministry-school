import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("l’administration réunit outils et ressources dans un espace à deux onglets", () => {
  const page = read("src/app/gestion/admin/page.tsx");
  const nav = read("src/lib/nav.tsx");
  assert.match(page, /title="Outils et ressources"/);
  assert.match(page, /contenu=outils/);
  assert.match(page, /contenu=ressources/);
  assert.match(page, /title="Outils"/);
  assert.match(page, /title="Ressources"/);
  assert.equal((nav.match(/label: "Outils et ressources"/g) || []).length, 1);
  assert.doesNotMatch(nav, /label: "Gestion des outils"|label: "Gestion des ressources"/);
});

test("les trois tests de grâce obtiennent des fiches indépendantes sans toucher aux résultats", () => {
  const migration = read("supabase/migrations/20261114033000_split_grace_identity_catalog.sql");
  const slugs = read("src/lib/apps/grace-identity.ts");
  for (const slug of ["fruit-de-lesprit", "dons-spirituels", "competences-naturelles"]) {
    assert.match(migration, new RegExp(slug));
    assert.match(slugs, new RegExp(slug));
  }
  assert.match(migration, /archived_at = coalesce\(archived_at, now\(\)\)/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.grace_identity_assessments/i);
});

test("Fruit de l’Esprit utilise le raisin bleu-violet nocturne", () => {
  const identity = read("src/app/etudiant/identite/page.tsx");
  const migration = read("supabase/migrations/20261114050000_select_blue_violet_fruit_artwork.sql");
  assert.match(identity, /fruit-spirit-blue-violet-grape-story-v26\.png/);
  assert.match(identity, /fruit-spirit-blue-violet-grape-post-v26\.png/);
  assert.match(migration, /fruit-spirit-blue-violet-grape-story-v26\.png/);
  assert.match(migration, /fruit-spirit-blue-violet-grape-post-v26\.png/);
});

test("les super administrateurs voient tous les outils, même avant publication", () => {
  const identityPage = read("src/app/etudiant/identite/page.tsx");
  assert.match(identityPage, /viewer\.roles\.superAdmin[\s\S]*getCatalogApps\(\{ includeUnpublished: true, includeArchived: false, channel: "admin" \}\)/);
});

test("Qui je suis conserve son contenu sans répéter le titre Ma personnalité", () => {
  const identity = read("src/app/etudiant/identite/IdentityExperience.tsx");
  assert.doesNotMatch(identity, />Ma personnalité</);
  assert.match(identity, /props\.stories/);
  assert.match(identity, /props\.results/);
});

test("la carte Fruit de l’Esprit conserve la photo sans voile blanc", () => {
  const styles = read("src/app/etudiant/identite/identity.module.css");
  const finalFruitShade = styles.lastIndexOf(".fruitPost .postShade");
  const nextRule = styles.indexOf("}", finalFruitShade);
  assert.match(styles.slice(finalFruitShade, nextRule + 1), /background: none/);
});
