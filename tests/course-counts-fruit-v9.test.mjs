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

test("Fruit de l'Esprit uses the text-free v12 post and keeps the sober reading background", async () => {
  const [journey, identity, experience, page] = await Promise.all([
    read("src/components/apps/FruitSpiritJourney.module.css"),
    read("src/app/etudiant/identite/identity.module.css"),
    read("src/app/etudiant/identite/IdentityExperience.tsx"),
    read("src/app/etudiant/identite/page.tsx"),
  ]);

  for (const source of [identity, experience, page]) {
    assert.match(source, /fruit-spirit-post-story-v12\.webp/);
  }
  assert.match(journey, /fruit-spirit-water-bubbles-v11\.png/);
  assert.match(journey, /background: rgb\(255 254 251 \/ 0\.975\)/);
  assert.match(journey, /backdrop-filter: blur\(8px\)/);
});
