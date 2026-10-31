import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { distinctById } from "../src/lib/distinct-by-id.ts";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("un projet et formation ne compte qu'une fois dans un total global", () => {
  const rows = [
    { id: "project", type: "project" },
    { id: "training", type: "training" },
    { id: "combined", type: "both" },
    { id: "combined", type: "both" },
  ];
  assert.equal(distinctById(rows).length, 3);
});

test("les listes métier sont dédupliquées par identifiant", async () => {
  const [opportunities, hub, analytics, queue] = await Promise.all([
    source("src/lib/data/opportunities.ts"),
    source("src/lib/data/admin-hub.ts"),
    source("src/lib/data/admin.ts"),
    source("src/lib/data/ministry-course-review.ts"),
  ]);
  assert.match(opportunities, /distinctById\(rows\.map/);
  assert.match(hub, /distinctById\(\(\(opps/);
  assert.match(analytics, /initiatives: distinctById/);
  assert.match(queue, /opportunities: distinctById/);
});

test("un élément mixte reste présent dans les deux filtres sans gonfler le total", async () => {
  const page = await source("src/app/etudiant/services/page.tsx");
  assert.match(page, /Tout \(\$\{tabbed\.length\}\)/);
  assert.match(page, /matchesKind\(o, "projet"\)/);
  assert.match(page, /matchesKind\(o, "formation"\)/);
  assert.doesNotMatch(page, /nProjets\s*\+\s*nFormations/);
});

test("À valider présente les trois types exclusifs sans compter un élément mixte deux fois", async () => {
  const page = await source("src/app/gestion/a-valider/page.tsx");
  assert.match(page, /onglet=both/);
  assert.match(page, /label="Projet et formation"/);
  assert.match(page, /item\.contentType === "project"\)/);
  assert.match(page, /item\.contentType === "training"\)/);
  assert.match(page, /item\.contentType === "both"\)/);
  assert.doesNotMatch(page, /contentType === "project" \|\| item\.contentType === "both"/);
  assert.doesNotMatch(page, /contentType === "training" \|\| item\.contentType === "both"/);
});

test("les compteurs SQL utilisent les identifiants distincts", async () => {
  const migration = await source("supabase/migrations/20261030270000_distinct_opportunity_counts.sql");
  assert.match(migration, /count\(distinct request\.opportunity_id\)/);
  assert.match(migration, /count\(distinct id\)/);
  assert.match(migration, /session\.opportunity_id is null/);
  assert.match(migration, /select distinct on \(opportunity\.id\)/);
  assert.doesNotMatch(migration, /insert into public\.announcements/);
});

test("une initiative possède une seule demande de validation courante", async () => {
  const schema = await source("supabase/migrations/20261029170000_opportunity_editorial_review.sql");
  const migration = await source("supabase/migrations/20261030270000_distinct_opportunity_counts.sql");
  assert.match(schema, /opportunity_id uuid primary key/);
  assert.match(migration, /session_row\.opportunity_id is not null/);
  assert.match(migration, /opportunity_review_requests/);
});
