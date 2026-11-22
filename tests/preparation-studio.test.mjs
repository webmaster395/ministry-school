import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Préparation apparaît dans l’ordre demandé pour les super administrateurs", () => {
  const nav = source("src/lib/nav.tsx");
  const block = nav.slice(nav.indexOf('key: "admin"'), nav.indexOf('key: "steering"'));
  const labels = ["Tableau de bord", "Utilisateurs et accès", "Formations", "Projets et formations", "Pilotage ministère", "Outils et ressources", "Préparation"];
  let previous = -1;
  for (const label of labels) {
    const position = block.indexOf(`label: "${label}"`);
    assert.ok(position > previous, `${label} doit suivre l’onglet précédent`);
    previous = position;
  }
  assert.match(block, /href: "\/gestion\/preparation"/);
});

test("la page, les mutations et le PDF répètent le contrôle super admin", () => {
  const layout = source("src/app/gestion/preparation/layout.tsx");
  const actions = source("src/app/gestion/preparation/actions.ts");
  const pdf = source("src/app/api/admin/preparation/pdf/route.ts");
  const synthesisImport = source("src/app/api/admin/preparation/synthesis/import/route.ts");
  const synthesisPdf = source("src/app/api/admin/preparation/synthesis/pdf/route.ts");
  assert.match(layout, /!viewer\?\.roles\.superAdmin/);
  assert.match(actions, /requireSuperAdmin/);
  assert.match(actions, /!viewer\?\.roles\.superAdmin/);
  assert.match(pdf, /!viewer\?\.roles\.superAdmin/);
  assert.match(pdf, /status: 403/);
  assert.match(synthesisImport, /!viewer\?\.roles\.superAdmin/);
  assert.match(synthesisPdf, /!viewer\?\.roles\.superAdmin/);
});

test("Préparation propose les modes Programme et Synthèse", () => {
  const hub = source("src/components/preparation/PreparationHub.tsx");
  const tabs = source("src/components/preparation/PreparationModeTabs.tsx");
  assert.match(hub, /PreparationStudio/);
  assert.match(hub, /SynthesisStudio/);
  assert.match(tabs, /> Programme</);
  assert.match(tabs, /> Synthèse</);
  assert.match(tabs, /role="tablist"/);
});

test("une synthèse accepte un Word ou un copier-coller sans perdre le texte", () => {
  const studio = source("src/components/preparation/SynthesisStudio.tsx");
  const importer = source("src/app/api/admin/preparation/synthesis/import/route.ts");
  const synthesis = source("src/lib/preparation/synthesis.ts");
  assert.match(studio, /Importer un Word/);
  assert.match(studio, /Structurer le texte/);
  assert.match(studio, /Texte intégral/);
  assert.match(importer, /mammoth\.convertToHtml/);
  assert.match(importer, /MAX_WORD_BYTES/);
  assert.match(importer, /blocks\.length >= 800/);
  assert.match(synthesis, /blocksFromPastedText/);
  assert.match(synthesis, /slice\(0, 800\)/);
});

