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
