import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le matériel d'organisation est migré vers un stockage privé nominatif", () => {
  const migration = source("supabase/migrations/20261030100000_private_opportunity_organization_material.sql");
  assert.match(migration, /create table if not exists public\.opportunity_internal_planning/);
  assert.match(migration, /insert into public\.opportunity_internal_planning/);
  assert.match(migration, /update public\.opportunities set organization_material = null/);
  assert.match(migration, /check \(organization_material is null\)/);
  assert.match(migration, /public\.can_review_editorial_content\(\)/);
  assert.match(migration, /if not public\.can_review_editorial_content\(\) then raise exception 'FORBIDDEN'/);
});

test("les chargements publics ne sélectionnent plus le besoin matériel interne", () => {
  const data = source("src/lib/data/opportunities.ts");
  const start = data.indexOf("export async function getOpportunities");
  const end = data.indexOf("export async function getOpportunityCounts");
  const publicQuery = data.slice(start, end);
  assert.doesNotMatch(publicQuery, /location, organization_material/);
  assert.match(publicQuery, /organization_material: null/);
  assert.match(data, /opportunity_internal_material/);
});

test("seuls les super administrateurs consultent et modifient le champ interne", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const editor = source("src/components/OpportunityEditForms.tsx");
  const create = source("src/components/admin/OpportunityCreateForm.tsx");
  const permissions = source("supabase/migrations/20261030120000_admin_spaces_and_super_admins.sql");
  assert.match(page, /maySeeInternalMaterial \? await getOpportunityInternalMaterial/);
  assert.match(page, /const internalMaterials = linesOf\(internalMaterial\)/);
  assert.match(page, /maySeeInternalMaterial && <section/);
  assert.match(editor, /canManageInternalMaterial && <WorkshopMaterialsInput/);
  assert.match(create, /canManageInternalMaterial && <div[^>]*><WorkshopMaterialsInput/);
  assert.match(permissions, /can_review_editorial_content[\s\S]*?is_super_admin/);
});

test("prérequis et matériel à apporter restent visibles aux participants", () => {
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(student, />Prérequis<\/h2>/);
  assert.match(student, /> Matériel à apporter<\/h2>/);
  assert.doesNotMatch(student, /organization_material|Matériel nécessaire à l’atelier/);
});