test("les synthèses ont une couverture sombre et des pages blanches avec titres colorables", () => {
  const studio = source("src/components/preparation/SynthesisStudio.tsx");
  const preview = source("src/components/preparation/SynthesisPreview.tsx");
  const styles = source("src/components/preparation/SynthesisPreview.module.css");
  assert.match(studio, /MINISTRY_PROGRAM_COLORS/);
  assert.match(studio, /Couleur du titre/);
  assert.match(preview, /data-synthesis-page/);
  assert.match(preview, /coverImage/);
  assert.match(styles, /background: #101816/);
  assert.match(styles, /background: #fffdfa/);
  assert.match(styles, /--block-color/);
});

test("l’export Synthèse produit un PDF A4 vectoriel multipage", () => {
  const pdf = source("src/app/api/admin/preparation/synthesis/pdf/route.ts");
  assert.match(pdf, /PDFDocument\.create/);
  assert.match(pdf, /registerFontkit/);
  assert.match(pdf, /hero-formation-programme\.jpg/);
  assert.match(pdf, /page\.drawText/);
  assert.match(pdf, /if \(y < 58\)/);
  assert.match(pdf, /Ministry-School-Synthese-\$\{synthesis\.date\}\.pdf/);
});

test("les brouillons Programme et Synthèse sont chargés en une requête Supabase", () => {
  const page = source("src/app/gestion/preparation/page.tsx");
  const migration = source("supabase/migrations/20261122100000_training_synthesis_preparation.sql");
  assert.match(page, /rpc\("preparation_drafts_feed"\)/);
  assert.match(migration, /training_synthesis_drafts/);
  assert.match(migration, /preparation_drafts_feed/);
  assert.match(migration, /public\.is_super_admin\(\)/);
  assert.match(migration, /security invoker/);
});

test("les brouillons sont des instantanés protégés par RLS", () => {
  const migration = source("supabase/migrations/20261120220000_training_program_preparation.sql");
  assert.match(migration, /training_program_drafts/);
  assert.match(migration, /payload jsonb not null/);
  assert.match(migration, /created_by uuid not null/);
  assert.match(migration, /public\.is_super_admin\(\)/);
  assert.match(migration, /new\.created_by := old\.created_by/);
  assert.match(migration, /revoke all[\s\S]*from anon/);
});

test("la synchronisation copie les cours et opportunités sans modifier les sources", () => {
  const actions = source("src/app/gestion/preparation/actions.ts");
  assert.match(actions, /from\("sessions"\)/);
  assert.match(actions, /from\("opportunity_dates"\)/);
  assert.match(actions, /from\("session_trainers"\)/);
  assert.match(actions, /sourceId: `session:/);
  assert.match(actions, /sourceId: `opportunity:/);
  const importBlock = actions.slice(actions.indexOf("export async function importTrainingDay"), actions.indexOf("export async function saveProgramDraft"));
  assert.doesNotMatch(importBlock, /\.update\(|\.insert\(|\.delete\(/);
});

test("l’éditeur reste minimal, couvre deux jours et le parcours mobile", () => {
  const studio = source("src/components/preparation/PreparationStudio.tsx");
  const slot = source("src/components/preparation/SlotEditor.tsx");
  assert.match(studio, /Importer les formations/);
  assert.match(studio, /window\.confirm/);
  assert.match(studio, /Inclure le programme de l’après-midi/);
  assert.match(studio, /\['weekend', 'Les deux'\]/);
  assert.match(studio, /Glisser|onDragStart/);
  assert.match(studio, />Édition</);
  assert.match(studio, />Aperçu</);
  assert.match(studio, /Exporter en PDF/);
  assert.match(studio, /Exporter en PNG/);
  assert.match(studio, /html-to-image/);
  assert.match(studio, /\.png`/);
  assert.match(slot, /MINISTRY_PROGRAM_COLORS/);
  assert.match(slot, /Couleur du créneau/);
  assert.match(studio, /Dupliquer/);
  assert.match(studio, /Supprimer/);
  assert.match(slot, /Ce créneau est une pause/);
  assert.match(slot, /2 lignes maximum/);
  assert.doesNotMatch(slot, /Sous-titre ou thématique|Intervenant\(s\)|Salle ou lieu/);
});

test("l’aperçu expose chaque page à l’export PNG", () => {
  const preview = source("src/components/preparation/ProgramPreview.tsx");
  assert.match(preview, /data-program-page/);
  assert.match(preview, /slot\.color/);
  assert.match(preview, /--slot-color/);
});

test("les couleurs Ministry sont normalisées, sauvegardées et exportées dans le PDF", () => {
  const program = source("src/lib/preparation/program.ts");
  const pdf = source("src/app/api/admin/preparation/pdf/route.ts");
  for (const color of ["#f19f00", "#59c9ca", "#e34d1b", "#ee9a9c", "#c9dc6a"]) assert.match(program, new RegExp(color));
  assert.match(program, /color: ministryColor\(source\.color/);
  assert.match(pdf, /pdfColor\(slot\.color\)/);
  assert.match(pdf, /fonts\.title, 15, accent/);
});

test("l’export produit un PDF vectoriel A4 avec les polices et assets officiels", () => {
  const pdf = source("src/app/api/admin/preparation/pdf/route.ts");
  assert.match(pdf, /PDFDocument\.create/);
  assert.match(pdf, /registerFontkit/);
  assert.match(pdf, /geist-latin\.ttf/);
  assert.match(pdf, /jost-latin\.ttf/);
  assert.match(pdf, /bricolage-grotesque-latin\.ttf/);
  assert.match(pdf, /logo-compact\.png/);
  assert.match(pdf, /hero-formation-programme\.jpg/);
  assert.match(pdf, /Ministry-School-Programme-\$\{program\.baseDate\}\.pdf/);
  assert.match(pdf, /addPage\(\[PAGE\.width, PAGE\.height\]\)/);
  assert.match(pdf, /if \(y - height < 52\)/);
});
