import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la fiche alterne entre consultation et édition sans second formulaire visible", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const experience = source("src/components/OpportunityEditForms.tsx");
  assert.equal((page.match(/<OpportunityEditForms/g) ?? []).length, 1);
  assert.match(experience, /const \[editing, setEditing\] = useState\(workspaceStartsEditing\)/);
  assert.match(experience, /<Pencil size=\{16\} \/> Modifier/);
  assert.match(experience, /if \(!editing\)/);
  assert.match(experience, /<Consultation/);
  assert.match(experience, /<Save size=\{16\} \/>/);
  assert.match(experience, /workspaceHeader \? <WorkspaceCompactHeader/);
});

test("une sauvegarde unique est atomique, versionnée et indépendante de la soumission", () => {
  const actions = source("src/app/etudiant/services/actions.ts");
  const experience = source("src/components/OpportunityEditForms.tsx");
  const migration = source("supabase/migrations/20261030280000_reliable_opportunity_saving.sql");
  assert.match(actions, /export async function saveOpportunityInline/);
  assert.match(actions, /supabase\.rpc\("save_opportunity_form"/);
  assert.doesNotMatch(actions.slice(actions.indexOf("export async function saveOpportunityInline"), actions.indexOf("export async function replaceOpportunityAssignments")), /request_opportunity_review/);
  assert.match(migration, /for update/);
  assert.match(migration, /SAVE_CONFLICT/);
  assert.match(migration, /grant execute on function public\.save_opportunity_form/);
  assert.match(experience, /useActionState\(saveOpportunityInline, null\)/);
  assert.match(experience, /setConfirmation\(state\.message\)/);
  assert.match(experience, /requestSubmit/);
  assert.match(experience, /Modifications non enregistrées/);
  assert.match(experience, /Enregistrement…/);
  assert.match(experience, /base_updated_at/);
});

test("les modifications non enregistrées sont protégées", () => {
  const experience = source("src/components/OpportunityEditForms.tsx");
  assert.match(experience, /beforeunload/);
  assert.match(experience, /modifications non enregistrées/);
  assert.match(experience, /Abandonner les modifications non enregistrées/);
});

test("Organisation présente responsables, intervenants et inscriptions nominatives aux gestionnaires", () => {
  const experience = source("src/components/OpportunityEditForms.tsx");
  const student = source("src/app/etudiant/services/[id]/page.tsx");
  for (const label of ["Service pilote", "Responsable", "Intervenants", "Inscriptions par séance"]) {
    assert.match(experience, new RegExp(label));
  }
  assert.match(experience, /people\.map\(\(person\) => person\.full_name\)/);
  assert.doesNotMatch(student, /person\.full_name/);
});

test("la saisie emoji reste vide pendant le remplacement et accepte ensuite deux emojis", () => {
  const picker = source("src/components/OpportunityEmojiPicker.tsx");
  const parser = source("src/lib/opportunity-banner.ts");
  assert.match(picker, /onChange\(event\.target\.value\)/);
  assert.doesNotMatch(picker, /onChange\(opportunityEmoji\(event\.target\.value\)\)/);
  assert.match(parser, /slice\(0, 2\)/);
});
