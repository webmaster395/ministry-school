import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

test("la restitution MAPP native utilise la bibliothèque éditoriale validée", async () => {
  const component = await readFile("src/app/apps/profil-mapp/MappNativeExperience.tsx", "utf8");
  assert.match(component, /PreviewShell/);
  const manifest = JSON.parse(await readFile("src/data/mapp-editorial-port-manifest.json", "utf8"));
  assert.equal(manifest.files.length, 48);
  assert.ok(manifest.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
});

test("les quatre gabarits PDF validés sont intégrés", async () => {
  for (const profile of ["conquerant", "communiquant", "facilitateur", "analyste"]) {
    assert.ok((await stat(`public/apps/profil-mapp/pdf-templates/${profile}.pdf`)).size > 100_000);
  }
  const route = await readFile("src/app/api/apps/profil-mapp/results/[attemptId]/pdf/route.ts", "utf8");
  assert.match(route, /getMappResultBundle/);
  assert.match(route, /Cache-Control.*private, no-store/s);
});

test("le lien PDF reste authentifié et lié à la révision active", async () => {
  const menu = await readFile("src/app/preview/resultat/save-profile-menu.tsx", "utf8");
  assert.match(menu, /\/api\/apps\/profil-mapp\/results/);
  const route = await readFile("src/app/api/apps/profil-mapp/results/[attemptId]/pdf/route.ts", "utf8");
  assert.match(route, /requestedRevision !== bundle\.resultRevisionId/);
});
