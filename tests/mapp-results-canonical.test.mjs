import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("la gestion Ministry ouvre la liste officielle des participants MAPP", () => {
  const page = read("src/app/admin/apps/profil-mapp/results/page.tsx");
  assert.match(page, /redirect\("\/apps\/profil-mapp\/admin\/participants"\)/);
  assert.doesNotMatch(page, /admin_list_attempts_page/);
  assert.doesNotMatch(page, /createServiceClient/);
});
