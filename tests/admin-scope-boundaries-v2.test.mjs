import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la super administration possède un portail unique et protégé", () => {
  const nav = source("src/lib/nav.tsx");
  const portal = source("src/app/gestion/super-admin/page.tsx");
  const layout = source("src/app/gestion/super-admin/layout.tsx");
  assert.match(nav, /label: "Super administration"/);
  assert.match(nav, /href: "\/gestion\/super-admin"/);
  assert.match(portal, /Cours et formations/);
  assert.match(portal, /Sensibilités ministérielles/);
  assert.match(portal, /Membres et permissions/);
  assert.match(layout, /roles\.superAdmin/);
});

test("lecture, écriture et soumission des contributeurs restent distinctes", () => {
  const migration = source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  assert.match(migration, /opportunity_assignments[\s\S]*?can_edit boolean not null default false/);
  assert.match(migration, /ministry_delegates[\s\S]*?can_edit boolean not null default false/);
  assert.match(migration, /can_edit_opportunity[\s\S]*?assignment\.can_edit/);
  assert.match(migration, /can_submit_opportunity[\s\S]*?responsibility = 'manager'/);
  assert.match(migration, /set_opportunity_contributor_access/);
  assert.match(migration, /set_ministry_contributor_access/);
});

test("seule la Super administration affecte les personnes et supprime définitivement", () => {
  const migration = source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  assert.match(migration, /replace_opportunity_assignments[\s\S]*?if not public\.is_super_admin\(\)/);
  assert.match(migration, /delete_opportunity_admin[\s\S]*?if not public\.is_super_admin\(\)/);
  assert.match(migration, /set_user_access_v2[\s\S]*?if not public\.is_super_admin\(\)/);
  assert.match(migration, /request_opportunity_archive/);
});

test("le composant de sélection commun remplace les menus natifs des écrans principaux", () => {
  const component = source("src/components/admin/AdminSelect.tsx");
  assert.match(component, /role="listbox"/);
  assert.match(component, /Rechercher…/);
  for (const path of [
    "src/components/admin/MemberFilters.tsx",
    "src/components/admin/StatisticsTab.tsx",
    "src/components/admin/QuickCourseForm.tsx",
    "src/components/SessionEditForm.tsx",
    "src/components/OpportunityEditForms.tsx",
  ]) assert.match(source(path), /AdminSelect/);
});

test("l'espace étudiant n'est pas modifié par la migration de permissions", () => {
  const migration = source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  assert.doesNotMatch(migration, /opportunity_date_registrations|student_ministry_visibility|register_for_opportunity_dates/);
});
