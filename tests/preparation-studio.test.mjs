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
  const editablePdf = source("src/app/api/admin/preparation/editable-pdf/route.tsx");
  const editablePdfImport = source("src/app/api/admin/preparation/editable-pdf/import/route.ts");
  assert.match(layout, /!viewer\?\.roles\.superAdmin/);
  assert.match(actions, /requireSuperAdmin/);
  assert.match(actions, /!viewer\?\.roles\.superAdmin/);
  assert.match(pdf, /!viewer\?\.roles\.superAdmin/);
  assert.match(pdf, /status: 403/);
  assert.match(synthesisImport, /!viewer\?\.roles\.superAdmin/);
  assert.match(synthesisPdf, /!viewer\?\.roles\.superAdmin/);
  assert.match(editablePdf, /!viewer\?\.roles\.superAdmin/);
  assert.match(editablePdf, /status: 403/);
  assert.match(editablePdfImport, /!viewer\?\.roles\.superAdmin/);
  assert.match(editablePdfImport, /MAX_PDF_BYTES/);
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

test("une synthèse importe un PDF compatible et limite l’édition aux opérations simples", () => {
  const studio = source("src/components/preparation/SynthesisStudio.tsx");
  assert.match(studio, /Importer un PDF/);
  assert.match(studio, /application\/pdf/);
  assert.match(studio, /EDITABLE_PDF_ATTACHMENT_NAME/);
  assert.match(studio, /convertPdfToSource/);
  assert.match(studio, /editable-pdf\/import/);
  assert.match(studio, /font-size/);
  assert.match(studio, /font-size-set/);
  assert.match(studio, /text-style/);
  assert.match(studio, /move-block/);
  assert.match(studio, /list-item/);
  assert.match(studio, /Liste à puces/);
  assert.match(studio, /Taille de police en points/);
  assert.match(studio, /Gras/);
  assert.match(studio, /Souligné/);
  assert.match(studio, /line-break/);
  assert.match(studio, /page-break/);
  assert.match(studio, /Annuler/);
  assert.match(studio, /Rétablir/);
  assert.match(studio, /Lecture seule/);
  assert.doesNotMatch(studio, /Importer un Word|Structurer le texte|Couleur du titre/);
});

test("l’éditeur PDF présente la couverture sombre et les pages blanches cliquables", () => {
  const studio = source("src/components/preparation/SynthesisStudio.tsx");
  assert.match(studio, /bg-\[#25302f\]/);
  assert.match(studio, /bg-\[#fffcf7\]/);
  assert.match(studio, /data-editable-pdf-block/);
  assert.match(studio, /FloatingTools/);
  assert.match(studio, /Exemple Nathalie/);
});

test("l’export de l’éditeur réutilise le moteur commun et rattache la source", () => {
  const pdf = source("src/app/api/admin/preparation/editable-pdf/route.tsx");
  assert.match(pdf, /EditablePdfProofDocument/);
  assert.match(pdf, /renderToBuffer/);
  assert.match(pdf, /attachEditablePdfSource/);
  assert.match(pdf, /isEditablePdfSource/);
  assert.match(pdf, /private, no-store/);
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
