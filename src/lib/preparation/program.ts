export const PROGRAM_VERSION = 1 as const;

export type ProgramDayKind = "samedi" | "dimanche";
export type ProgramDayMode = ProgramDayKind | "weekend";
export type ProgramSlotType = "formation" | "pause" | "atelier" | "autre";

export type ProgramSlot = {
  id: string;
  start: string;
  end: string;
  type: ProgramSlotType;
  title: string;
  subtitle: string;
  speaker: string;
  description: string;
  location: string;
  sourceId?: string;
};

export type ProgramDay = {
  kind: ProgramDayKind;
  date: string;
  includeAfternoon: boolean;
  morning: ProgramSlot[];
  afternoon: ProgramSlot[];
};

export type TrainingProgram = {
  version: typeof PROGRAM_VERSION;
  title: string;
  subtitle: string;
  introduction: string;
  audience: string;
  baseDate: string;
  dayMode: ProgramDayMode;
  coverImage: string;
  days: ProgramDay[];
};

export type ProgramDraft = {
  id: string;
  title: string;
  program_date: string;
  day_mode: ProgramDayMode;
  payload: TrainingProgram;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const text = (value: unknown, max = 5000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const isDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const time = (value: unknown) => {
  const candidate = text(value, 5);
  return /^\d{2}:\d{2}$/.test(candidate) ? candidate : "";
};

function normalizeSlot(value: unknown, index: number): ProgramSlot {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const slotType = source.type;
  return {
    id: text(source.id, 80) || `slot-${index}-${crypto.randomUUID()}`,
    start: time(source.start),
    end: time(source.end),
    type: slotType === "pause" || slotType === "atelier" || slotType === "autre" ? slotType : "formation",
    title: text(source.title, 220),
    subtitle: text(source.subtitle, 320),
    speaker: text(source.speaker, 320),
    description: text(source.description, 1600),
    location: text(source.location, 220),
    ...(text(source.sourceId, 120) ? { sourceId: text(source.sourceId, 120) } : {}),
  };
}

function normalizeSlots(value: unknown): ProgramSlot[] {
  return Array.isArray(value) ? value.slice(0, 100).map(normalizeSlot) : [];
}

function normalizeDay(value: unknown, kind: ProgramDayKind, fallbackDate: string): ProgramDay {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    kind,
    date: isDate(source.date) ? source.date : fallbackDate,
    includeAfternoon: source.includeAfternoon === true,
    morning: normalizeSlots(source.morning),
    afternoon: normalizeSlots(source.afternoon),
  };
}

export function normalizeTrainingProgram(value: unknown): TrainingProgram {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const baseDate = isDate(source.baseDate) ? source.baseDate : new Date().toISOString().slice(0, 10);
  const dayMode: ProgramDayMode = source.dayMode === "samedi" || source.dayMode === "weekend" ? source.dayMode : "dimanche";
  const rawDays = Array.isArray(source.days) ? source.days : [];
  const day = (kind: ProgramDayKind) => rawDays.find((item) => item && typeof item === "object" && (item as { kind?: unknown }).kind === kind);
  return {
    version: PROGRAM_VERSION,
    title: text(source.title, 180) || "Programme de formation",
    subtitle: text(source.subtitle, 280),
    introduction: text(source.introduction, 2400),
    audience: text(source.audience, 900),
    baseDate,
    dayMode,
    coverImage: text(source.coverImage, 240) || "/landing/hero-formation-groupe.webp",
    days: activeDayKinds(dayMode).map((kind) => normalizeDay(day(kind), kind, dateForDay(baseDate, kind))),
  };
}

export function activeDayKinds(mode: ProgramDayMode): ProgramDayKind[] {
  if (mode === "weekend") return ["samedi", "dimanche"];
  return [mode];
}

export function dateForDay(baseDate: string, kind: ProgramDayKind): string {
  const date = new Date(`${baseDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return baseDate;
  const current = date.getDay();
  const target = kind === "samedi" ? 6 : 0;
  let delta = target - current;
  if (kind === "samedi" && current === 0) delta = -1;
  if (kind === "dimanche" && current === 6) delta = 1;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

export function createEmptyProgram(date = new Date().toISOString().slice(0, 10)): TrainingProgram {
  const baseDate = dateForDay(date, "dimanche");
  return {
    version: PROGRAM_VERSION,
    title: "Programme de formation",
    subtitle: "",
    introduction: "",
    audience: "Formations destinées aux leaders, collaborateurs et porteurs de projets.",
    baseDate,
    dayMode: "dimanche",
    coverImage: "/landing/hero-formation-groupe.webp",
    days: [{ kind: "dimanche", date: baseDate, includeAfternoon: false, morning: [], afternoon: [] }],
  };
}

export function formatProgramDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("fr-FR", options ?? { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${date}T12:00:00`));
}

export function sortSlots(slots: ProgramSlot[]) {
  return [...slots].sort((a, b) => (a.start || "99:99").localeCompare(b.start || "99:99"));
}
