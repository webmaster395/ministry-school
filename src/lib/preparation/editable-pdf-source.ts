export const EDITABLE_PDF_SCHEMA = "ministry-school.editable-pdf" as const;
export const EDITABLE_PDF_VERSION = 1 as const;
export const EDITABLE_PDF_ATTACHMENT_NAME = "ministry-school-source.v1.json";
export const EDITABLE_PDF_MEDIA_TYPE = "application/vnd.ministry-school.editable-pdf+json";

export type EditablePdfBlockKind = "title" | "heading" | "paragraph" | "list-item" | "quote";
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
    bold?: boolean;
    underline?: boolean;
  };
  breakBefore: boolean;
  listLevel?: number;
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
    schedule?: string;
    location?: string;
    category?: string;
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
  | { type: "font-size-set"; blockId: string; value: number }
  | { type: "color"; blockId: string; color: string }
  | { type: "text-style"; blockId: string; style: "bold" | "underline"; value: boolean }
  | { type: "spacing"; blockId: string; edge: "before" | "after"; delta: number }
  | { type: "line-break"; blockId: string; index: number }
  | { type: "page-break"; blockId: string; value: boolean }
  | { type: "move-block"; blockId: string; direction: "up" | "down" };

export type EditablePdfPageGroup = {
  blocks: EditablePdfBlockV1[];
  continuationOf?: string;
};

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
    && ["title", "heading", "paragraph", "list-item", "quote"].includes(block.kind ?? "")
    && typeof block.text === "string"
    && typeof block.breakBefore === "boolean"
    && !!style
    && ["display", "body", "label"].includes(style.fontRole ?? "")
    && typeof style.fontSize === "number"
    && typeof style.lineHeight === "number"
    && typeof style.color === "string"
    && HEX_COLOR.test(style.color)
    && typeof style.spaceBefore === "number"
    && typeof style.spaceAfter === "number"
    && (style.bold === undefined || typeof style.bold === "boolean")
    && (style.underline === undefined || typeof style.underline === "boolean")
    && (block.listLevel === undefined || (Number.isInteger(block.listLevel) && block.listLevel >= 0 && block.listLevel <= 2));
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
    && (source.document.schedule === undefined || typeof source.document.schedule === "string")
    && (source.document.location === undefined || typeof source.document.location === "string")
    && (source.document.category === undefined || typeof source.document.category === "string")
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
  if (operation.type === "move-block") {
    const index = source.blocks.findIndex((block) => block.id === operation.blockId);
    if (index < 0) throw new Error(`Bloc introuvable : ${operation.blockId}`);
    const target = operation.direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= source.blocks.length) return source;
    const blocks = [...source.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    return { ...source, blocks };
  }

  let found = false;
  const blocks = source.blocks.map((block) => {
    if (block.id !== operation.blockId) return block;
    found = true;
    if (operation.type === "font-size") return { ...block, style: { ...block.style, fontSize: clamp(block.style.fontSize + operation.delta, 6, 72) } };
    if (operation.type === "font-size-set") {
      if (!Number.isFinite(operation.value)) throw new Error("Taille de police invalide.");
      return { ...block, style: { ...block.style, fontSize: clamp(Math.round(operation.value * 2) / 2, 6, 72) } };
    }
    if (operation.type === "color") {
      if (!HEX_COLOR.test(operation.color)) throw new Error("Couleur invalide.");
      return { ...block, style: { ...block.style, color: operation.color.toLowerCase() } };
    }
    if (operation.type === "text-style") return { ...block, style: { ...block.style, [operation.style]: operation.value } };
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

function lineCount(text: string, charactersPerLine: number) {
  return text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0);
}

export function estimateEditablePdfBlockHeight(block: EditablePdfBlockV1) {
  const characters = Math.max(24, Math.floor(76 * (9.5 / block.style.fontSize)));
  const lines = lineCount(block.text, block.kind === "title" ? Math.max(24, characters - 18) : characters);
  const textHeight = lines * block.style.fontSize * block.style.lineHeight;
  const furniture = block.kind === "title" ? 58 : block.kind === "quote" ? 30 : block.kind === "heading" ? 10 : 4;
  return block.style.spaceBefore + textHeight + block.style.spaceAfter + furniture;
}

export function paginateEditablePdfBlocks(blocks: EditablePdfBlockV1[], budget = 650): EditablePdfPageGroup[] {
  const pages: EditablePdfPageGroup[] = [];
  let current: EditablePdfPageGroup | null = null;
  let used = 0;
  let currentSection = "";

  for (const block of blocks) {
    if (block.kind === "title") currentSection = block.text;
    const height = estimateEditablePdfBlockHeight(block);
    const forcedBreak = block.breakBefore && !!current?.blocks.length;
    const automaticBreak = !!current?.blocks.length && used + height > budget;
    if (!current || forcedBreak || automaticBreak) {
      current = { blocks: [], continuationOf: block.kind === "title" ? undefined : currentSection || undefined };
      pages.push(current);
      used = current.continuationOf ? 28 : 0;
    }
    current.blocks.push(block);
    used += height;
  }

  const last = pages.at(-1);
  const previous = pages.at(-2);
  if (last && previous && !last.blocks[0]?.breakBefore) {
    const pageHeight = (page: EditablePdfPageGroup) => page.blocks.reduce((total, block) => total + estimateEditablePdfBlockHeight(block), page.continuationOf ? 28 : 0);
    let lastHeight = pageHeight(last);
    let previousHeight = pageHeight(previous);
    while (lastHeight < 175 && previous.blocks.length > 1) {
      const candidate = previous.blocks.at(-1)!;
      const candidateHeight = estimateEditablePdfBlockHeight(candidate);
      if (candidate.kind === "title" || previousHeight - candidateHeight < 260) break;
      previous.blocks.pop();
      last.blocks.unshift(candidate);
      previousHeight -= candidateHeight;
      lastHeight += candidateHeight;
    }
  }

  return pages.length ? pages : [{ blocks: [] }];
}
