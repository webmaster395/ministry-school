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

test("les sept combinaisons affichent uniquement les axes réellement sélectionnés", async () => {
  const { strategicNarrativeOf } = await strategyModule();
  const combinations = [
    ["former"], ["auberge"], ["fundraising"],
    ["former", "auberge"], ["former", "fundraising"],
    ["auberge", "fundraising"], ["former", "auberge", "fundraising"],
  ];
  const texts = combinations.map((strategic_axes) => strategicNarrativeOf({ ...base, strategic_axes }).join("\n"));
  assert.equal(new Set(texts).size, 7);
  for (const [index, axes] of combinations.entries()) {
    assert.match(texts[index], /axes? stratégiques? 2026-2027 de l’Église MLK/);
    if (axes.includes("former")) assert.match(texts[index], /Former/);
    if (axes.includes("auberge")) assert.match(texts[index], /L’Auberge/);
    if (axes.includes("fundraising")) assert.match(texts[index], /Levée de fonds/);
    assert.doesNotMatch(texts[index], /compétence F|public A|partenariat R|action C/);
  }
});

test("la sélection des axes suffit sans contribution rédigée", async () => {
  const { strategicNarrativeOf, strategicAxesComplete } = await strategyModule();
  const incomplete = { ...base, strategic_axes: ["former", "auberge"], strategic_contribution_auberge: "" };
  assert.equal(strategicAxesComplete(incomplete), true);
  assert.equal(strategicNarrativeOf(incomplete).length, 1);
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
