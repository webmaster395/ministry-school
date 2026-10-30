import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le titre possède une seule saisie et pilote l’aperçu de bannière", () => {
  const create = source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = source("src/components/OpportunityEditForms.tsx");
  const actions = source("src/app/etudiant/services/actions.ts");
  const list = source("src/app/gestion/projets-formations/page.tsx");
  const pdf = source("src/app/gestion/projets-formations/[id]/pdf/route.ts");
  assert.match(create, /<Label>Titre \*<\/Label><input name="title" required value=\{title\}/);
  assert.match(edit, /<Label>Titre \*<\/Label><input name="title" required readOnly=\{!canManage\} value=\{title\}/);
  assert.match(create, /OpportunityBanner emoji=\{emoji\} title=\{title \|\|/);
  assert.match(edit, /OpportunityBanner emoji=\{emoji\} title=\{title \|\|/);
  assert.doesNotMatch(edit, /<Label light>Nom/);
  assert.match(actions, /title: text\(formData, "title"\)/);
  assert.match(list, /OpportunityBanner emoji=\{row\.banner_emoji\} title=\{row\.title\}/);
  assert.match(pdf, /new SimplePdf\(opportunity\.title\)/);
});

test("les actions et grilles de gestion se replient avant de déborder", () => {
  const list = source("src/app/gestion/projets-formations/page.tsx");
  const detail = source("src/app/gestion/projets-formations/[id]/page.tsx");
  const header = source("src/components/management/ManagementPageHeader.tsx");
  const form = source("src/components/OpportunityEditForms.tsx");
  assert.match(list, /Créer un projet ou une formation/);
  assert.match(list, /sm:w-auto/);
  assert.match(header, /management-page-actions/);
  assert.match(detail, /min-\[390px\]:grid-cols-2/);
  assert.match(form, /lg:grid-cols-\[1\.2fr_\.7fr_\.7fr_\.7fr_auto\]/);
});
