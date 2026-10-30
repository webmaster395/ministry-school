import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function strategyModule() {
  const input = await source("src/lib/opportunity-strategy.ts");
  const output = ts.transpileModule(input, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const base = {
  title: "Initiative test",
  description: "Le contexte P décrit précisément le point de départ.",
  is_project: true,
  is_training: false,
  objectives: "Obtenir un résultat vérifiable",
  strategic_contribution_former: "Les participants développent la compétence F",
  strategic_contribution_auberge: "L’action accompagne le public A face au besoin B",
  strategic_contribution_fundraising: "Le partenariat R finance concrètement l’action M",
  strategic_axes_connection: "Ces contributions se complètent dans l’action C",
};

test("les sept combinaisons utilisent sept textes officiels distincts", async () => {
  const { strategicNarrativeOf, MLK_STRATEGIC_VISION } = await strategyModule();
  const combinations = [
    ["former"], ["auberge"], ["fundraising"],
    ["former", "auberge"], ["former", "fundraising"],
    ["auberge", "fundraising"], ["former", "auberge", "fundraising"],
  ];
  const texts = combinations.map((strategic_axes) => strategicNarrativeOf({ ...base, strategic_axes }).join("\n\n"));
  assert.equal(new Set(texts).size, 7);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["former"] }), MLK_STRATEGIC_VISION.texts.former.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["auberge"] }), MLK_STRATEGIC_VISION.texts.auberge.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["fundraising"] }), MLK_STRATEGIC_VISION.texts.une_place_de_plus.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["former", "auberge"] }), MLK_STRATEGIC_VISION.texts.former_auberge.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["former", "fundraising"] }), MLK_STRATEGIC_VISION.texts.former_une_place_de_plus.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["auberge", "fundraising"] }), MLK_STRATEGIC_VISION.texts.auberge_une_place_de_plus.paragraphs);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: ["former", "auberge", "fundraising"] }), MLK_STRATEGIC_VISION.texts.former_auberge_une_place_de_plus.paragraphs);
});

test("l'ordre de sélection ne change pas le texte et aucun axe masque la section", async () => {
  const { strategicNarrativeOf, strategicAxesComplete } = await strategyModule();
  const ordered = { ...base, strategic_axes: ["former", "auberge", "fundraising"] };
  const reversed = { ...base, strategic_axes: ["fundraising", "auberge", "former"] };
  assert.deepEqual(strategicNarrativeOf(ordered), strategicNarrativeOf(reversed));
  assert.equal(strategicAxesComplete({ ...base, strategic_axes: [] }), false);
  assert.deepEqual(strategicNarrativeOf({ ...base, strategic_axes: [] }), []);
});

test("les textes restent identiques pour projet, formation et fiche mixte", async () => {
  const { strategicNarrativeOf } = await strategyModule();
  const types = [
    { is_project: true, is_training: false },
    { is_project: false, is_training: true },
    { is_project: true, is_training: true },
  ];
  const combinations = [
    ["former"], ["auberge"], ["fundraising"],
    ["former", "auberge"], ["former", "fundraising"],
    ["auberge", "fundraising"], ["former", "auberge", "fundraising"],
  ];
  for (const strategic_axes of combinations) {
    const variants = types.map((type) => strategicNarrativeOf({ ...base, ...type, strategic_axes }));
    assert.deepEqual(variants[0], variants[1]);
    assert.deepEqual(variants[1], variants[2]);
  }
});

test("la base exige uniquement au moins un axe reconnu", async () => {
  const migration = await source("supabase/migrations/20261029230000_opportunity_status_delete_and_notification_dedupe.sql");
  assert.match(migration, /cardinality\(v_axes\) = 0/);
  assert.match(migration, /strategic_contribution_former = null/);
  assert.doesNotMatch(migration, /STRATEGIC_CONTRIBUTION_FORMER_REQUIRED/);
});

test("les formulaires administratifs et la fiche étudiant partagent le même modèle", async () => {
  const create = await source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = await source("src/components/OpportunityEditForms.tsx");
  const fields = await source("src/components/StrategicAxesFields.tsx");
  const student = await source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(create, /<StrategicAxesFields/);
  assert.match(edit, /<StrategicAxesFields/);
  assert.match(fields, /name="strategic_axes"/);
  assert.doesNotMatch(fields, /strategic_contribution|textarea/);
  assert.match(student, /<StrategicVisionSection opportunity=\{o\}/);
});

test("le rendu public utilise le titre officiel, un texte unique et des badges discrets", async () => {
  const section = await source("src/components/StrategicVisionSection.tsx");
  const strategy = await source("src/lib/opportunity-strategy.ts");
  assert.match(strategy, /VISION MLK · 2026–2027/);
  assert.match(strategy, /Ensemble, faisons vivre notre vision/);
  assert.match(strategy, /fundraising: "une_place_de_plus"/);
  assert.match(section, /const paragraphs = strategicNarrativeOf\(opportunity\)/);
  assert.match(section, /paragraphs\.map/);
  assert.match(section, /Axes stratégiques sélectionnés/);
  assert.match(section, /if \(!axes\.length && !showIncomplete\) return null/);
});
