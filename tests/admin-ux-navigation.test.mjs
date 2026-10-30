import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("le fil d’Ariane Admin est centralisé, cliquable et absent des autres espaces", () => {
  const layout = source("src/app/gestion/layout.tsx");
  const breadcrumbs = source("src/components/admin/AdminBreadcrumbs.tsx");
  assert.match(layout, /<AdminBreadcrumbs \/>/);
  assert.match(breadcrumbs, /current\?\.key !== "admin"/);
  assert.match(breadcrumbs, /aria-label="Fil d’Ariane"/);
  assert.match(breadcrumbs, /<Link href=\{crumb\.href\}/);
  assert.match(breadcrumbs, /overflow-x-auto/);
  assert.match(breadcrumbs, /Projets et formations/);
  assert.match(breadcrumbs, /Sensibilités ministérielles/);
});

test("l’en-tête Admin ne répète plus Administration", () => {
  const home = source("src/components/admin/AdminHome.tsx");
  const title = source("src/components/HeaderTitle.tsx");
  assert.match(home, />\{viewer\.roles\.superAdmin \? "Super admin" : "Admin"\}</);
  assert.match(home, />Admin<\/h1>/);
  assert.doesNotMatch(home, />Administration<\/h1>/);
  assert.match(title, /current\.key === "admin"\) return null/);
});

test("Permissions utilise une liste dépliable unique par membre", () => {
  const roles = source("src/components/admin/RolesTab.tsx");
  assert.match(roles, /rowsByUser/);
  assert.match(roles, /<details key=\{member\.id\}/);
  assert.match(roles, /Rôles et affectations/);
  assert.match(roles, /Commentaire interne|RoleCommentForm/);
  assert.match(roles, /group-open\/member:rotate-180/);
  assert.doesNotMatch(roles, /<details key=\{member\.id\}[^>]* open/);
});

test("les étiquettes de Permissions sont des raccourcis conditionnés par les droits", () => {
  const roles = source("src/components/admin/RolesTab.tsx");
  const page = source("src/app/gestion/admin/page.tsx");
  assert.match(roles, /aria-label="Changer d’espace administratif"/);
  assert.match(roles, /spaceShortcuts\.filter\(\(shortcut\) => shortcut\.enabled\)/);
  assert.match(roles, /href: "\/gestion\/admin"/);
  assert.match(roles, /href: "\/gestion\/projets-formations"/);
  assert.match(roles, /href: "\/gestion\/pilotage"/);
  assert.match(roles, /aria-current=\{shortcut\.active \? "page" : undefined\}/);
  assert.match(page, /projectsTrainingAccess=\{viewer\.roles\.projectsTraining\}/);
  assert.match(page, /ministryAccess=\{viewer\.roles\.steeringMinistryIds\.length > 0\}/);
});
