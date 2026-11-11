import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Fruit de l’Esprit reste accessible aux comptes connectés indépendamment du catalogue", () => {
  const route = read("src/components/student/GraceIdentityStudentPage.tsx");

  assert.doesNotMatch(route, /getStudentTools|getCatalogAppBySlug|notFound/);
  assert.match(route, /if \(!viewer\) redirect\(`/);
  assert.match(route, /if \(viewer\.deactivated\) redirect\("\/auth\/desactive"\)/);
  assert.match(route, /initialTest=\{test\}/);
});

test("Fruit de l’Esprit reste proposé même lorsque sa fiche catalogue est masquée", () => {
  const identity = read("src/app/etudiant/identite/page.tsx");

  assert.match(identity, /kind === "fruit" \|\| graceAvailable/);
  assert.match(identity, /!completedKinds\.has\("fruit"\)/);
  assert.match(identity, /name: "Fruit de l’Esprit"/);
  assert.match(identity, /href: graceTestHref\("fruit"\)/);
});
