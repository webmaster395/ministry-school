import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const filters = readFileSync(new URL("../src/components/admin/MemberFilters.tsx", import.meta.url), "utf8");
const members = readFileSync(new URL("../src/components/admin/MembersTab.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../src/lib/nav.tsx", import.meta.url), "utf8");

test("Statistiques est de nouveau une entrée principale de l’admin", () => {
  assert.match(navigation, /label: "Statistiques"[\s\S]*?onglet=statistiques/);
});

test("les filtres essentiels restent visibles et tous les filtres historiques sont conservés", () => {
  assert.match(filters, /name="q"/);
  assert.match(filters, /name="role"/);
  assert.match(filters, /name="statut"/);
  for (const name of ["sens", "implication", "genre", "tri", "par"]) {
    assert.match(filters, new RegExp(`name="${name}"`));
  }
  assert.match(filters, /Filtres\{active\.length/);
  assert.match(filters, /Tout effacer/);
});

test("le retour d’une fiche membre conserve l’URL filtrée", () => {
  assert.match(members, /returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
});
