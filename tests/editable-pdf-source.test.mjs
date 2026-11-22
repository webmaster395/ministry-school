import test from "node:test";
import assert from "node:assert/strict";
import {
  NATHALIE_PROOF_EDITED_SOURCE,
  NATHALIE_PROOF_SOURCE,
} from "../src/lib/preparation/editable-pdf-proof.ts";
import {
  EDITABLE_PDF_ATTACHMENT_NAME,
  applyEditablePdfOperation,
  isEditablePdfSource,
  parseEditablePdfSource,
  paginateEditablePdfBlocks,
  serializeEditablePdfSource,
} from "../src/lib/preparation/editable-pdf-source.ts";

test("le format V1 est autonome, versionné et sérialisable", () => {
  assert.equal(EDITABLE_PDF_ATTACHMENT_NAME, "ministry-school-source.v1.json");
  assert.equal(isEditablePdfSource(NATHALIE_PROOF_SOURCE), true);
  assert.equal(NATHALIE_PROOF_SOURCE.blocks.length, 130);
  assert.equal(NATHALIE_PROOF_SOURCE.blocks.filter((block) => block.kind === "title").length, 9);
  assert.equal(NATHALIE_PROOF_SOURCE.document.location, "MLK Studio (MLK 2) — 2 Rue Tirard, 94000 Créteil");
  assert.match(NATHALIE_PROOF_SOURCE.blocks.at(-1).text, /instrument façonné par Dieu/);
  assert.deepEqual(parseEditablePdfSource(serializeEditablePdfSource(NATHALIE_PROOF_SOURCE)), NATHALIE_PROOF_SOURCE);
});

test("les opérations visuelles modifient uniquement les blocs ciblés", () => {
  const original = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.id === "paragraph-050");
  const edited = NATHALIE_PROOF_EDITED_SOURCE.blocks.find((block) => block.id === "paragraph-050");
  const profile = NATHALIE_PROOF_EDITED_SOURCE.blocks.find((block) => block.id === "profile-053");
  assert.equal(original.style.fontSize, 9.8);
  assert.equal(edited.style.fontSize, 11.3);
  assert.equal(edited.style.color, "#27a8bd");
  assert.equal(edited.style.spaceBefore, 8);
  assert.equal(edited.style.spaceAfter, 15);
  assert.match(NATHALIE_PROOF_EDITED_SOURCE.blocks.find((block) => block.id === "paragraph-051").text, /profil principal ;\n- un profil secondaire/);
  assert.equal(profile.breakBefore, true);
  assert.equal(NATHALIE_PROOF_SOURCE.blocks.find((block) => block.id === "profile-053").breakBefore, false);
});

test("la taille et l’espacement restent dans les bornes éditoriales", () => {
  const tiny = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "font-size", blockId: "list-item-002", delta: -100 });
  const exact = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "font-size-set", blockId: "list-item-002", value: 13.5 });
  const spaced = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "spacing", blockId: "list-item-002", edge: "after", delta: 200 });
  assert.equal(tiny.blocks.find((block) => block.id === "list-item-002").style.fontSize, 6);
  assert.equal(exact.blocks.find((block) => block.id === "list-item-002").style.fontSize, 13.5);
  assert.equal(spaced.blocks.find((block) => block.id === "list-item-002").style.spaceAfter, 72);
});

test("le gras, le soulignement et l’ordre des blocs restent éditables", () => {
  const blockId = NATHALIE_PROOF_SOURCE.blocks[1].id;
  const nextId = NATHALIE_PROOF_SOURCE.blocks[2].id;
  const bold = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "text-style", blockId, style: "bold", value: true });
  const underlined = applyEditablePdfOperation(bold, { type: "text-style", blockId, style: "underline", value: true });
  const moved = applyEditablePdfOperation(underlined, { type: "move-block", blockId, direction: "down" });
  assert.equal(moved.blocks.find((block) => block.id === blockId).style.bold, true);
  assert.equal(moved.blocks.find((block) => block.id === blockId).style.underline, true);
  assert.equal(moved.blocks[1].id, nextId);
  assert.equal(moved.blocks[2].id, blockId);
});

test("un paragraphe peut devenir une puce puis revenir en texte normal", () => {
  const paragraph = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.kind === "paragraph");
  const listed = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "list-item", blockId: paragraph.id, value: true });
  const restored = applyEditablePdfOperation(listed, { type: "list-item", blockId: paragraph.id, value: false });
  assert.equal(listed.blocks.find((block) => block.id === paragraph.id).kind, "list-item");
  assert.equal(listed.blocks.find((block) => block.id === paragraph.id).listLevel, 0);
  assert.equal(restored.blocks.find((block) => block.id === paragraph.id).kind, "paragraph");
  assert.equal(restored.blocks.find((block) => block.id === paragraph.id).listLevel, undefined);
});

test("le texte, les blocs et les lignes d’un tableau restent entièrement éditables", () => {
  const anchor = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.kind === "paragraph");
  const changed = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "text-set", blockId: anchor.id, value: "Texte corrigé" });
  const withParagraph = applyEditablePdfOperation(changed, { type: "insert-block", blockId: anchor.id, newBlockId: "manual-paragraph", kind: "paragraph" });
  const withTable = applyEditablePdfOperation(withParagraph, { type: "insert-block", blockId: "manual-paragraph", newBlockId: "manual-table", kind: "table" });
  const withHeader = applyEditablePdfOperation(withTable, { type: "table-cell", blockId: "manual-table", area: "header", column: 0, value: "Profil" });
  const withCell = applyEditablePdfOperation(withHeader, { type: "table-cell", blockId: "manual-table", area: "body", row: 0, column: 0, value: "Conquérant" });
  const withRow = applyEditablePdfOperation(withCell, { type: "table-row", blockId: "manual-table", action: "add" });
  const withoutRow = applyEditablePdfOperation(withRow, { type: "table-row", blockId: "manual-table", action: "remove", row: 1 });
  const withoutParagraph = applyEditablePdfOperation(withoutRow, { type: "delete-block", blockId: "manual-paragraph" });
  assert.equal(changed.blocks.find((block) => block.id === anchor.id).text, "Texte corrigé");
  assert.equal(withTable.blocks.find((block) => block.id === "manual-table").table.rows.length, 2);
  assert.equal(withCell.blocks.find((block) => block.id === "manual-table").table.rows[0][0], "Conquérant");
  assert.equal(withRow.blocks.find((block) => block.id === "manual-table").table.rows.length, 3);
  assert.equal(withoutRow.blocks.find((block) => block.id === "manual-table").table.rows.length, 2);
  assert.equal(withoutParagraph.blocks.some((block) => block.id === "manual-paragraph"), false);
  assert.equal(isEditablePdfSource(withoutParagraph), true);
});

test("une couleur invalide et un bloc inconnu sont refusés", () => {
  assert.throws(() => applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "color", blockId: "list-item-002", color: "red" }), /Couleur invalide/);
  assert.throws(() => applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "page-break", blockId: "absent", value: true }), /Bloc introuvable/);
});

test("la pagination rééquilibre une dernière page presque vide", () => {
  const prototype = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.kind === "paragraph");
  const blocks = Array.from({ length: 8 }, (_, index) => ({
    ...prototype,
    id: `balance-${index}`,
    text: `Paragraphe ${index + 1}`,
    style: { ...prototype.style, spaceAfter: 72 },
    breakBefore: false,
  }));
  const pages = paginateEditablePdfBlocks(blocks);
  assert.equal(pages.length, 2);
  assert.equal(pages.at(-1).blocks.length, 2);
});
