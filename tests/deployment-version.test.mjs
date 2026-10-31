import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/app/api/deployment-version/route.ts", import.meta.url), "utf8");
const proxy = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
const guard = readFileSync(new URL("../src/components/DeploymentUpdateGuard.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../src/app/layout.tsx", import.meta.url), "utf8");
const worker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("la production expose son commit sans cache pour vérifier l’alias réellement servi", () => {
  assert.match(source, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(source, /VERCEL_DEPLOYMENT_ID/);
  assert.match(source, /Cache-Control": "no-store, max-age=0"/);
  assert.match(source, /X-Ministry-School-Commit/);
  assert.match(proxy, /request\.nextUrl\.pathname === "\/api\/deployment-version"/);
  assert.match(guard, /fetch\("\/api\/deployment-version"/);
  assert.match(guard, /window\.location\.reload\(\)/);
  assert.match(guard, /visibilitychange/);
  assert.match(layout, /updateViaCache: 'none'/);
  assert.match(worker, /const CACHE_NAME = "ms-v3"/);
  assert.match(worker, /client\.navigate\(client\.url\)/);
});
