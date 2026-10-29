import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("la publication exige une validation de Nathalie ou Flora et Richard reste observateur", async () => {
  const [workflow, single] = await Promise.all([
    source("supabase/migrations/20261029170000_opportunity_editorial_review.sql"),
    source("supabase/migrations/20261029180000_single_review_and_opportunity_resources.sql"),
  ]);
  assert.match(workflow, /nathalie\.boudehent@eglisemlk\.fr/);
  assert.match(workflow, /flora\.demerle@mlkgrandparis\.com/);
  assert.match(workflow, /r\.tamard@gmail\.com/);
  assert.match(workflow, /REVIEW_REQUIRED/);
  assert.match(workflow, /opportunity_review_preview/);
  assert.match(single, /status = 'approved'/);
  assert.doesNotMatch(single, /v_approved = 2/);
});

test("les corrections et demandes de complément notifient seulement l’équipe affectée", async () => {
  const workflow = await source("supabase/migrations/20261029170000_opportunity_editorial_review.sql");
  assert.match(workflow, /from public\.opportunity_assignments where opportunity_id = p_opportunity/);
  assert.match(workflow, /opportunity_changes_requested/);
  assert.match(workflow, /opportunity_contribution_requested/);
  assert.match(workflow, /recipient_id/);
  assert.match(workflow, /after insert on public\.opportunity_assignments/);
});

test("supports, ressources et liens sont privés jusqu’à l’accès autorisé", async () => {
  const [migration, editor, studentPage, route] = await Promise.all([
    source("supabase/migrations/20261029180000_single_review_and_opportunity_resources.sql"),
    source("src/components/OpportunityResourcesEditor.tsx"),
    source("src/app/etudiant/services/[id]/page.tsx"),
    source("src/app/etudiant/services/[id]/ressources/[resourceId]/ouvrir/route.ts"),
  ]);
  assert.match(migration, /create table if not exists public\.opportunity_resources/);
  assert.match(migration, /'support', 'resource', 'link'/);
  assert.match(migration, /'opportunity-resources', 'opportunity-resources', false/);
  assert.match(migration, /public\.opportunity_is_visible/);
  assert.match(editor, /Supports et ressources/);
  assert.match(editor, /name="external_url"/);
  assert.match(editor, /name="file"/);
  assert.match(studentPage, /getOpportunityResources/);
  assert.match(route, /createSignedUrl/);
});
