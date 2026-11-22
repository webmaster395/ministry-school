import { MINISTRY_PROGRAM_COLORS, type MinistryProgramColor } from "./program";

export const SYNTHESIS_VERSION = 1 as const;

export type SynthesisBlockType = "heading" | "paragraph" | "bullet" | "quote";
export type SynthesisHeadingLevel = 1 | 2 | 3;

export type SynthesisBlock = {
  id: string;
  type: SynthesisBlockType;
  level: SynthesisHeadingLevel;
  text: string;
  color: MinistryProgramColor;
};

export type TrainingSynthesis = {
  version: typeof SYNTHESIS_VERSION;
  title: string;
  subtitle: string;
  date: string;
  speakers: string;
  introduction: string;
  coverImage: string;
  blocks: SynthesisBlock[];
};

export type SynthesisDraft = {
  id: string;
  title: string;
  synthesis_date: string;
  speakers: string;
  payload: TrainingSynthesis;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const cleanText = (value: unknown, max = 12000) =>
  typeof value === "string" ? value.replace(/\r/g, "").trim().slice(0, max) : "";

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const colorFor = (value: unknown, index: number): MinistryProgramColor => {
  const found = MINISTRY_PROGRAM_COLORS.find((color) => color.value === value);
  return found?.value ?? MINISTRY_PROGRAM_COLORS[index % MINISTRY_PROGRAM_COLORS.length].value;
};

function normalizeBlock(value: unknown, index: number): SynthesisBlock {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const type: SynthesisBlockType = source.type === "heading" || source.type === "bullet" || source.type === "quote"
    ? source.type
    : "paragraph";
  const level: SynthesisHeadingLevel = source.level === 2 || source.level === 3 ? source.level : 1;
  return {
    id: cleanText(source.id, 100) || `synthesis-${index}-${crypto.randomUUID()}`,
    type,
    level,
    text: cleanText(source.text),
    color: colorFor(source.color, index),
  };
}

export function normalizeTrainingSynthesis(value: unknown): TrainingSynthesis {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    version: SYNTHESIS_VERSION,
    title: cleanText(source.title, 220) || "Synthèse de cours",
    subtitle: cleanText(source.subtitle, 320),
    date: isDate(source.date) ? source.date : new Date().toISOString().slice(0, 10),
    speakers: cleanText(source.speakers, 320),
    introduction: cleanText(source.introduction, 1600),
    coverImage: cleanText(source.coverImage, 240) || "/landing/hero-formation-groupe.webp",
    blocks: Array.isArray(source.blocks)
      ? source.blocks.slice(0, 800).map(normalizeBlock).filter((block) => block.text)
      : [],
  };
}

export function createEmptySynthesis(date = new Date().toISOString().slice(0, 10)): TrainingSynthesis {
  return normalizeTrainingSynthesis({
    title: "Synthèse de cours",
    date,
    blocks: [],
  });
}

function pastedLineType(line: string): Pick<SynthesisBlock, "type" | "level" | "text"> {
  const bullet = /^(?:[-*•‣▪]|\d+[.)])\s+(.+)$/.exec(line);
  if (bullet) return { type: "bullet", level: 1, text: bullet[1] };
  const numberedHeading = /^\d+(?:\.\d+)*[.)]?\s+(.+)$/.exec(line);
  if (numberedHeading && line.length <= 150) return { type: "heading", level: 1, text: line };
  if (line.length <= 100 && (/^[A-ZÀ-ÖØ-Ý0-9\s'’:-]+$/.test(line) || /:$/.test(line))) {
    return { type: "heading", level: 2, text: line.replace(/:$/, "") };
  }
  return { type: "paragraph", level: 1, text: line };
}

export function blocksFromPastedText(value: string): SynthesisBlock[] {
  const lines = value.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 800);
  return lines.map((line, index) => ({
    id: crypto.randomUUID(),
    ...pastedLineType(line),
    color: MINISTRY_PROGRAM_COLORS[index % MINISTRY_PROGRAM_COLORS.length].value,
  }));
}

export function formatSynthesisDate(date: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}
