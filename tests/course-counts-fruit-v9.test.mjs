import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin course inventory counts course records instead of dated sessions", async () => {
  const [page, data] = await Promise.all([
    read("src/app/gestion/admin/cours-formations/page.tsx"),
    read("src/lib/data/admin-hub.ts"),
  ]);

  assert.match(page, /from\("courses"\)\.select\("id, formation:formations\(category_key\)"\)/);
  assert.match(page, /new Set\(\[\.\.\.explicitCourseIds, \.\.\.sessionCourseIds\]\)/);
  assert.match(page, /count=\{countCategory\("heart"\)\}/);
  assert.match(page, /count=\{countCategory\("character"\)\}/);
  assert.match(data, /courses\(id,title,formation_id,formation:formations\(id,category_key\)\)/);
  assert.match(data, /s\.formation\?\.category_key \?\? s\.courses\?\.formation\?\.category_key/);
});

test("Fruit de l'Esprit uses dedicated text-free v13 crops and keeps the sober reading background", async () => {
  const [journey, identity, experience, page] = await Promise.all([
    read("src/components/apps/FruitSpiritJourney.module.css"),
    read("src/app/etudiant/identite/identity.module.css"),
    read("src/app/etudiant/identite/IdentityExperience.tsx"),
    read("src/app/etudiant/identite/page.tsx"),
  ]);

  assert.match(identity, /fruit-spirit-citrus-post-v13\.webp/);
  assert.match(experience, /fruit-spirit-citrus-post-v13\.webp/);
  assert.match(page, /fruit-spirit-citrus-story-v13\.webp/);
  assert.match(journey, /fruit-spirit-water-bubbles-v11\.png/);
  assert.match(journey, /--fruit-accent: #e79a24/);
  assert.match(journey, /backdrop-filter: blur\(8px\)/);
});
