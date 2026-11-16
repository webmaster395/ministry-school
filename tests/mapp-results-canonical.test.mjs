import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la gestion Ministry liste les nouveaux résultats natifs et conserve l'accès à l'historique", () => {
  const page = read("src/app/admin/apps/profil-mapp/results/page.tsx");
  assert.match(page, /admin_list_attempts_page/);
  assert.match(page, /createServiceClient/);
  assert.match(page, /Tous les résultats/);
  assert.match(page, /Historique/);
  assert.match(page, /Profils les plus fréquents/);
  assert.match(page, /sourceLabel/);
  assert.match(page, /participant_auth_identities/);
});
