import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Les Apps is restricted to super admins in navigation and route layout", () => {
  const nav = read("src/lib/nav.tsx");
  const layout = read("src/app/admin/apps/layout.tsx");
  assert.match(nav, /if \(roles\.superAdmin\)[\s\S]*label: "Les Apps"[\s\S]*href: "\/admin\/apps"/);
  assert.match(layout, /if \(!viewer\.roles\.superAdmin\) redirect\("\/etudiant"\)/);
});

test("app catalog is public only for published records and mutable only by super admins", () => {
  const migration = read("supabase/migrations/20261101150000_apps_studio.sql");
  assert.match(migration, /status = 'published' or public\.is_super_admin\(\)/);
  assert.match(migration, /for insert to authenticated[\s\S]*public\.is_super_admin\(\)/);
  assert.match(migration, /revoke all on public\.app_integrations from anon, authenticated/);
});

test("Généropoly secrets remain server-side and only completed tables feed results", () => {
  const connector = read("src/lib/apps/generopoly.ts");
  const results = read("src/lib/apps/generopoly-results.ts");
  const api = read("src/app/api/admin/apps/generopoly/snapshot/route.ts");
  assert.match(connector, /import "server-only"/);
  assert.match(connector, /"x-admin-token": config\.admin_token/);
  assert.match(api, /!viewer\?\.roles\.superAdmin/);
  assert.match(results, /snapshot\.tables\.filter\(\(table\) => table\.completed\)/);
});

test("public launchpad reads the persisted catalog and filters unpublished apps", () => {
  const page = read("src/app/apps/page.tsx");
  const catalog = read("src/lib/apps/catalog.ts");
  assert.match(page, /await getCatalogApps\(\)/);
  assert.match(catalog, /query = query\.eq\("status", "published"\)/);
});

test("projection is independent and refreshes secure snapshots", () => {
  const projection = read("src/components/apps-studio/GeneropolyProjection.tsx");
  assert.match(projection, /requestFullscreen/);
  assert.match(projection, /api\/admin\/apps\/generopoly\/snapshot/);
  assert.match(projection, /setInterval\(\(\) => void load\(\), 5000\)/);
});

