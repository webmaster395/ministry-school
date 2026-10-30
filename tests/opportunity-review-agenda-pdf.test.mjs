import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la validation vient après la fiche, le déroulé et le matériel interne", () => {
  const page = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const fiche = page.indexOf("<OpportunityEditForms");
  const agenda = page.indexOf("<OpportunityAgendaEditor");
  const internal = page.indexOf("maySeeInternalMaterial && <section");
  const review = page.indexOf("<OpportunityReviewPanel");
  assert.ok(fiche > -1 && fiche < agenda);
  assert.ok(agenda < internal && internal < review);
  assert.doesNotMatch(page, /OpportunityAssociatedCourses/);
});

test("un seul super administrateur décide de la publication ou demande les corrections", () => {
  const panel = source("src/components/OpportunityReviewPanel.tsx");
  const migration = source("supabase/migrations/20261030220000_opportunity_review_agenda_and_pdf.sql");
  assert.match(panel, /Valider et publier maintenant/);
  assert.match(panel, /Valider et programmer/);
  assert.match(panel, /Demander des corrections/);
  assert.doesNotMatch(panel, /Rose-Alice Tamard|Flora Demerle|Nathalie Boudehent|Demander un complément/);
  assert.match(migration, /if not public\.is_super_admin\(\) then raise exception 'FORBIDDEN'/);
  assert.match(migration, /where opportunity_id=p_opportunity for update/);
  assert.match(migration, /status='approved'/);
  assert.doesNotMatch(migration, /insert into public\.notifications/);
});

test("le déroulé est distinct par séance, contrôlé côté serveur et exporté en PDF", () => {
  const editor = source("src/components/OpportunityAgendaEditor.tsx");
  const migration = source("supabase/migrations/20261030220000_opportunity_review_agenda_and_pdf.sql");
  const pdf = source("src/app/gestion/projets-formations/[id]/pdf/route.ts");
  assert.match(editor, /Durée prévue : \{planned\} min \/ \{available\} min/);
  assert.match(editor, /Réutiliser un déroulé/);
  assert.match(editor, /Dépassement de/);
  assert.match(migration, /opportunity_date_id uuid not null/);
  assert.match(migration, /public\.can_edit_opportunity\(p_opportunity\)/);
  assert.match(pdf, /adminScope && viewer\?\.roles\.superAdmin \? await getOpportunityInternalMaterial/);
  assert.match(pdf, /Séances et déroulé pédagogique/);
  assert.doesNotMatch(pdf, /sessionParticipants|correctionMessage|annotations/);
});

test("la programmation saisie dans l'administration est interprétée en heure de Paris", () => {
  const actions = source("src/app/etudiant/services/actions.ts");
  assert.match(actions, /parisLocalDateTimeToIso/);
  assert.match(actions, /timeZone: "Europe\/Paris"/);
  assert.match(actions, /p_publish_at: publishAt/);
});
