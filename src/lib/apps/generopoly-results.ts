import type { GeneropolyTable, GeneropolyValues } from "@/lib/apps/generopoly";

export const financeCategories = [
  ["savings", "💰 Épargne"],
  ["leisure", "🖼️ Loisirs"],
  ["generosity", "💚 Générosité"],
  ["projects", "🚀 Projets personnels"],
  ["reserve", "⛑️ Réserve pour imprévus"],
] as const;
export const timeCategories = [
  ["family", "👫 Famille et proches"],
  ["rest", "🧘 Repos et loisirs"],
  ["spiritual", "✝️ Vie spirituelle"],
  ["service", "💚 Service et solidarité"],
  ["projects", "🚀 Projets personnels"],
] as const;

export type Evolution = "increased" | "decreased" | "maintained" | "suspended";

function values(table: GeneropolyTable, field: string): GeneropolyValues {
  const value = table.state[field];
  return value && typeof value === "object" && !Array.isArray(value) ? value as GeneropolyValues : {};
}

export function average(numbers: number[]) {
  return numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : 0;
}

function numericValue(table: GeneropolyTable, field: string, key: string) {
  const value = values(table, field)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function averageAllocation(tables: GeneropolyTable[], field: string, categories: readonly (readonly [string, string])[]) {
  return categories.map(([key, label]) => {
    const numbers = tables.map((table) => numericValue(table, field, key)).filter((value): value is number => value !== null);
    return { key, label, value: average(numbers), sampleCount: numbers.length };
  });
}

export function classifyEvolution(initial: number, current: number): Evolution {
  if (initial > 0 && current === 0) return "suspended";
  if (current > initial) return "increased";
  if (current < initial) return "decreased";
  return "maintained";
}

export function evolutionSummary(tables: GeneropolyTable[], initialField: string, currentField: string, key: string) {
  const counts: Record<Evolution, number> = { increased: 0, decreased: 0, maintained: 0, suspended: 0 };
  let total = 0;
  tables.forEach((table) => {
    const initial = numericValue(table, initialField, key);
    const current = numericValue(table, currentField, key);
    if (initial === null || current === null) return;
    counts[classifyEvolution(initial, current)] += 1;
    total += 1;
  });
  return { ...counts, total };
}

export function comparisonAllocation(tables: GeneropolyTable[], initialField: string, currentField: string, categories: readonly (readonly [string, string])[]) {
  return categories.map(([key, label]) => {
    const pairs = tables.map((table) => ({ initial: numericValue(table, initialField, key), current: numericValue(table, currentField, key) }))
      .filter((pair): pair is { initial: number; current: number } => pair.initial !== null && pair.current !== null);
    const initial = average(pairs.map((pair) => pair.initial));
    const current = average(pairs.map((pair) => pair.current));
    const difference = current - initial;
    return {
      key,
      label,
      initial,
      current,
      difference,
      percent: initial === 0 ? null : difference / initial * 100,
      evolution: classifyEvolution(initial, current),
      sampleCount: pairs.length,
    };
  });
}

export function sortAllocationRows<T extends { key: string; value?: number; current?: number }>(rows: T[]) {
  return rows.map((row, stableIndex) => ({ row, stableIndex }))
    .sort((a, b) => (b.row.current ?? b.row.value ?? 0) - (a.row.current ?? a.row.value ?? 0) || a.stableIndex - b.stableIndex)
    .map(({ row }) => row);
}

export type ResultMarker = "decrease" | "preserved" | "increase";

export function resultMarkers(rows: ReturnType<typeof comparisonAllocation>) {
  const comparable = rows.filter((row) => row.sampleCount > 0 && row.percent !== null);
  const variations = new Set(comparable.map((row) => row.percent));
  const markers = new Map<string, ResultMarker[]>();
  if (comparable.length < 2 || variations.size < 2) return markers;
  const decreases = comparable.filter((row) => Number(row.percent) < 0);
  const increases = comparable.filter((row) => Number(row.percent) > 0);
  const priorities: Array<{ kind: ResultMarker; value: number }> = [];
  if (decreases.length) priorities.push({ kind: "decrease", value: Math.min(...decreases.map((row) => Number(row.percent))) });
  if (increases.length) priorities.push({ kind: "increase", value: Math.max(...increases.map((row) => Number(row.percent))) });
  else priorities.push({ kind: "preserved", value: Math.max(...comparable.map((row) => Number(row.percent))) });
  priorities.slice(0, 2).forEach(({ kind, value }) => comparable.filter((row) => row.percent === value).forEach((row) => markers.set(row.key, [...(markers.get(row.key) ?? []), kind])));
  return markers;
}

export function extractAnswers(tables: GeneropolyTable[]) {
  const specs = [
    ["financeCardWhy", "Argent", "Choix face à l’imprévu"],
    ["financeAfterOneWhy", "Argent", "Arbitrage ponctuel"],
    ["financeFinalWhy", "Argent", "Choix durable"],
    ["timeCardWhy", "Temps", "Choix face à l’imprévu"],
    ["timeAfterOneWhy", "Temps", "Arbitrage ponctuel"],
    ["timeFinalWhy", "Temps", "Choix durable"],
  ] as const;
  const answers: { id: string; tableId: string; key: string; group: string; mission: string; question: string; text: string; selected: boolean }[] = [];
  tables.forEach((table) => {
    specs.forEach(([field, mission, question]) => {
      const text = String(table.state[field] ?? "").trim();
      if (text) answers.push({ id: `${table.id}-${field}`, tableId: table.id, key: field, group: table.name, mission, question, text, selected: table.projected.includes(field) });
    });
    const mirror = Array.isArray(table.state.mirror) ? table.state.mirror as string[] : [];
    mirror.forEach((text, index) => {
      if (text?.trim()) answers.push({ id: `${table.id}-mirror-${index}`, tableId: table.id, key: `mirror-${index}`, group: table.name, mission: "Miroir", question: `Question finale ${index + 1}`, text: text.trim(), selected: table.projected.includes(`mirror-${index}`) });
    });
  });
  return answers;
}

export function completedTables(snapshot: { tables: GeneropolyTable[] }) {
  return snapshot.tables.filter((table) => table.completed);
}

