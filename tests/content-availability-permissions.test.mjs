import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("vidéo, supports et devoirs partagent le même sélecteur de disponibilité", async () => {
  const panels = await source("src/components/gestion/TeacherPanels.tsx");
  const dialog = await source("src/components/ResourceDialog.tsx");
  const picker = await source("src/components/AvailabilityPicker.tsx");
  assert.match(panels, /prefix="video_availability"/);
  assert.ok([...panels.matchAll(/<AvailabilityPicker/g)].length >= 4);
  assert.match(dialog, /<AvailabilityPicker label="Disponibilité du support"/);
  assert.match(picker, /Maintenant/);
  assert.match(picker, /Programmer/);
  assert.doesNotMatch(dialog, /name="visibility"/);
});

test("les contenus programmés sont filtrés côté étudiant et côté base", async () => {
  const student = await source("src/lib/data/student.ts");
  const page = await source("src/app/etudiant/seances/[id]/page.tsx");
  const route = await source("src/app/etudiant/ressources/[materialId]/ouvrir/route.ts");
  const migration = await source("supabase/migrations/20261029120000_content_availability_and_pilotage_scope.sql");
  assert.match(student, /from\("assignments"\)[\s\S]*?lte\("visible_at"/);
  assert.match(page, /from\("session_videos"\)[\s\S]*?lte\("visible_at"/);
  assert.match(route, /lte\("visible_at"/);
  assert.match(migration, /visible_at <= now\(\)/);
  assert.match(migration, /update public\.sessions set video_url = null/);
});

test("le pilotage est limité au ministère exact sans réduire les droits administrateur", async () => {
  const migration = await source("supabase/migrations/20261029120000_content_availability_and_pilotage_scope.sql");
  const preparation = await source("src/app/gestion/enseignement/preparation/[id]/page.tsx");
  const studentPage = await source("src/app/etudiant/seances/[id]/page.tsx");
  const pilotage = await source("src/app/gestion/pilotage/page.tsx");
  assert.match(migration, /public\.is_platform_admin\(\)[\s\S]*?s\.session_type = 'ministere'[\s\S]*?public\.is_pilotage_for\(s\.ministry_id\)/);
  assert.match(migration, /drop policy if exists "enrollments teacher reads for own sessions"/);
  assert.match(migration, /drop policy if exists "profiles teacher reads enrolled students"/);
  for (const code of [preparation, studentPage]) {
    assert.match(code, /viewer\.roles\.admin \|\|/);
    assert.match(code, /steeringMinistryIds\.includes\(s\.ministry_id\)/);
  }
  assert.match(pilotage, /\.eq\("ministry_id", ministry\.id\)/);
  assert.match(pilotage, /Étudiants inscrits à cette sensibilité/);
});

test("l'enregistrement des disponibilités n'envoie aucune notification", async () => {
  const actions = await source("src/app/gestion/pilotage/actions.ts");
  assert.doesNotMatch(actions, /notifyCourseContent|notifyNewSupport|from\("announcements"\)/);
});

