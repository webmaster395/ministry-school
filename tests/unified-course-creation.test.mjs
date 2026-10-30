import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("les trois contextes réutilisent le même formulaire complet", async () => {
  const [form, admin, ministry, opportunity] = await Promise.all([
    source("src/components/gestion/CourseCreationDialog.tsx"),
    source("src/components/admin/QuickCourseForm.tsx"),
    source("src/components/gestion/AddCourseDialog.tsx"),
    source("src/app/gestion/projets-formations/[id]/page.tsx"),
  ]);
  for (const label of ["Informations générales", "Date, horaires et lieu", "Cadre pédagogique", "Contenus pédagogiques", "Vidéo", "Supports et ressources", "Devoirs"]) assert.match(form, new RegExp(label));
  assert.match(admin, /CourseCreationDialog/);
  assert.match(ministry, /CourseCreationDialog/);
  assert.match(opportunity, /context="opportunity"/);
  assert.match(opportunity, /Créer un cours/);
  assert.match(opportunity, /Cours associés/);
});

test("la création et les contenus d'initiative sont contrôlés côté base", async () => {
  const [migration, studentData] = await Promise.all([
    source("supabase/migrations/20261030190000_unified_course_creation.sql"),
    source("src/lib/data/student.ts"),
  ]);
  assert.match(migration, /add column if not exists opportunity_id/);
  assert.match(migration, /create or replace function public\.create_course_draft/);
  assert.match(migration, /public\.can_submit_opportunity\(v_opportunity\)/);
  assert.match(migration, /public\.is_ministry_lead_for\(v_ministry\)/);
  assert.match(migration, /materials_opportunity_visibility/);
  assert.match(migration, /assignments_opportunity_visibility/);
  assert.match(migration, /session_videos_opportunity_visibility/);
  assert.doesNotMatch(migration, /insert into public\.announcements/);
  assert.match(studentData, /\.is\("opportunity_id", null\)/);
});

test("le matériel d'organisation reste privé aux super administrateurs", async () => {
  const [page, editor, action] = await Promise.all([
    source("src/app/gestion/projets-formations/[id]/page.tsx"),
    source("src/components/OpportunityEditForms.tsx"),
    source("src/app/etudiant/services/actions.ts"),
  ]);
  assert.match(page, /can_review_editorial_content/);
  assert.match(editor, /canManageInternalMaterial && <WorkshopMaterialsInput/);
  assert.match(action, /can_review_editorial_content/);
});
