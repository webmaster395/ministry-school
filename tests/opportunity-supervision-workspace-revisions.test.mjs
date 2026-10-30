import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("supervision et préparation utilisent deux parcours explicites", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const workspace = source("src/components/OpportunityOperationalWorkspace.tsx");
  const submission = source("src/components/OpportunitySubmissionPanel.tsx");
  const review = source("src/components/OpportunityReviewPanel.tsx");
  assert.match(page, /globalScope[\s\S]*?<OpportunityEditForms/);
  assert.match(page, /<OpportunityOperationalWorkspace/);
  assert.match(workspace, /ESPACE PROJETS ET FORMATIONS/);
  assert.match(submission, /Soumettre à validation/);
  assert.doesNotMatch(submission, /Valider et publier|Valider et programmer/);
  assert.match(review, /Valider et publier maintenant/);
  assert.match(review, /Valider et programmer/);
});

test("une version publiée reste intacte jusqu'à l'approbation suivante", () => {
  const action = source("src/app/etudiant/services/actions.ts");
  const data = source("src/lib/data/opportunities.ts");
  const migration = source("supabase/migrations/20261030230000_opportunity_draft_revisions.sql");
  const reliableSaving = source("supabase/migrations/20261030280000_reliable_opportunity_saving.sql");
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(action, /save_opportunity_form/);
  assert.match(reliableSaving, /opportunity_row\.publication_status in \('published','scheduled'\)/);
  assert.match(reliableSaving, /insert into public\.opportunity_draft_revisions/);
  assert.match(data, /opportunity_management_revision/);
  assert.match(migration, /create table if not exists public\.opportunity_draft_revisions/);
  assert.match(migration, /delete from public\.opportunity_draft_revisions where opportunity_id=p_opportunity/);
  assert.match(migration, /SESSION_HAS_REGISTRATIONS/);
  assert.doesNotMatch(student, /opportunity_management_revision|mergeOpportunityManagementRevision/);
});

test("les anciennes interfaces redondantes ne sont plus accessibles", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const actions = source("src/app/etudiant/services/actions.ts");
  const migration = source("supabase/migrations/20261030230000_opportunity_draft_revisions.sql");
  assert.doesNotMatch(page, /Cours associés|Créer le premier cours|Aucun cours associé|Demander un complément/);
  assert.doesNotMatch(actions, /requestOpportunityContribution|request_opportunity_contribution/);
  assert.match(migration, /drop function if exists public\.request_opportunity_contribution/);
  assert.match(migration, /if p_context not in \('admin','ministry'\) then raise exception 'FORBIDDEN'/);
});

test("le matériel interne ne quitte jamais la supervision Super admin", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const workspace = source("src/components/OpportunityOperationalWorkspace.tsx");
  const pdf = source("src/app/gestion/projets-formations/[id]/pdf/route.ts");
  assert.match(page, /const maySeeInternalMaterial = superAdminView &&/);
  assert.match(workspace, /canManageInternalMaterial=\{false\}/);
  assert.match(pdf, /adminScope && viewer\?\.roles\.superAdmin/);
});
