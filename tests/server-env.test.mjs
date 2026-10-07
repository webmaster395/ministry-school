import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("le build Production refuse une configuration Supabase serveur incomplète", async () => {
  const script = await source("scripts/validate-server-env.mjs");
  assert.match(script, /VERCEL_ENV === "production"/);
  assert.match(script, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(script, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(script, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(script, /console\.log\([^)]*process\.env/);
});

test("le client service role est impossible à importer dans un bundle client", async () => {
  const service = await source("src/lib/supabase/service.ts");
  assert.match(service, /^import "server-only";/);
  assert.doesNotMatch(service, /NEXT_PUBLIC_SUPABASE_SERVICE/);
});
