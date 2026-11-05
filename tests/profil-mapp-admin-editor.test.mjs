import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Profil MAPP affiche un onglet d’édition dans Gestion des outils", async () => {
  const settings = await readFile(new URL("../src/app/admin/apps/[slug]/settings/page.tsx", import.meta.url), "utf8");
  assert.match(settings, /app\.slug === "profil-mapp"/);
  assert.match(settings, /hasEditor=\{isProfilMapp\}/);
});

test("l’onglet ouvre la bibliothèque MAPP sous le domaine Ministry", async () => {
  const editor = await readFile(new URL("../src/app/admin/apps/profil-mapp/editor/page.tsx", import.meta.url), "utf8");
  assert.match(editor, /redirect\("\/apps\/profil-mapp\/admin\/restitutions"\)/);
});
