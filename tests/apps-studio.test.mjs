import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Gestion des outils is restricted to super admins in navigation and route layout", () => {
  const nav = read("src/lib/nav.tsx");
  const layout = read("src/app/admin/apps/layout.tsx");
  assert.match(nav, /if \(roles\.superAdmin\)[\s\S]*label: "Gestion des outils"[\s\S]*href: "\/admin\/apps"/);
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
  assert.match(catalog, /channel === "public"/);
  assert.match(catalog, /\.eq\("public_enabled", true\)/);
});

test("Mes outils reste masqué par défaut et son URL applique le même réglage", () => {
  const migration = read("supabase/migrations/20261101190000_tools_visibility_and_scheduling.sql");
  const nav = read("src/components/NavBlocks.tsx");
  const page = read("src/app/etudiant/outils/page.tsx");
  assert.match(migration, /student_tools_enabled boolean not null default false/);
  assert.match(nav, /studentToolsEnabled[\s\S]*toolsNavItem/);
  assert.match(page, /if \(!\(await getStudentToolsEnabled\(\)\)\) redirect\("\/etudiant"\)/);
});

test("les publications publique et étudiante sont indépendantes et programmées à l'heure réelle", () => {
  const migration = read("supabase/migrations/20261101190000_tools_visibility_and_scheduling.sql");
  const actions = read("src/app/admin/apps/actions.ts");
  assert.match(migration, /public_enabled[\s\S]*public_publish_at[\s\S]*student_enabled[\s\S]*student_publish_at/);
  assert.match(migration, /public_publish_at <= now\(\)/);
  assert.match(migration, /student_publish_at <= now\(\)/);
  assert.match(actions, /parisLocalToIso/);
  assert.match(actions, /public_enabled: checked\(formData, "publicEnabled"\)/);
  assert.match(actions, /student_enabled: checked\(formData, "studentEnabled"\)/);
});

test("le retrait archive le catalogue sans détruire les applications externes", () => {
  const migration = read("supabase/migrations/20261101190000_tools_visibility_and_scheduling.sql");
  const actions = read("src/app/admin/apps/actions.ts");
  assert.match(migration, /archived_at timestamptz/);
  assert.match(migration, /revoke delete on public\.app_catalog from authenticated/);
  assert.doesNotMatch(actions, /from\("app_catalog"\)\.delete\(\)/);
  assert.match(actions, /archived_at: new Date\(\)\.toISOString\(\)/);
  assert.match(actions, /restoreCatalogApp/);
});

test("le catalogue est une liste compacte sans formulaire accordéon", () => {
  const home = read("src/app/admin/apps/page.tsx");
  const table = read("src/components/apps-studio/AppCatalogManager.tsx");
  const settings = read("src/components/apps-studio/AppSettingsForm.tsx");
  assert.match(home, /Ajouter une application/);
  assert.match(home, /href="\/admin\/apps\/nouveau"/);
  assert.doesNotMatch(table, /<details className="group rounded/);
  assert.doesNotMatch(table, /saveCatalogApp/);
  assert.match(settings, /Identité/);
  assert.match(settings, /Publication/);
  assert.match(settings, /Ordre d’apparition/);
});

test("chaque application possède sa fiche et ses paramètres dédiés", () => {
  const overview = read("src/app/admin/apps/[slug]/page.tsx");
  const settings = read("src/app/admin/apps/[slug]/settings/page.tsx");
  const shell = read("src/components/apps-studio/AppsStudioShell.tsx");
  assert.match(overview, /getCatalogAppBySlug/);
  assert.match(settings, /AppSettingsForm/);
  assert.match(shell, /Vue d’ensemble/);
  assert.match(shell, /Contenus/);
  assert.match(shell, /Paramètres/);
});

test("les outils s'ouvrent dans un nouvel onglet depuis les navigations Ministry School", () => {
  const nav = read("src/lib/nav.tsx");
  const links = read("src/components/NavBlocks.tsx");
  const provider = read("src/components/SpaceProvider.tsx");
  assert.match(nav, /label: "Mes outils"[\s\S]*href: "\/apps"[\s\S]*target: "_blank"/);
  assert.match(nav, /href: "\/admin\/apps"[\s\S]*target: "_blank"/);
  assert.match(links, /target=\{target\}/);
  assert.match(provider, /window\.open\(destination\.href, "_blank", "noopener,noreferrer"\)/);
});

test("le tableau réordonne et regroupe les actions secondaires", () => {
  const table = read("src/components/apps-studio/AppCatalogManager.tsx");
  const actions = read("src/app/admin/apps/actions.ts");
  const migration = read("supabase/migrations/20261101200000_reorder_app_catalog.sql");
  assert.match(table, /ArrowUp/);
  assert.match(table, /ArrowDown/);
  assert.match(table, /MoreHorizontal/);
  assert.match(table, /Dupliquer/);
  assert.match(actions, /duplicateCatalogApp/);
  assert.match(actions, /integration_key: null/);
  assert.match(actions, /status: "draft"/);
  assert.match(actions, /rpc\("reorder_app_catalog"/);
  assert.match(migration, /if not public\.is_super_admin\(\)/);
});

test("projection is independent and refreshes secure snapshots", () => {
  const projection = read("src/components/apps-studio/GeneropolyProjection.tsx");
  assert.match(projection, /requestFullscreen/);
  assert.match(projection, /api\/admin\/apps\/generopoly\/snapshot/);
  assert.match(projection, /setInterval\(\(\) => void load\(\), 5000\)/);
});

