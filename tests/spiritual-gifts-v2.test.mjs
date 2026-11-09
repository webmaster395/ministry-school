import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/lib/apps/spiritual-gifts-v2.ts", import.meta.url), "utf8");

test("le nouveau test contient exactement 35 questions et les six réponses de fréquence", () => {
  assert.equal((source.match(/dimension: "/g) ?? []).length, 35);
  assert.match(source, /"Jamais", "Très rarement", "Rarement", "Parfois", "Souvent", "Très souvent"/);
});

test("chaque don conserve cinq questions, sa définition, son défi et sa palette", () => {
  assert.equal((source.match(/id: "(?:discernement_esprits|parole_connaissance|don_foi|guerison|miracles|prophetie|sagesse)",\n    name:/g) ?? []).length, 7);
  assert.equal((source.match(/challenge: "/g) ?? []).length, 7);
  assert.equal((source.match(/palette: \{ background: "#/g) ?? []).length, 7);
});

test("le questionnaire n'affiche pas les dimensions et calcule les trois catégories", () => {
  const component = readFileSync(new URL("../src/components/apps/SpiritualGiftsJourney.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(component, /question\.giftId|question\.dimension/);
  assert.match(source, /average >= 3\.6/);
  assert.match(source, /average >= 1\.8/);
  assert.match(component, /Les dons que je reconnais et que j’utilise/);
  assert.match(component, /Les dons à explorer et à développer/);
  assert.match(component, /Les dons encore peu manifestés/);
});
