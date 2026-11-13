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

test("formations expose upcoming courses and deepening course creation", async () => {
  const [formations, detail, courses] = await Promise.all([
    read("src/app/gestion/formations/page.tsx"),
    read("src/app/gestion/formations/[id]/page.tsx"),
    read("src/app/gestion/admin/cours-formations/page.tsx"),
  ]);
  assert.match(formations, /Prochaines formations/);
  assert.match(formations, /entry\.date >= today/);
  assert.match(detail, /triggerLabel="Ajouter un cours"/);
  assert.match(courses, /label="Approfondissements"/);
  assert.match(courses, /countCategory\("deepening"\)/);
});

test("MAPP novelty ring disappears after completion and Fruit uses the v10 reading background", async () => {
  const [identity, fruit] = await Promise.all([
    read("src/app/etudiant/identite/identity.module.css"),
    read("src/components/apps/FruitSpiritJourney.module.css"),
  ]);
  assert.match(identity, /\.story_not-started \.storyRing\[data-story-key="profil-mapp"\]/);
  assert.doesNotMatch(identity, /\n\.storyRing\[data-story-key="profil-mapp"\],\n\.storyRing\[data-story-key="mapp"\] \{/);
  assert.match(fruit, /fruit-spirit-water-fruit-v10\.png/);
  assert.match(fruit, /background: rgb\(255 254 251 \/ 0\.975\)/);
});
