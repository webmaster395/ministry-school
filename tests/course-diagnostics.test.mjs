import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le rendu du cours journalise chaque source de données sans avaler l'exception", async () => {
  const page = await source("src/app/etudiant/seances/[id]/page.tsx");
  for (const stage of [
    "viewer",
    "sessions-and-courses",
    "assignment-completions",
    "materials",
    "assignments",
    "permissions",
    "notes",
    "video",
    "trainers",
    "assignment-steps",
    "previous-next",
  ]) assert.match(page, new RegExp(`"${stage}"`));

  const diagnostics = await source("src/lib/server-render-diagnostics.ts");
  assert.match(diagnostics, /throw error/);
  assert.doesNotMatch(diagnostics, /cookie|token|content_html|notes/i);
});

test("l'error boundary enregistre le contexte PWA sans donnée personnelle", async () => {
  const boundary = await source("src/app/etudiant/error.tsx");
  assert.match(boundary, /serviceWorkerControlled/);
  assert.match(boundary, /displayMode/);
  assert.match(boundary, /error\.digest/);
  assert.doesNotMatch(boundary, /cookie|localStorage|content_html/i);
});
