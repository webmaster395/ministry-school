import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("les outils sont une liste facultative partagée par création modification et consultation", () => {
  const create = source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = source("src/components/OpportunityEditForms.tsx");
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  const data = source("src/lib/data/opportunities.ts");
  const pdf = source("src/app/gestion/projets-formations/[id]/pdf/route.ts");
  assert.match(create, /name="tools_used_items"[\s\S]*?Outils utilisés \(facultatif\)/);
  assert.match(edit, /name="tools_used_items"[\s\S]*?initialValue=\{o\.tools_used\}/);
  assert.match(student, /const tools = linesOf\(o\.tools_used\)/);
  assert.match(student, /\{tools\.length > 0 && <section[\s\S]*?>Outils utilisés<\/h2>/);
  assert.match(data, /tools_used: string \| null/);
  assert.match(pdf, /pdf\.heading\("Outils utilisés"\)/);
});

test("seuls outils et matériels restent facultatifs", () => {
  const create = source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = source("src/components/OpportunityEditForms.tsx");
  const actions = source("src/app/etudiant/services/actions.ts");
  const migration = source("supabase/migrations/20261030240000_opportunity_tools_and_required_fields.sql");
  for (const field of ["objectives_items", "speakers_items", "prerequisites_items"]) {
    assert.match(create, new RegExp(`name="${field}"[^>]*required`));
    assert.match(edit, new RegExp(`name="${field}"[^>]*required`));
  }
  assert.match(create, /name="location" required/);
  assert.match(create, /name="capacity" required/);
  assert.match(actions, /requireOpportunityFields\(formData/);
  assert.match(migration, /opportunity_missing_required_fields/);
  assert.match(migration, /REQUIRED_FIELDS:%/);
  assert.doesNotMatch(migration, /missing:=array_append\(missing,'(?:outils|matériel)/);
});

test("l'annuaire et les affectations restent réservés à la supervision Super admin", () => {
  const createPage = source("src/app/gestion/projets-formations/nouveau/page.tsx");
  const detail = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const action = source("src/app/etudiant/services/actions.ts");
  const permissions = source("supabase/migrations/20261030140000_separate_admin_scopes_and_contributor_access.sql");
  assert.match(createPage, /superAdminView \? getMembers\(supabase\) : Promise\.resolve\(\[\]\)/);
  assert.match(createPage, /canAssignMembers=\{superAdminView\}/);
  assert.match(detail, /superAdminView && <AssignmentEditor/);
  assert.doesNotMatch(detail, /ContributorAccessEditor|Accès des contributeurs/);
  assert.match(action, /if \(!isSuperAdmin\) throw new Error\("Seuls les super administrateurs peuvent gérer les affectations/);
  assert.match(permissions, /replace_opportunity_assignments[\s\S]*?if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
});
