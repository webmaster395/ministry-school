import { applyEditablePdfOperations, type EditablePdfSourceV1 } from "./editable-pdf-source.ts";

export const NATHALIE_PROOF_SOURCE: EditablePdfSourceV1 = {
  schema: "ministry-school.editable-pdf",
  version: 1,
  sourceId: "proof-nathalie-boudehent-2026-11-07",
  sourceNotice: "Source de test créée à partir du contenu connu du cours ; elle ne prétend pas avoir été extraite fidèlement d’un PDF.",
  document: {
    title: "Découvre ce qui te rend unique",
    date: "2026-11-07",
    speakers: ["Nathalie Boudehent"],
  },
  template: {
    id: "ministry-editorial-anthracite",
    version: 1,
    pageSize: "A4",
    assetSet: "ministry-school-2026",
  },
  blocks: [
    {
      id: "section-title",
      kind: "title",
      text: "Avant le ministère, la personne",
      style: { fontRole: "display", fontSize: 25, lineHeight: 1.12, color: "#25302f", spaceBefore: 0, spaceAfter: 26 },
      breakBefore: false,
    },
    {
      id: "identity-intro",
      kind: "paragraph",
      text: "Avant d’être un ministère, vous êtes une personne. Le cours porte sur l’identité, la personnalité et les dons que Dieu a donnés.",
      style: { fontRole: "body", fontSize: 10.5, lineHeight: 1.52, color: "#25302f", spaceBefore: 0, spaceAfter: 12 },
      breakBefore: false,
    },
    {
      id: "grace-paragraph",
      kind: "paragraph",
      text: "L’objectif est de comprendre ce que Dieu a mis en nous et de l’accueillir par le Saint-Esprit. La grâce ne dépend pas de notre mérite.",
      style: { fontRole: "body", fontSize: 10.5, lineHeight: 1.52, color: "#25302f", spaceBefore: 0, spaceAfter: 12 },
      breakBefore: false,
    },
    {
      id: "scripture",
      kind: "quote",
      text: "Je suis ce que je suis par la grâce de Dieu. — 1 Corinthiens 15.10",
      style: { fontRole: "display", fontSize: 12, lineHeight: 1.5, color: "#25302f", spaceBefore: 10, spaceAfter: 14 },
      breakBefore: false,
    },
    {
      id: "conclusion",
      kind: "paragraph",
      text: "Dieu nous a équipés pour une mission et nous donne le Saint-Esprit pour développer ce qu’il a placé en nous.",
      style: { fontRole: "body", fontSize: 10.5, lineHeight: 1.52, color: "#25302f", spaceBefore: 0, spaceAfter: 0 },
      breakBefore: false,
    },
  ],
};

const lineBreakIndex = NATHALIE_PROOF_SOURCE.blocks.find((block) => block.id === "grace-paragraph")!.text.indexOf(" La grâce") + 1;

export const NATHALIE_PROOF_EDITED_SOURCE = applyEditablePdfOperations(NATHALIE_PROOF_SOURCE, [
  { type: "font-size", blockId: "grace-paragraph", delta: 2 },
  { type: "color", blockId: "grace-paragraph", color: "#e34d1b" },
  { type: "spacing", blockId: "grace-paragraph", edge: "before", delta: 12 },
  { type: "spacing", blockId: "grace-paragraph", edge: "after", delta: 10 },
  { type: "line-break", blockId: "grace-paragraph", index: lineBreakIndex },
  { type: "page-break", blockId: "conclusion", value: true },
]);
