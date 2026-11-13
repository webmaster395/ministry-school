import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("a published opportunity stays live after manager or editable contributor changes", async () => {
  const migration = await read("supabase/migrations/20261113153000_published_opportunity_updates_are_final.sql");
  assert.match(migration, /publication_status in \('published', 'scheduled'\)/);
  assert.match(migration, /assignment\.can_edit/);
  assert.match(migration, /status = 'approved'/);
});

test("formations use one category navigation and expose course creation", async () => {
  const [formations, detail] = await Promise.all([
    read("src/app/gestion/formations/page.tsx"),
    read("src/app/gestion/formations/[id]/page.tsx"),
  ]);
  assert.doesNotMatch(formations, /Prochaines formations/);
  assert.match(formations, /Formation du cœur/);
  assert.match(formations, /Formation du caractère/);
  assert.match(formations, /Formations d’approfondissement/);
  assert.match(formations, /entry\.date >= today/);
  assert.match(formations, /triggerLabel="Créer un cours"/);
  assert.match(detail, /triggerLabel="Ajouter un cours"/);
});

test("MAPP novelty ring disappears after completion and Fruit uses the v10 reading background", async () => {
  const [identity, fruit] = await Promise.all([
    read("src/app/etudiant/identite/identity.module.css"),
    read("src/components/apps/FruitSpiritJourney.module.css"),
  ]);
  assert.match(identity, /\.story_not-started \.storyRing\[data-story-key="profil-mapp"\]/);
  assert.doesNotMatch(identity, /\n\.storyRing\[data-story-key="profil-mapp"\],\n\.storyRing\[data-story-key="mapp"\] \{/);
  assert.match(fruit, /fruit-spirit-water-bubbles-v11\.png/);
  assert.match(fruit, /background: rgb\(255 254 251 \/ 0\.975\)/);
});
