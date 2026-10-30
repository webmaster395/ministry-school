import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la vue Pilotage n'hérite jamais du périmètre global Administrateur", async () => {
  const page = await source("src/app/gestion/pilotage/page.tsx");
  const teaching = await source("src/app/gestion/enseignement/page.tsx");
  const nav = await source("src/lib/nav.tsx");
  const scope = await source("src/lib/pilotage-scope.ts");
  assert.match(page, /const ministryIds = viewer\.roles\.steeringMinistryIds/);
  assert.doesNotMatch(page, /viewer\.roles\.admin[\s\S]*?from\("ministries"\)/);
  assert.doesNotMatch(teaching, /getTeacherPrepSessions/);
  assert.match(nav, /if \(roles\.steeringMinistryIds\.length > 0\)/);
  assert.match(scope, /pathname\.startsWith\("\/gestion\/pilotage"\)/);
  assert.match(scope, /steeringMinistryIds\.includes\(session\.ministry_id\)/);
});

test("la base isole les cinq sensibilités et leur visibilité étudiante", async () => {
  const migration = await source("supabase/migrations/20261029190000_ministry_editorial_workflow.sql");
  assert.match(migration, /m\.slug in \('apotre', 'prophete', 'evangeliste', 'pasteur', 'docteur'\)/);
  assert.match(migration, /create policy sessions_ministry_editorial_visibility/);
  assert.match(migration, /p\.ministry_id = sessions\.ministry_id/);
  assert.match(migration, /editorial_status = 'scheduled' and s\.publication_at <= now\(\)/);
  assert.match(migration, /not public\.is_strict_pilotage_for\(p_ministry\)/);
});

test("les responsables créent un brouillon à 10 h 30 puis le soumettent", async () => {
  const migration = await source("supabase/migrations/20261029190000_ministry_editorial_workflow.sql");
  const form = await source("src/components/gestion/AddCourseDialog.tsx");
  const panel = await source("src/components/MinistryCourseReviewPanel.tsx");
  assert.match(migration, /time '10:30', time '13:00'/);
  assert.match(migration, /p_session_date < date '2027-01-01'/);
  assert.match(form, /Créer le brouillon/);
  assert.doesNotMatch(form, /value="publish"/);
  assert.match(panel, /Soumettre à validation/);
  assert.match(panel, /Valider et publier maintenant/);
  assert.match(panel, /Valider et programmer/);
});

test("À valider reste nominatif, unifié et conserve les annotations privées", async () => {
  const migration = await source("supabase/migrations/20261029190000_ministry_editorial_workflow.sql");
  const spacesMigration = await source("supabase/migrations/20261030120000_admin_spaces_and_super_admins.sql");
  const page = await source("src/app/gestion/a-valider/page.tsx");
  const nav = await source("src/components/NavBlocks.tsx");
  assert.match(migration, /nathalie\.boudehent@eglisemlk\.fr/);
  assert.match(migration, /flora\.demerle@mlkgrandparis\.com/);
  assert.match(spacesMigration, /r\.tamard@gmail\.com/);
  assert.match(migration, /create table if not exists public\.ministry_course_annotations/);
  assert.match(migration, /requires_action boolean/);
  assert.match(page, /label="Projets"/);
  assert.match(page, /label="Formations"/);
  assert.match(page, /label="Cours de ministère"/);
  assert.match(page, /label="Historique"/);
  assert.match(page, /viewer\?\.roles\.superAdmin/);
  assert.match(nav, /pendingValidationCount/);
});

test("une révision publiée est clonée avant modification", async () => {
  const migration = await source("supabase/migrations/20261029190000_ministry_editorial_workflow.sql");
  const page = await source("src/app/gestion/enseignement/preparation/[id]/page.tsx");
  assert.match(migration, /create or replace function public\.clone_ministry_course_revision/);
  assert.match(migration, /revision_of/);
  assert.match(migration, /editorial_status = 'superseded'/);
  assert.match(page, /Créer une nouvelle version/);
});

test("le digest de 9 h attend aussi la publication réelle du cours", async () => {
  const migration = await source("supabase/migrations/20261029200000_digest_respects_course_publication.sql");
  assert.match(migration, /Europe\/Paris/);
  assert.match(migration, /s\.editorial_status = 'published'/);
  assert.match(migration, /s\.editorial_status = 'scheduled' and s\.publication_at <= p_run_at/);
  assert.match(migration, /course_content_notification_log/);
});
