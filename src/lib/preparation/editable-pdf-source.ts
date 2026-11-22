export const EDITABLE_PDF_SCHEMA = "ministry-school.editable-pdf" as const;
export const EDITABLE_PDF_VERSION = 1 as const;
export const EDITABLE_PDF_ATTACHMENT_NAME = "ministry-school-source.v1.json";
export const EDITABLE_PDF_MEDIA_TYPE = "application/vnd.ministry-school.editable-pdf+json";

export type EditablePdfBlockKind = "title" | "heading" | "paragraph" | "list-item" | "quote" | "table";
export type EditablePdfFontRole = "display" | "body" | "label";

export type EditablePdfTableV1 = {
  columns: string[];
  rows: string[][];
  widthPercent?: number;
  cellPadding?: number;
};

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
  table?: EditablePdfTableV1;
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
  | { type: "list-item"; blockId: string; value: boolean }
  | { type: "text-set"; blockId: string; value: string }
  | { type: "insert-block"; blockId: string; newBlockId: string; kind: "paragraph" | "table" }
  | { type: "delete-block"; blockId: string }
  | { type: "table-cell"; blockId: string; area: "header" | "body"; row?: number; column: number; value: string }
  | { type: "table-cell-list"; blockId: string; row: number; column: number; value: boolean }
  | { type: "table-row"; blockId: string; action: "add" | "remove"; row?: number }
  | { type: "table-column"; blockId: string; action: "add" | "remove"; column?: number }
  | { type: "table-size"; blockId: string; widthPercent?: number; paddingDelta?: number }
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
  const validTable = block.table === undefined || (
    Array.isArray(block.table.columns)
    && block.table.columns.length >= 1
    && block.table.columns.length <= 6
    && block.table.columns.every((cell) => typeof cell === "string")
    && Array.isArray(block.table.rows)
    && block.table.rows.length >= 1
    && block.table.rows.length <= 12
    && block.table.rows.every((row) => Array.isArray(row) && row.length === block.table!.columns.length && row.every((cell) => typeof cell === "string"))
    && (block.table.widthPercent === undefined || (typeof block.table.widthPercent === "number" && block.table.widthPercent >= 50 && block.table.widthPercent <= 100))
    && (block.table.cellPadding === undefined || (typeof block.table.cellPadding === "number" && block.table.cellPadding >= 4 && block.table.cellPadding <= 20))
  );
  return typeof block.id === "string"
    && ["title", "heading", "paragraph", "list-item", "quote", "table"].includes(block.kind ?? "")
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
    && validTable
    && (block.kind === "table" ? block.table !== undefined : block.table === undefined)
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

  if (operation.type === "insert-block") {
    const index = source.blocks.findIndex((block) => block.id === operation.blockId);
    if (index < 0) throw new Error(`Bloc introuvable : ${operation.blockId}`);
    if (!operation.newBlockId || source.blocks.some((block) => block.id === operation.newBlockId)) throw new Error("Identifiant du nouveau bloc invalide.");
    const anchor = source.blocks[index];
    const base = {
      id: operation.newBlockId,
      text: "",
      style: { ...anchor.style, fontRole: "body" as const, fontSize: 9, bold: false, underline: false, spaceBefore: 8, spaceAfter: 10 },
      breakBefore: false,
    };
    const inserted: EditablePdfBlockV1 = operation.kind === "table"
      ? { ...base, kind: "table", table: { columns: ["Colonne 1", "Colonne 2"], rows: [["", ""], ["", ""]], widthPercent: 100, cellPadding: 8 } }
      : { ...base, kind: "paragraph" };
    const blocks = [...source.blocks];
    blocks.splice(index + 1, 0, inserted);
    return { ...source, blocks };
  }

  if (operation.type === "delete-block") {
    const index = source.blocks.findIndex((block) => block.id === operation.blockId);
    if (index < 0) throw new Error(`Bloc introuvable : ${operation.blockId}`);
    if (source.blocks.length === 1) throw new Error("Le document doit conserver au moins un bloc.");
    return { ...source, blocks: source.blocks.filter((block) => block.id !== operation.blockId) };
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
    if (operation.type === "list-item") {
      return operation.value
        ? { ...block, kind: "list-item" as const, listLevel: block.listLevel ?? 0 }
        : { ...block, kind: "paragraph" as const, listLevel: undefined };
    }
    if (operation.type === "text-set") return { ...block, text: operation.value.slice(0, 20_000) };
    if (operation.type === "table-cell") {
      if (!block.table) throw new Error("Ce bloc n’est pas un tableau.");
      const table = { columns: [...block.table.columns], rows: block.table.rows.map((row) => [...row]) };
      if (operation.column < 0 || operation.column >= table.columns.length) throw new Error("Colonne de tableau invalide.");
      if (operation.area === "header") table.columns[operation.column] = operation.value.slice(0, 1_000);
      else {
        const row = operation.row ?? -1;
        if (row < 0 || row >= table.rows.length) throw new Error("Ligne de tableau invalide.");
        table.rows[row][operation.column] = operation.value.slice(0, 4_000);
      }
      return { ...block, table };
    }
    if (operation.type === "table-cell-list") {
      if (!block.table) throw new Error("Ce bloc n’est pas un tableau.");
      if (operation.row < 0 || operation.row >= block.table.rows.length) throw new Error("Ligne de tableau invalide.");
      if (operation.column < 0 || operation.column >= block.table.columns.length) throw new Error("Colonne de tableau invalide.");
      const table = { ...block.table, rows: block.table.rows.map((row) => [...row]) };
      const current = table.rows[operation.row][operation.column];
      table.rows[operation.row][operation.column] = operation.value
        ? (current.trim() ? current.split("\n").map((line) => line.trim() && !/^\s*•\s*/.test(line) ? `• ${line}` : line).join("\n") : "• ")
        : current.split("\n").map((line) => line.replace(/^(\s*)•\s*/, "$1")).join("\n");
      return { ...block, table };
    }
    if (operation.type === "table-row") {
      if (!block.table) throw new Error("Ce bloc n’est pas un tableau.");
      if (operation.action === "add") {
        if (block.table.rows.length >= 12) return block;
        return { ...block, table: { ...block.table, rows: [...block.table.rows, block.table.columns.map(() => "")] } };
      }
      if (block.table.rows.length <= 1) return block;
      const row = operation.row ?? block.table.rows.length - 1;
      if (row < 0 || row >= block.table.rows.length) throw new Error("Ligne de tableau invalide.");
      return { ...block, table: { ...block.table, rows: block.table.rows.filter((_, index) => index !== row) } };
    }
    if (operation.type === "table-column") {
      if (!block.table) throw new Error("Ce bloc n’est pas un tableau.");
      if (operation.action === "add") {
        if (block.table.columns.length >= 6) return block;
        return { ...block, table: { ...block.table, columns: [...block.table.columns, `Colonne ${block.table.columns.length + 1}`], rows: block.table.rows.map((row) => [...row, ""]) } };
      }
      if (block.table.columns.length <= 1) return block;
      const column = operation.column ?? block.table.columns.length - 1;
      if (column < 0 || column >= block.table.columns.length) throw new Error("Colonne de tableau invalide.");
      return { ...block, table: { ...block.table, columns: block.table.columns.filter((_, index) => index !== column), rows: block.table.rows.map((row) => row.filter((_, index) => index !== column)) } };
    }
    if (operation.type === "table-size") {
      if (!block.table) throw new Error("Ce bloc n’est pas un tableau.");
      const widthPercent = operation.widthPercent === undefined ? (block.table.widthPercent ?? 100) : clamp(Math.round(operation.widthPercent / 5) * 5, 50, 100);
      const cellPadding = clamp((block.table.cellPadding ?? 8) + (operation.paddingDelta ?? 0), 4, 20);
      return { ...block, table: { ...block.table, widthPercent, cellPadding } };
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

function lineCount(text: string, charactersPerLine: number) {
  return text.split("\n").reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charactersPerLine)), 0);
}

