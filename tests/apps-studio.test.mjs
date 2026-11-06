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

test("Mes outils reste accessible et n'affiche que le catalogue étudiant activé", () => {
  const migration = read("supabase/migrations/20261101190000_tools_visibility_and_scheduling.sql");
  const nav = read("src/lib/nav.tsx");
  const page = read("src/app/etudiant/outils/page.tsx");
  assert.match(migration, /student_tools_enabled boolean not null default false/);
  assert.match(nav, /label: "Mes outils"[\s\S]*href: "\/etudiant\/outils"/);
  assert.match(page, /isSuperAdmin[\s\S]*includeUnpublished: true[\s\S]*enabled \? await getStudentTools\(\) : \[\]/);
  assert.match(page, /Aucun outil disponible pour le moment/);
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
  assert.match(home, /Gestion des outils/);
  assert.match(home, /Ajouter un outil/);
  assert.match(home, /href="\/admin\/apps\/nouveau"/);
  assert.match(table, /<span>Outil<\/span><span>URL<\/span><span>Statut<\/span><span>Modifier<\/span>/);
  assert.doesNotMatch(table, /<details className="group rounded/);
  assert.doesNotMatch(table, /saveCatalogApp/);
  assert.match(settings, /Identité/);
  assert.match(settings, /Publication/);
  assert.match(settings, /Zone de danger/);
});

test("chaque application possède sa fiche et ses paramètres dédiés", () => {
  const overview = read("src/app/admin/apps/[slug]/page.tsx");
  const settings = read("src/app/admin/apps/[slug]/settings/page.tsx");
  const shell = read("src/components/apps-studio/AppsStudioShell.tsx");
  assert.match(overview, /getCatalogAppBySlug/);
  assert.match(settings, /AppSettingsForm/);
  assert.doesNotMatch(shell, /Navigation du studio/);
  assert.doesNotMatch(shell, /Vue d’ensemble/);
  assert.match(shell, /Résultats/);
  assert.match(shell, /Édition/);
  assert.match(shell, /Paramètres/);
});

test("le Launchpad centre le nombre réel d’applications sans colonnes fantômes", () => {
  const portal = read("src/app/apps/AppsPortal.tsx");
  const styles = read("src/app/apps/apps.module.css");
  assert.doesNotMatch(portal, /ArrowUpRight/);
  assert.match(styles, /\.appGrid \{ display:flex;[\s\S]*justify-content:center;[\s\S]*flex-wrap:wrap/);
  assert.match(styles, /\.appIcon \{[^}]*width:90px; height:90px/);
  assert.match(styles, /@media \(max-width:560px\)[\s\S]*\.appIcon \{ width:76px; height:76px/);
  assert.match(styles, /\.appName \{[^}]*text-align:center/);
});

test("Gestion des outils reste dans Ministry School tandis que Mes outils ouvre l'espace étudiant", () => {
  const nav = read("src/lib/nav.tsx");
  const links = read("src/components/NavBlocks.tsx");
  const provider = read("src/components/SpaceProvider.tsx");
  assert.match(nav, /label: "Mes outils"[\s\S]*href: "\/etudiant\/outils"/);
  assert.doesNotMatch(nav, /label: "Mes outils"[\s\S]*target: "_blank"/);
  assert.match(nav, /label: "Gestion des outils"[\s\S]*href: "\/admin\/apps"/);
  assert.doesNotMatch(nav, /href: "\/admin\/apps"[\s\S]{0,120}target: "_blank"/);
  assert.match(links, /target=\{target\}/);
  assert.match(provider, /window\.open\(destination\.href, "_blank", "noopener,noreferrer"\)/);
});

test("le tableau compact réordonne directement les outils", () => {
  const table = read("src/components/apps-studio/AppCatalogManager.tsx");
  const actions = read("src/app/admin/apps/actions.ts");
  const migration = read("supabase/migrations/20261101200000_reorder_app_catalog.sql");
  assert.match(table, /ArrowUp/);
  assert.match(table, /ArrowDown/);
  assert.match(table, /Modifier/);
  assert.doesNotMatch(table, /MoreHorizontal/);
  assert.match(actions, /rpc\("reorder_app_catalog"/);
  assert.match(migration, /if not public\.is_super_admin\(\)/);
});

test("l’éditeur Généropoly travaille par page, garde un brouillon et publie explicitement", () => {
  const editor = read("src/components/apps-studio/GeneropolyEditor.tsx");
  const route = read("src/app/api/admin/apps/generopoly/content/route.ts");
  const connector = read("src/lib/apps/generopoly.ts");
  assert.match(editor, /Pages du parcours/);
  assert.match(editor, /Enregistrer le brouillon/);
  assert.match(editor, /Aperçu/);
  assert.match(editor, /Historique/);
  assert.match(editor, /Publier/);
  assert.match(route, /viewer\?\.roles\.superAdmin/);
  assert.match(connector, /saveGeneropolyDraft/);
  assert.match(connector, /publishGeneropolyDraft/);
  assert.match(connector, /restoreGeneropolyVersion/);
});

test("les outils acceptent un chemin Ministry School ou une URL complète", () => {
  const settings = read("src/components/apps-studio/AppSettingsForm.tsx");
  const actions = read("src/app/admin/apps/actions.ts");
  assert.match(settings, /type="text" inputMode="url"/);
  assert.match(settings, /\/apps\/mon-outil ou https:\/\//);
  assert.match(actions, /raw\.startsWith\("\/"\) && !raw\.startsWith\("\/\/"\)/);
  assert.match(actions, /new URL\(raw\)/);
});

test("projection is independent and refreshes secure snapshots", () => {
  const projection = read("src/components/apps-studio/GeneropolyProjection.tsx");
  assert.match(projection, /requestFullscreen/);
  assert.match(projection, /api\/admin\/apps\/generopoly\/snapshot/);
  assert.match(projection, /await load\(\);[\s\S]*setSlide\(bounded\)/);
});

test("les erreurs Généropoly restent compréhensibles sans exposer le secret", () => {
  const page = read("src/app/admin/apps/generopoly/results/page.tsx");
  const route = read("src/app/api/admin/apps/generopoly/snapshot/route.ts");
  const connector = read("src/lib/apps/generopoly.ts");
  assert.match(page, /Impossible de charger les résultats pour le moment/);
  assert.match(page, /Réessayer/);
  assert.match(route, /!viewer\?\.roles\.superAdmin/);
  assert.match(route, /status: cause instanceof GeneropolyIntegrationError/);
  assert.match(connector, /"x-admin-token": config\.admin_token/);
  assert.doesNotMatch(page, /admin_token|x-admin-token/);
});

test("les résultats Généropoly sont regroupés par journées validées sans session manuelle", () => {
  const connector = read("src/lib/apps/generopoly.ts");
  const results = read("src/components/apps-studio/GeneropolyResults.tsx");
  const projection = read("src/app/admin/apps/generopoly/projection/page.tsx");
  assert.match(connector, /filter\(\(session\) => session\.groupCount > 0\)/);
  assert.match(connector, /String\(right\.session_date/);
  assert.match(results, /Journées disponibles/);
  assert.match(results, /Voir les résultats/);
  assert.match(results, /Projeter/);
  assert.match(results, /date de validation finale, en heure de Paris/);
  assert.match(projection, /sessions\.find\(\(session\) => session\.id === requested\)/);
  assert.doesNotMatch(results, /Créer une session|Démarrer un atelier|code de participation/);
});

