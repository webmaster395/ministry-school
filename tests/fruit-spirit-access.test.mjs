import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Fruit de l’Esprit applique l’accès configuré dans le catalogue", () => {
  const route = read("src/components/student/GraceIdentityStudentPage.tsx");
  const api = read("src/app/api/apps/grace-identity/route.ts");

  assert.match(route, /getStudentTools\(\)/);
  assert.match(route, /graceIdentityToolSlugs\[test\]/);
  assert.match(route, /if \(!canAccess\) notFound\(\)/);
  assert.match(route, /initialTest=\{test\}/);
  assert.match(route, /preview=\{viewer\.roles\.superAdmin\}/);
  assert.match(api, /if \(!canAccess\) return NextResponse\.json\(\{ error: "Cet outil ne vous est pas accessible\." \}, \{ status: 403 \}\)/);
});

test("Fruit de l’Esprit suit désormais sa propre configuration de catalogue", () => {
  const identity = read("src/app/etudiant/identite/page.tsx");

  assert.match(identity, /graceIdentityToolSlugs/);
  assert.match(identity, /visibleTools = tools/);
  assert.match(identity, /visibleResults = allResults\.filter/);
  assert.match(identity, /availableGraceKinds\.has\(result\.kind as GraceTestKey\)/);
  assert.match(identity, /completedTests=\{visibleResults\.length\}/);
  assert.match(identity, /upcoming=\{buildUpcoming\(visibleTools, completedKinds\)\}/);
});

test("la DA Fruit de l’Esprit utilise les baies dans l’eau et garde le parcours clair", () => {
  const identity = read("src/app/etudiant/identite/identity.module.css");
  const stories = read("src/app/etudiant/identite/page.tsx");
  const journey = read("src/components/apps/FruitSpiritJourney.module.css");

  assert.match(identity, /fruit-spirit-blue-violet-grape-post-v26\.png/);
  assert.doesNotMatch(identity, /storyRing\[data-story-key="fruit"\] \.storyInner img\s*\{\s*display: none/);
  assert.match(stories, /fruit-spirit-blue-violet-grape-story-v26\.png/);
  assert.match(journey, /fruit-spirit-water-bubbles-v11\.png/);
  assert.match(journey, /--fruit-accent: #e79a24/);
});
