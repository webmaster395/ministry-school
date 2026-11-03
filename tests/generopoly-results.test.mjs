import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { averageAllocation, comparisonAllocation, evolutionSummary } from "../src/lib/apps/generopoly-results.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const table = (state) => ({ id: crypto.randomUUID(), name: "Groupe", participantCount: 1, step: 10, completed: true, financeCard: null, timeCard: null, state, projected: [], createdAt: 1, updatedAt: 1 });

test("les moyennes Généropoly ignorent les données manquantes au lieu de les remplacer par zéro", () => {
  const rows = averageAllocation([table({ financeInitial: { savings: 100 } }), table({ financeInitial: {} })], "financeInitial", [["savings", "Épargne"]]);
  assert.equal(rows[0].value, 100);
  assert.equal(rows[0].sampleCount, 1);
});

test("les variations comparent toujours la situation courante à la situation normale", () => {
  const rows = comparisonAllocation([table({ financeInitial: { savings: 200 }, financeAfterOne: { savings: 120 } })], "financeInitial", "financeAfterOne", [["savings", "Épargne"]]);
  assert.equal(rows[0].difference, -80);
  assert.equal(rows[0].percent, -40);
  assert.equal(rows[0].evolution, "decreased");
});

test("une référence nulle ne produit jamais de pourcentage inventé", () => {
  const rows = comparisonAllocation([table({ financeInitial: { savings: 0 }, financeFinal: { savings: 10 } })], "financeInitial", "financeFinal", [["savings", "Épargne"]]);
  assert.equal(rows[0].percent, null);
  assert.equal(rows[0].evolution, "increased");
});

test("les répartitions augmenté diminué maintenu suspendu excluent les groupes incomplets", () => {
  const counts = evolutionSummary([
    table({ financeInitial: { generosity: 100 }, financeFinal: { generosity: 0 } }),
    table({ financeInitial: { generosity: 100 }, financeFinal: { generosity: 120 } }),
    table({ financeInitial: { generosity: 100 } }),
  ], "financeInitial", "financeFinal", "generosity");
  assert.deepEqual(counts, { increased: 1, decreased: 0, maintained: 0, suspended: 1, total: 2 });
});

test("la page Admin déroule les situations complètes et la projection comporte cinq écrans animés", () => {
  const results = read("src/components/apps-studio/GeneropolyResults.tsx");
  const projection = read("src/components/apps-studio/GeneropolyProjection.tsx");
  const focus = read("src/components/apps-studio/GeneropolyFocusRings.tsx");
  assert.match(results, /Quand tout va bien/);
  assert.match(results, /Face à l’imprévu ponctuel/);
  assert.match(results, /Face à la baisse durable/);
  assert.match(results, /Votre vie spirituelle, votre église locale et les autres dans vos priorités/);
  assert.match(results, /Les réponses des groupes/);
  assert.doesNotMatch(results, /type View|setView/);
  assert.match(projection, /SituationSlide/);
  assert.match(projection, /financeRows/);
  assert.match(projection, /timeRows/);
  assert.match(projection, /padStart\(2, "0"\)\} \/ 05/);
  assert.match(projection, /Vos ressources diminuent durablement\. En parallèle, votre église locale a besoin de soutien financier et recherche des bénévoles\./);
  assert.match(projection, /GeneropolyFocusRings/);
  assert.match(results, /GeneropolyFocusRings/);
  assert.match(focus, /setSituation\(1\).*3000/s);
  assert.match(focus, /setSituation\(2\).*6000/s);
  assert.match(projection, /Révéler/);
  assert.match(projection, /Rejouer/);
  assert.match(projection, /requestFullscreen/);
  assert.match(projection, /ArrowRight/);
  assert.match(projection, /ArrowLeft/);
});

test("la sélection des réponses projetées est protégée par le rôle Super admin", () => {
  const route = read("src/app/api/admin/apps/generopoly/project/route.ts");
  const connector = read("src/lib/apps/generopoly.ts");
  assert.match(route, /!viewer\?\.roles\.superAdmin/);
  assert.match(connector, /generopolyFetch\("\/api\/admin\/project", \{ method: "PATCH"/);
  assert.match(connector, /import "server-only"/);
});
