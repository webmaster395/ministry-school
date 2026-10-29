import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la présentation rend les titres, le gras et les listes au lieu d'afficher le Markdown brut", () => {
  const renderer = source("src/components/FormattedContent.tsx");
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  const management = source("src/app/gestion/projets-formations/[id]/page.tsx");
  assert.ok(renderer.includes("const heading = line.match(/^(#{1,4})"));
  assert.match(renderer, /<strong/);
  assert.match(renderer, /kind === "list"/);
  assert.match(student, /<FormattedContent value={o\.description}/);
  assert.match(management, /<FormattedContent value={opportunity\.description}/);
});

test("un brouillon exige un aperçu explicite et autorisé", () => {
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  const management = source("src/app/gestion/projets-formations/[id]/page.tsx");
  assert.match(student, /query\.preview === "1" && \(rights\.admin \|\| rights\.assignments\.has\(id\)\)/);
  assert.match(student, /if \(!isPublished\(o\) && !canPreview\) redirect/);
  assert.match(management, /\?preview=1/);
});

test("les besoins internes et la capacité sont saisis sans dupliquer la section générale", () => {
  const form = source("src/components/OpportunityEditForms.tsx");
  const action = source("src/app/etudiant/services/actions.ts");
  const migration = source("supabase/migrations/20261029220000_opportunity_internal_planning_and_legacy_edits.sql");
  assert.match(form, /Besoins d’organisation/);
  assert.match(form, /<WorkshopMaterialsInput/);
  assert.equal((form.match(/name="capacity"/g) ?? []).length, 1);
  assert.match(action, /p_organization_material: list\(formData, "organization_material_items"\)/);
  assert.match(action, /p_capacity: capacity/);
  assert.match(migration, /update public\.opportunity_dates set capacity = p_capacity/);
  assert.match(migration, /drop constraint if exists opportunities_strategic_axes_check/);
});
