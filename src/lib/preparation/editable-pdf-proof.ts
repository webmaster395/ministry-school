import { applyEditablePdfOperations } from "./editable-pdf-source.ts";
import { NATHALIE_PROOF_SOURCE } from "./editable-pdf-proof-content.ts";

export { NATHALIE_PROOF_SOURCE };

const lineBreakIndex = NATHALIE_PROOF_SOURCE.blocks
  .find((block) => block.id === "paragraph-051")!
  .text.indexOf(" - un profil secondaire") + 1;

export const NATHALIE_PROOF_EDITED_SOURCE = applyEditablePdfOperations(NATHALIE_PROOF_SOURCE, [
  { type: "font-size", blockId: "paragraph-050", delta: 1.5 },
  { type: "color", blockId: "paragraph-050", color: "#27a8bd" },
  { type: "spacing", blockId: "paragraph-050", edge: "before", delta: 8 },
  { type: "spacing", blockId: "paragraph-050", edge: "after", delta: 6 },
  { type: "line-break", blockId: "paragraph-051", index: lineBreakIndex },
  { type: "page-break", blockId: "profile-053", value: true },
]);
