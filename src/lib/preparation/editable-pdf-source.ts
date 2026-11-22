export const EDITABLE_PDF_SCHEMA = "ministry-school.editable-pdf" as const;
export const EDITABLE_PDF_VERSION = 1 as const;
export const EDITABLE_PDF_ATTACHMENT_NAME = "ministry-school-source.v1.json";
export const EDITABLE_PDF_MEDIA_TYPE = "application/vnd.ministry-school.editable-pdf+json";

export type EditablePdfBlockKind = "title" | "heading" | "paragraph" | "quote";
export type EditablePdfFontRole = "display" | "body" | "label";

export type EditablePdfBlockV1 = {
  id: string;
  kind: EditablePdfBlockKind;
  text: string;
  style: {
    fontRole: EditablePdfFontRole;
    fontSize: number;
    lineHeight: number;
    color: string;
    spaceBefore: number;
    spaceAfter: number;
  };
  breakBefore: boolean;
};

export type EditablePdfSourceV1 = {
  schema: typeof EDITABLE_PDF_SCHEMA;
  version: typeof EDITABLE_PDF_VERSION;
  sourceId: string;
  sourceNotice: string;
  document: {
    title: string;
    date: string;
    speakers: string[];
  };
  template: {
    id: "ministry-editorial-anthracite";
    version: 1;
    pageSize: "A4";
    assetSet: "ministry-school-2026";
  };
  blocks: EditablePdfBlockV1[];
};

export type EditablePdfOperation =
  | { type: "font-size"; blockId: string; delta: number }
  | { type: "color"; blockId: string; color: string }
  | { type: "spacing"; blockId: string; edge: "before" | "after"; delta: number }
  | { type: "line-break"; blockId: string; index: number }
  | { type: "page-break"; blockId: string; value: boolean };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isBlock(value: unknown): value is EditablePdfBlockV1 {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<EditablePdfBlockV1>;
  const style = block.style as Partial<EditablePdfBlockV1["style"]> | undefined;
  return typeof block.id === "string"
    && ["title", "heading", "paragraph", "quote"].includes(block.kind ?? "")
    && typeof block.text === "string"
    && typeof block.breakBefore === "boolean"
    && !!style
    && ["display", "body", "label"].includes(style.fontRole ?? "")
    && typeof style.fontSize === "number"
    && typeof style.lineHeight === "number"
    && typeof style.color === "string"
    && HEX_COLOR.test(style.color)
    && typeof style.spaceBefore === "number"
    && typeof style.spaceAfter === "number";
}

export function isEditablePdfSource(value: unknown): value is EditablePdfSourceV1 {
  if (!value || typeof value !== "object") return false;
  const source = value as Partial<EditablePdfSourceV1>;
  return source.schema === EDITABLE_PDF_SCHEMA
    && source.version === EDITABLE_PDF_VERSION
    && typeof source.sourceId === "string"
    && typeof source.sourceNotice === "string"
    && !!source.document
    && typeof source.document.title === "string"
    && ISO_DATE.test(source.document.date)
    && Array.isArray(source.document.speakers)
    && source.document.speakers.every((speaker) => typeof speaker === "string")
    && source.template?.id === "ministry-editorial-anthracite"
    && source.template.version === 1
    && source.template.pageSize === "A4"
    && source.template.assetSet === "ministry-school-2026"
    && Array.isArray(source.blocks)
    && source.blocks.length > 0
    && source.blocks.every(isBlock);
}

export function parseEditablePdfSource(value: string | Uint8Array): EditablePdfSourceV1 {
  const json = typeof value === "string" ? value : new TextDecoder().decode(value);
  const parsed: unknown = JSON.parse(json);
  if (!isEditablePdfSource(parsed)) throw new Error("Source Ministry School absente, invalide ou incompatible.");
  return parsed;
}

export function serializeEditablePdfSource(source: EditablePdfSourceV1) {
  if (!isEditablePdfSource(source)) throw new Error("La source Ministry School ne respecte pas le format V1.");
  return new TextEncoder().encode(JSON.stringify(source));
}

export function applyEditablePdfOperation(source: EditablePdfSourceV1, operation: EditablePdfOperation): EditablePdfSourceV1 {
  let found = false;
  const blocks = source.blocks.map((block) => {
    if (block.id !== operation.blockId) return block;
    found = true;
    if (operation.type === "font-size") return { ...block, style: { ...block.style, fontSize: clamp(block.style.fontSize + operation.delta, 7, 42) } };
    if (operation.type === "color") {
      if (!HEX_COLOR.test(operation.color)) throw new Error("Couleur invalide.");
      return { ...block, style: { ...block.style, color: operation.color.toLowerCase() } };
    }
    if (operation.type === "spacing") {
      const key = operation.edge === "before" ? "spaceBefore" : "spaceAfter";
      return { ...block, style: { ...block.style, [key]: clamp(block.style[key] + operation.delta, 0, 72) } };
    }
    if (operation.type === "line-break") {
      const index = clamp(Math.round(operation.index), 0, block.text.length);
      return { ...block, text: `${block.text.slice(0, index).trimEnd()}\n${block.text.slice(index).trimStart()}` };
    }
    return { ...block, breakBefore: operation.value };
  });
  if (!found) throw new Error(`Bloc introuvable : ${operation.blockId}`);
  return { ...source, blocks };
}

export function applyEditablePdfOperations(source: EditablePdfSourceV1, operations: EditablePdfOperation[]) {
  return operations.reduce(applyEditablePdfOperation, source);
}
