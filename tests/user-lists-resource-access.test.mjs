import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/migrations/20261120113000_user_lists_and_resource_access.sql");
const categoryMigration = read("supabase/migrations/20261120170000_resource_access_list_categories.sql");

test("les listes sont distinctes des rôles et modifiables uniquement par un super administrateur", () => {
  assert.match(migration, /create table if not exists public\.user_lists/);
  assert.doesNotMatch(migration, /update public\.profiles set role/);
  assert.match(migration, /user_lists_super_admin_all[\s\S]*public\.is_super_admin\(\)/);
});

test("création, renommage et suppression conservent une identité stable", () => {
  assert.match(migration, /id uuid primary key default gen_random_uuid\(\)/);
  assert.match(migration, /user_lists_name_unique[\s\S]*lower\(trim\(name\)\)/);
  assert.match(migration, /touch_user_lists_updated_at/);
  assert.match(read("src/app/gestion/admin/list-actions.ts"), /createUserList[\s\S]*updateUserList[\s\S]*deleteUserList/);
});

test("un membre ne peut apparaître qu'une fois dans une liste mais dans plusieurs listes", () => {
  assert.match(migration, /primary key \(list_id, user_id\)/);
  assert.match(migration, /user_list_members_user_idx[\s\S]*\(user_id, list_id\)/);
});

test("les ressources acceptent plusieurs listes et les listes utilisent une logique OU", () => {
  assert.match(migration, /primary key \(resource_type, resource_id, list_id\)/);
  assert.match(migration, /join public\.user_list_members membership on membership\.list_id = list_access\.list_id/);
  assert.match(migration, /membership\.user_id = p_user/);
  assert.doesNotMatch(migration, /bool_and|every\(/);
});

test("les accès peuvent cumuler plusieurs listes et plusieurs catégories de listes", () => {
  assert.match(categoryMigration, /create table if not exists public\.resource_access_categories/);
  assert.match(categoryMigration, /resource_access_lists list_access[\s\S]*or exists[\s\S]*resource_access_categories category_access/);
  assert.match(categoryMigration, /category_access\.category = selected_list\.category/);
  const editor = read("src/components/admin/ResourceAccessEditor.tsx");
  assert.match(editor, /name="accessCategories"/);
  assert.match(editor, /Super administrateurs[\s\S]*listes[\s\S]*catégories/);
});

test("l'accès individuel est indépendant des listes", () => {
  assert.match(migration, /create table if not exists public\.resource_access_users/);
  assert.match(migration, /access_mode = 'selected_users'[\s\S]*resource_access_users direct_access/);
});

test("les super administrateurs gardent toujours l'accès et les comptes désactivés le perdent", () => {
  assert.match(migration, /if public\.is_super_admin\(p_user\) then return true/);
  assert.match(migration, /not coalesce\(profile\.deactivated, false\)/);
});

test("ajout et retrait d'une liste sont dynamiques sans matérialiser les permissions", () => {
  assert.match(migration, /from public\.resource_access_lists list_access[\s\S]*join public\.user_list_members membership/);
  assert.doesNotMatch(migration, /jsonb.*member|member.*jsonb/i);
  assert.match(read("src/lib/apps/catalog.ts"), /getCatalogApps\(\{ channel: "student" \}\)/);
});

test("une sélection de listes vide reste inaccessible aux utilisateurs ordinaires", () => {
  assert.match(migration, /if access_mode = 'selected_lists' then[\s\S]*return exists/);
  assert.match(read("src/components/admin/ResourceAccessEditor.tsx"), /Une sélection vide rend la ressource inaccessible/);
});

test("les ressources historiques sans règle conservent leur visibilité", () => {
  assert.match(migration, /if not found then return true/);
  assert.match(read("src/lib/resource-access.ts"), /if \(formData\.get\("accessConfigured"\) !== "1"\) return/);
});

test("les politiques restrictives protègent outils, supports et documents contre l'accès direct", () => {
  for (const name of ["app_catalog_segment_access", "materials_segment_access", "opportunity_resources_segment_access"]) {
    assert.match(migration, new RegExp(`${name}[\\s\\S]*as restrictive for select`));
  }
  assert.match(read("src/proxy.ts"), /catalogAppAllowed[\s\S]*redirect/);
  assert.match(read("src/app/etudiant/services/[id]/ressources/[resourceId]/ouvrir/route.ts"), /maybeSingle\(\)[\s\S]*download\(resource\.file_path\)/);
});

test("les nouveaux fichiers privés sont servis après contrôle et sans bucket public", () => {
  assert.match(migration, /'course-materials', 'course-materials', false/);
  assert.match(read("src/components/ResourceDialog.tsx"), /segmentedAccess[\s\S]*storage:\/\/course-materials\//);
  assert.match(read("src/app/etudiant/ressources/[materialId]/ouvrir/route.ts"), /download\(path\)[\s\S]*private, no-store/);
});

test("l'interface expose exactement les quatre modes et les sélections multiples", () => {
  const editor = read("src/components/admin/ResourceAccessEditor.tsx");
  for (const mode of ["all_authenticated", "super_admin_only", "selected_lists", "selected_users"]) assert.match(editor, new RegExp(mode));
  assert.match(editor, /name="accessListIds"/);
  assert.match(editor, /name="accessUserIds"/);
});

test("l'administration fournit recherche, catégories, membres et conséquences de suppression", () => {
  const lists = read("src/components/admin/ListsTab.tsx");
  assert.match(lists, /Créer une liste/);
  assert.match(lists, /Rechercher une liste/);
  assert.match(lists, /Ajouter des membres|ListMemberPicker/);
  assert.match(read("src/components/admin/DeleteUserListForm.tsx"), /Les autres listes et accès individuels seront conservés/);
});

test("Listes est visible comme onglet dans Utilisateurs et accès", () => {
  const page = read("src/app/gestion/admin/page.tsx");
  const tabs = read("src/components/admin/AdminAccessTabs.tsx");
  assert.match(page, /AdminAccessTabs active="listes"/);
  assert.match(page, /tab === "listes"/);
  assert.match(tabs, /aria-label="Utilisateurs et accès"/);
  for (const label of ["Membres", "Listes", "Permissions"]) assert.match(tabs, new RegExp(label));
  assert.match(tabs, /onglet=listes/);
});

