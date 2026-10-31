import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/api/deployment-version/route.ts", import.meta.url), "utf8");

test("la production expose son commit sans cache pour vérifier l’alias réellement servi", () => {
  assert.match(source, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(source, /VERCEL_DEPLOYMENT_ID/);
  assert.match(source, /Cache-Control": "no-store, max-age=0"/);
  assert.match(source, /X-Ministry-School-Commit/);
});
