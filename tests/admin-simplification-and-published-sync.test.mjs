import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("super admins use one Admin space while delegated spaces stay assignment-scoped", async () => {
  const source = await read("src/lib/nav.tsx");
  assert.match(source, /key: "admin"/);
  assert.match(source, /Utilisateurs et accès/);
  assert.match(source, /Formations.*scope=admin/s);
  assert.match(source, /Projets et formations.*scope=admin/s);
  assert.match(source, /Pilotage ministère.*scope=admin/s);
  assert.match(source, /!roles\.superAdmin && roles\.formationCategoryKeys/);
  assert.match(source, /!roles\.superAdmin && roles\.projectsTraining/);
});

test("pilotage has an explicit super-admin scope and never stays in an infinite loader", async () => {
  const [page, data] = await Promise.all([
    read("src/app/gestion/pilotage/page.tsx"),
    read("src/lib/data/pilotage.ts"),
  ]);
  assert.match(page, /adminScope/);
  assert.match(page, /getAllSteeringMinistries/);
  assert.match(page, /Chargement impossible/);
  assert.match(data, /if \(error\) throw new Error/);
});

test("only super admins see course creation while assigned editors keep course links", async () => {
  const [formations, program] = await Promise.all([
    read("src/app/gestion/formations/page.tsx"),
    read("src/components/admin/ProgramTab.tsx"),
  ]);
  assert.match(formations, /adminScope && formations\.length === 1/);
  assert.match(formations, /allowCreate=\{adminScope\}/);
  assert.match(program, /allowCreate = !readOnly/);
  assert.match(program, /\{allowCreate && <QuickCourseForm/);
});

test("the saved published revision is promoted atomically and the previous public state is retained", async () => {
  const migration = await read("supabase/migrations/20261113171000_promote_saved_published_opportunity_revisions.sql");
  assert.match(migration, /publication_status in \('published','scheduled'\)/);
  assert.match(migration, /'_direct_snapshot',true/);
  assert.match(migration, /not exists\([\s\S]*opportunity_date_registrations/);
  assert.match(migration, /update public\.opportunities set/);
  assert.match(migration, /update public\.opportunity_draft_revisions set payload=old_payload,dates=old_dates/);
});

test("the profile menu exposes safe previews without changing the real role", async () => {
  const [selector, preview] = await Promise.all([
    read("src/components/AdminViewSelector.tsx"),
    read("src/app/gestion/admin/previsualisation/page.tsx"),
  ]);
  assert.match(selector, /Changer de vue sans changer de rôle/);
  assert.match(selector, /Vue super administrateur/);
  assert.match(selector, /Voir comme étudiant/);
  assert.match(preview, /ne sont jamais modifiés/);
  assert.match(preview, /scope=admin&preview/);
});
