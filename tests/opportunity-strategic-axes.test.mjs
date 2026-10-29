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

test("les sept combinaisons produisent sept rédactions spécifiques", async () => {
  const { strategicNarrativeOf } = await strategyModule();
  const combinations = [
    ["former"], ["auberge"], ["fundraising"],
    ["former", "auberge"], ["former", "fundraising"],
    ["auberge", "fundraising"], ["former", "auberge", "fundraising"],
  ];
  const texts = combinations.map((strategic_axes) => strategicNarrativeOf({ ...base, strategic_axes }).join("\n"));
  assert.equal(new Set(texts).size, 7);
  for (const [index, axes] of combinations.entries()) {
    assert.match(texts[index], /contexte P/);
    if (axes.includes("former")) assert.match(texts[index], /compétence F/);
    if (axes.includes("auberge")) assert.match(texts[index], /public A/);
    if (axes.includes("fundraising")) assert.match(texts[index], /partenariat R/);
    if (axes.length > 1) assert.match(texts[index], /action C/);
  }
});

test("aucun texte n'est inventé lorsqu'une contribution manque", async () => {
  const { strategicNarrativeOf, strategicAxesComplete } = await strategyModule();
  const incomplete = { ...base, strategic_axes: ["former", "auberge"], strategic_contribution_auberge: "" };
  assert.equal(strategicAxesComplete(incomplete), false);
  assert.deepEqual(strategicNarrativeOf(incomplete), []);
});

test("la base exige un axe, chaque contribution et le lien entre plusieurs axes", async () => {
  const migration = await source("supabase/migrations/20261029210000_opportunity_strategic_axes.sql");
  assert.match(migration, /cardinality\(strategic_axes\) >= 1/);
  assert.match(migration, /STRATEGIC_CONTRIBUTION_FORMER_REQUIRED/);
  assert.match(migration, /STRATEGIC_CONTRIBUTION_AUBERGE_REQUIRED/);
  assert.match(migration, /STRATEGIC_CONTRIBUTION_FUNDRAISING_REQUIRED/);
  assert.match(migration, /STRATEGIC_AXES_CONNECTION_REQUIRED/);
  assert.match(migration, /not valid/);
});

test("les formulaires administratifs et la fiche étudiant partagent le même modèle", async () => {
  const create = await source("src/components/admin/OpportunityCreateForm.tsx");
  const edit = await source("src/components/OpportunityEditForms.tsx");
  const fields = await source("src/components/StrategicAxesFields.tsx");
  const student = await source("src/app/etudiant/services/[id]/page.tsx");
  assert.match(create, /<StrategicAxesFields/);
  assert.match(edit, /<StrategicAxesFields/);
  assert.match(fields, /Aperçu du texte étudiant/);
  assert.match(fields, /name="strategic_axes"/);
  assert.match(student, /<StrategicVisionSection opportunity=\{o\}/);
});
