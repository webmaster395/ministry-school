import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la bibliothèque Ressources agrège les cours et les projets sans contourner les droits", () => {
  const nav = source("src/lib/nav.tsx");
  const page = source("src/app/etudiant/ressources/page.tsx");
  const data = source("src/lib/data/resource-library.ts");
  const library = source("src/components/ResourceLibrary.tsx");
  const identity = source("src/app/etudiant/identite/IdentityExperience.tsx");

  assert.match(nav, /label: "Ressources", href: "\/etudiant\/ressources"/);
  assert.match(nav, /label: "Mon ministère", href: "\/etudiant\/formation"/);
  assert.match(page, /getStudentResourceLibrary/);
  assert.match(data, /getStudentMaterials/);
  assert.match(data, /from\("session_videos"\)/);
  assert.match(data, /from\("opportunity_resources"\)/);
  assert.doesNotMatch(data, /createServiceClient/);
  assert.match(library, /Tous les formats/);
  assert.match(library, /Projets et formations/);
  assert.match(library, /PDF/);
  assert.match(library, /Vidéos/);
  assert.match(page, /Généropoly/);
  assert.match(page, /Profil MAPP/);
  assert.match(page, /Fruit de l’Esprit/);
  assert.match(page, /Dons spirituels/);
  assert.match(page, /Compétences naturelles/);
  assert.match(page, /Ma ligne de vie/);
  assert.match(library, /clamp\(1\.75rem,4vw,3rem\)/);
  assert.doesNotMatch(identity, /> Ressources\s*</);
});

test("une fiche déjà approuvée ne propose plus une deuxième validation", () => {
  const submission = source("src/components/OpportunitySubmissionPanel.tsx");
  const actions = source("src/app/etudiant/services/actions.ts");
  const editor = source("src/components/OpportunityEditForms.tsx");
  const session = source("src/components/SessionEditForm.tsx");
  const migration = source("supabase/migrations/20261113102000_opportunity_approval_is_final.sql");

  assert.match(submission, /Fiche validée une fois pour toutes/);
  assert.match(submission, /sans nouvelle demande de validation/);
  assert.doesNotMatch(submission, /Soumettre la nouvelle version/);
  assert.match(submission, /state\.status === "none" \|\| corrections/);
  assert.match(actions, /opportunity_review_state/);
  assert.match(actions, /alreadyApproved/);
  assert.match(editor, /Tout est enregistré/);
  assert.match(editor, /savedAt/);
  assert.match(session, /Modifications non enregistrées/);
  assert.match(session, /Tout est enregistré/);
  assert.match(migration, /old\.status = 'approved'/);
  assert.match(migration, /ALREADY_APPROVED/);
  assert.match(migration, /before update of status/);
});
