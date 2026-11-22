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
  serializeEditablePdfSource,
} from "../src/lib/preparation/editable-pdf-source.ts";

test("le format V1 est autonome, versionné et sérialisable", () => {
  assert.equal(EDITABLE_PDF_ATTACHMENT_NAME, "ministry-school-source.v1.json");
  assert.equal(isEditablePdfSource(NATHALIE_PROOF_SOURCE), true);
  assert.deepEqual(parseEditablePdfSource(serializeEditablePdfSource(NATHALIE_PROOF_SOURCE)), NATHALIE_PROOF_SOURCE);
});

test("les cinq opérations modifient uniquement la source ciblée", () => {
  const original = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.id === "grace-paragraph");
  const edited = NATHALIE_PROOF_EDITED_SOURCE.blocks.find((block) => block.id === "grace-paragraph");
  const conclusion = NATHALIE_PROOF_EDITED_SOURCE.blocks.find((block) => block.id === "conclusion");
  assert.equal(original.style.fontSize, 10.5);
  assert.equal(edited.style.fontSize, 12.5);
  assert.equal(edited.style.color, "#e34d1b");
  assert.equal(edited.style.spaceBefore, 12);
  assert.equal(edited.style.spaceAfter, 22);
  assert.match(edited.text, /Saint-Esprit\.\nLa grâce/);
  assert.equal(conclusion.breakBefore, true);
  assert.equal(NATHALIE_PROOF_SOURCE.blocks.find((block) => block.id === "conclusion").breakBefore, false);
});

test("la taille et l’espacement restent dans les bornes éditoriales", () => {
  const tiny = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "font-size", blockId: "identity-intro", delta: -100 });
  const spaced = applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "spacing", blockId: "identity-intro", edge: "after", delta: 200 });
  assert.equal(tiny.blocks.find((block) => block.id === "identity-intro").style.fontSize, 7);
  assert.equal(spaced.blocks.find((block) => block.id === "identity-intro").style.spaceAfter, 72);
});

test("une couleur invalide et un bloc inconnu sont refusés", () => {
  assert.throws(() => applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "color", blockId: "identity-intro", color: "red" }), /Couleur invalide/);
  assert.throws(() => applyEditablePdfOperation(NATHALIE_PROOF_SOURCE, { type: "page-break", blockId: "absent", value: true }), /Bloc introuvable/);
});
