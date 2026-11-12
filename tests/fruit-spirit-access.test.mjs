import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Fruit de l’Esprit reste réservé aux super admins", () => {
  const route = read("src/components/student/GraceIdentityStudentPage.tsx");

  assert.match(route, /!viewer\.roles\.superAdmin\) notFound\(\)/);
  assert.match(route, /initialTest=\{test\}/);
  assert.match(route, /<GraceIdentityTool[\s\S]* preview /);
});

test("Fruit de l’Esprit est masqué du tableau de bord étudiant standard", () => {
  const identity = read("src/app/etudiant/identite/page.tsx");

  assert.match(identity, /visibleTools = viewer\.roles\.superAdmin \? tools : tools\.filter/);
  assert.match(identity, /visibleResults = viewer\.roles\.superAdmin \? allResults : allResults\.filter/);
  assert.match(identity, /graceAvailable = viewer\.roles\.superAdmin/);
  assert.match(identity, /completedTests=\{visibleResults\.length\}/);
  assert.match(identity, /upcoming=\{buildUpcoming\(visibleTools, completedKinds\)\}/);
});

test("la DA Fruit de l’Esprit utilise l’abstraction bordeaux fruitée sur le post et le parcours", () => {
  const identity = read("src/app/etudiant/identite/identity.module.css");
  const stories = read("src/app/etudiant/identite/page.tsx");
  const journey = read("src/components/apps/FruitSpiritJourney.module.css");

  assert.match(identity, /fruit-spirit-burgundy-fruit-v5\.webp/);
  assert.match(identity, /storyRing\[data-story-key="fruit"\][\s\S]*#4d0f20/);
  assert.doesNotMatch(identity, /storyRing\[data-story-key="fruit"\] \.storyInner img\s*\{\s*display: none/);
  assert.match(stories, /fruit-spirit-burgundy-fruit-v5\.webp/);
  assert.match(journey, /fruit-spirit-burgundy-fruit-v5\.webp/);
  assert.match(journey, /background-color: #5a101a/);
  assert.match(journey, /radial-gradient\(ellipse at 48% 57%/);
});