export function estimateEditablePdfBlockHeight(block: EditablePdfBlockV1) {
  if (block.kind === "table" && block.table) {
    const rowHeight = Math.max(24, block.style.fontSize * block.style.lineHeight * 2 + (block.table.cellPadding ?? 8) * 2);
    return block.style.spaceBefore + (block.table.rows.length + 1) * rowHeight + block.style.spaceAfter + 4;
  }
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

  const pageHeight = (page: EditablePdfPageGroup) => page.blocks.reduce((total, block) => total + estimateEditablePdfBlockHeight(block), page.continuationOf ? 28 : 0);
  for (let index = pages.length - 1; index > 0; index -= 1) {
    const current = pages[index];
    const previous = pages[index - 1];
    if (current.blocks[0]?.breakBefore) continue;
    let currentHeight = pageHeight(current);
    let previousHeight = pageHeight(previous);
    while (currentHeight < 175 && previous.blocks.length > 1) {
      const candidate = previous.blocks.at(-1)!;
      const candidateHeight = estimateEditablePdfBlockHeight(candidate);
      if (candidate.kind === "title" || previousHeight - candidateHeight < 260) break;
      previous.blocks.pop();
      current.blocks.unshift(candidate);
      previousHeight -= candidateHeight;
      currentHeight += candidateHeight;
    }
  }

  return pages.length ? pages : [{ blocks: [] }];
}
