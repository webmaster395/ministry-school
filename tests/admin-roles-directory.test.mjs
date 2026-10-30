import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la gestion des rôles est séparée de l'annuaire des membres", () => {
  const members = source("src/components/admin/MembersTab.tsx");
  const roles = source("src/components/admin/RolesTab.tsx");
  const comment = source("src/components/admin/RoleCommentForm.tsx");
  assert.doesNotMatch(members, /MemberAccessEditor|Contributeurs ministériels|addDelegate/);
  assert.match(roles, /MemberAccessEditor/);
  assert.match(roles, /RoleAssignmentForm/);
  assert.match(source("src/components/admin/RoleAssignmentForm.tsx"), /Attribuer un rôle/);
  assert.match(comment, /Commentaire interne/);
});

test("l'annuaire des permissions agrège les catégories et le niveau Super admin", () => {
  const roles = source("src/components/admin/RolesTab.tsx");
  const migration = source("supabase/migrations/20261030180000_dynamic_super_admin_and_unified_admin.sql");
  assert.match(roles, /Administration/);
  assert.match(roles, /Projets et formations/);
  assert.match(roles, /Pilotage Ministère/);
  assert.match(source("src/components/admin/RoleAssignmentForm.tsx"), /Super admin/);
  assert.match(migration, /admin_role_directory/);
  assert.match(migration, /opportunity_assignments/);
  assert.match(migration, /ministry_delegates/);
  assert.match(migration, /p\.role\s*=\s*'admin'/);
});

test("les commentaires de rôles restent privés aux super admins", () => {
  const migration = source("supabase/migrations/20261030180000_dynamic_super_admin_and_unified_admin.sql");
  const actions = source("src/app/gestion/admin/actions.ts");
  assert.match(migration, /admin_member_role_notes_read[\s\S]*?public\.is_super_admin\(\)/);
  assert.match(migration, /admin_member_role_notes_write[\s\S]*?public\.is_super_admin\(\)/);
  assert.match(actions, /saveMemberRoleComment/);
  assert.match(actions, /saveMemberRoleComment[\s\S]*?assertSuperAdmin\(\)/);
  assert.doesNotMatch(actions, /queue_notification|insert_notification/);
});
