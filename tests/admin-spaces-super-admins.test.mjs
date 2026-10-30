import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la sidebar étudiante historique reste inchangée", async () => {
  const nav = await source("src/lib/nav.tsx");
  const studentBlock = nav.slice(nav.indexOf("export const studentSections"), nav.indexOf("export const notesNavItem"));
  assert.match(studentBlock, /label: "Accueil"/);
  assert.match(studentBlock, /label: "Calendrier"/);
  assert.match(studentBlock, /label: "Mes cours"/);
  assert.match(studentBlock, /label: "Travail à faire"/);
  assert.match(studentBlock, /label: "Projets et formations"/);
  assert.doesNotMatch(studentBlock, /label: "Administrateur"|label: "À valider"|label: "Pilotage ministère"/);
});

test("les espaces administratifs suivent l'ordre et le comportement un ou plusieurs", async () => {
  const [nav, blocks] = await Promise.all([
    source("src/lib/nav.tsx"),
    source("src/components/NavBlocks.tsx"),
  ]);
  const superAdmin = nav.indexOf('key: "superAdmin"');
  const admin = nav.indexOf('key: "admin"');
  const steering = nav.indexOf('key: "steering"');
  const projects = nav.indexOf('key: "projectsTraining"');
  assert.ok(superAdmin < admin && admin < steering && steering < projects);
  assert.match(nav, /if \(roles\.superAdmin\)/);
  assert.match(nav, /if \(roles\.admin && !roles\.superAdmin\)/);
  assert.match(nav, /if \(roles\.steeringMinistryIds\.length > 0\)/);
  assert.match(nav, /if \(roles\.projectsTraining\)/);
  assert.match(blocks, /Mon espace admin/);
  assert.match(blocks, /Mes espaces admin/);
  assert.match(blocks, /multiple \? \(/);
  assert.match(blocks, /admin-spaces-open/);
  assert.match(blocks, /pendingValidationCount/);
  assert.match(blocks, /space\.key === "superAdmin"/);
});

test("exactement les trois comptes nominatifs obtiennent la super administration", async () => {
  const migration = await source("supabase/migrations/20261030120000_admin_spaces_and_super_admins.sql");
  const functionBody = migration.slice(migration.indexOf("create or replace function public.is_super_admin"), migration.indexOf("-- Les trois comptes existent déjà"));
  const emails = [...functionBody.matchAll(/'([^']+@[^']+)'/g)].map((match) => match[1]);
  assert.deepEqual(emails, [
    "r.tamard@gmail.com",
    "flora.demerle@mlkgrandparis.com",
    "nathalie.boudehent@eglisemlk.fr",
  ]);
  assert.match(migration, /update public\.profiles p set role = 'admin'/);
  assert.match(migration, /update auth\.users u set raw_app_meta_data/);
  assert.doesNotMatch(migration, /insert into auth\.users|insert into public\.profiles/);
});

test("l'espace Administrateur réunit tableau de bord, statistiques, programme, membres et rôles", async () => {
  const [nav, page, overview, users, exportRoute] = await Promise.all([
    source("src/lib/nav.tsx"),
    source("src/app/gestion/admin/page.tsx"),
    source("src/components/admin/OverviewTab.tsx"),
    source("src/app/gestion/admin/utilisateurs/page.tsx"),
    source("src/app/gestion/admin/utilisateurs/export/route.ts"),
  ]);
  const adminBlock = nav.slice(nav.indexOf('key: "admin"'), nav.indexOf('key: "steering"'));
  assert.match(adminBlock, /Tableau de bord/);
  assert.match(adminBlock, /Statistiques/);
  assert.match(adminBlock, /Programme/);
  assert.match(adminBlock, /Membres/);
  assert.match(adminBlock, /Rôles/);
  assert.doesNotMatch(adminBlock, /Utilisateurs|Projets et formations/);
  assert.match(page, /\["vue", "statistiques", "programme", "membres", "roles"\]/);
  assert.match(page, /MembersTab/);
  assert.match(page, /RolesTab/);
  assert.doesNotMatch(page, /ProjectsTab/);
  assert.doesNotMatch(overview, /onglet=membres|onglet=projets|Examiner et valider/);
  assert.match(users, /redirect\("\/gestion\/admin"\)/);
  assert.match(exportRoute, /getMembers/);
  assert.match(exportRoute, /if \(!viewer\.roles\.admin\)/);
});

test("les statistiques agrègent les projets et formations sans ouvrir leur gestion", async () => {
  const [component, data, migration] = await Promise.all([
    source("src/components/admin/StatisticsTab.tsx"),
    source("src/lib/data/admin.ts"),
    source("supabase/migrations/20261030130000_admin_opportunity_analytics.sql"),
  ]);
  assert.match(component, /Projets et formations/);
  assert.match(component, /Initiatives les plus mobilisatrices/);
  assert.match(component, /Taux de remplissage/);
  assert.match(component, /Cycle de publication/);
  assert.match(data, /admin_opportunity_analytics/);
  assert.match(migration, /if not public\.is_platform_admin\(\) then/);
  assert.doesNotMatch(migration, /grant .* on public\.opportunities/);
});

test("la fiche membre rassemble contact, compte, responsabilités et inscriptions", async () => {
  const detail = await source("src/app/gestion/admin/membres/[id]/page.tsx");
  assert.match(detail, /Adresse e-mail/);
  assert.match(detail, /Téléphone/);
  assert.match(detail, /Dernière connexion/);
  assert.match(detail, /SENSIBILITÉ MINISTÉRIELLE/);
  assert.match(detail, /DROITS ET RESPONSABILITÉS/);
  assert.match(detail, /Cours suivis/);
  assert.match(detail, /Projets et formations/);
  assert.match(detail, /opportunity_assignments/);
  assert.match(detail, /opportunity_date_registrations/);
});

test("projets et pilotage sont bornés aux affectations explicites côté serveur", async () => {
  const migration = await source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  assert.match(migration, /can_edit_opportunity[\s\S]*?opportunity_assignments[\s\S]*?assignment\.can_edit/);
  assert.match(migration, /can_submit_opportunity[\s\S]*?responsibility = 'manager'/);
  assert.match(migration, /has_projects_training_access[\s\S]*?opportunity_assignments/);
  assert.match(migration, /can_create_opportunities/);
  assert.match(migration, /is_strict_pilotage_for[\s\S]*?ministry_lead_of = p_ministry[\s\S]*?ministry_delegates/);
  assert.doesNotMatch(migration.slice(migration.indexOf("create or replace function public.is_strict_pilotage_for"), migration.indexOf("create or replace function public.strict_pilotage_ministries")), /p\.ministry_id = p_ministry/);
});

test("seuls le responsable ministériel et les super administratrices créent un cours", async () => {
  const [migration, page, board, nav, communication] = await Promise.all([
    source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql"),
    source("src/app/gestion/pilotage/page.tsx"),
    source("src/components/PrepBoard.tsx"),
    source("src/lib/nav.tsx"),
    source("src/app/gestion/communication/page.tsx"),
  ]);
  assert.match(migration, /create_ministry_course[\s\S]*?is_super_admin\(\)[\s\S]*?is_ministry_lead_for\(p_ministry\)/);
  assert.match(page, /canCreateCourse = leadProfile\?\.ministry_lead_of === ministry\.id/);
  assert.match(board, /ministry\?\.id && canCreateCourse/);
  const steeringBlock = nav.slice(nav.indexOf('key: "steering"'), nav.indexOf('key: "projectsTraining"'));
  assert.doesNotMatch(steeringBlock, /Communication/);
  assert.match(communication, /redirect\(viewer\.roles\.steeringMinistryIds\.length \? "\/gestion\/pilotage" : "\/gestion\/admin"\)/);
});

test("les validations et leur compteur sont réservés aux super administratrices", async () => {
  const [migration, page, viewer] = await Promise.all([
    source("supabase/migrations/20261030120000_admin_spaces_and_super_admins.sql"),
    source("src/app/gestion/a-valider/page.tsx"),
    source("src/lib/data/viewer.ts"),
  ]);
  assert.match(page, /if \(!viewer\?\.roles\.superAdmin\) redirect\("\/etudiant"\)/);
  assert.match(migration, /validation_queue[\s\S]*?if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
  assert.match(migration, /pending_validation_count[\s\S]*?opportunity_review_requests[\s\S]*?ministry_course_review_requests/);
  assert.match(migration, /review_opportunity[\s\S]*?if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
  assert.match(viewer, /pendingValidationCount: Number\(data\.pending_validation_count \?\? 0\)/);
});
