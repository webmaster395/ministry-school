import type { GeneropolyTable, GeneropolyValues } from "@/lib/apps/generopoly";

export const financeCategories = [
  ["savings", "Épargne"],
  ["leisure", "Loisirs"],
  ["generosity", "Générosité financière"],
  ["projects", "Projets personnels"],
  ["reserve", "Réserve"],
] as const;
export const timeCategories = [
  ["family", "Famille et proches"],
  ["rest", "Repos et loisirs"],
  ["spiritual", "Vie spirituelle"],
  ["service", "Service et solidarité"],
  ["projects", "Projets personnels"],
] as const;

export type Evolution = "increased" | "decreased" | "maintained" | "suspended";

function values(table: GeneropolyTable, field: string): GeneropolyValues {
  const value = table.state[field];
  return value && typeof value === "object" && !Array.isArray(value) ? value as GeneropolyValues : {};
}

export function average(numbers: number[]) {
  return numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : 0;
}

export function averageAllocation(tables: GeneropolyTable[], field: string, categories: readonly (readonly [string, string])[]) {
  return categories.map(([key, label]) => ({
    key,
    label,
    value: average(tables.map((table) => Number(values(table, field)[key] || 0))),
  }));
}

export function classifyEvolution(initial: number, current: number): Evolution {
  if (initial > 0 && current === 0) return "suspended";
  if (current > initial) return "increased";
  if (current < initial) return "decreased";
  return "maintained";
}

export function evolutionSummary(tables: GeneropolyTable[], initialField: string, currentField: string, key: string) {
  const counts: Record<Evolution, number> = { increased: 0, decreased: 0, maintained: 0, suspended: 0 };
  tables.forEach((table) => {
    const initial = Number(values(table, initialField)[key] || 0);
    const current = Number(values(table, currentField)[key] || 0);
    counts[classifyEvolution(initial, current)] += 1;
  });
  return counts;
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
  const answers: { id: string; tableId: string; group: string; mission: string; question: string; text: string; selected: boolean }[] = [];
  tables.forEach((table) => {
    specs.forEach(([field, mission, question]) => {
      const text = String(table.state[field] ?? "").trim();
      if (text) answers.push({ id: `${table.id}-${field}`, tableId: table.id, group: table.name, mission, question, text, selected: table.projected.includes(field) });
    });
    const mirror = Array.isArray(table.state.mirror) ? table.state.mirror as string[] : [];
    mirror.forEach((text, index) => {
      if (text?.trim()) answers.push({ id: `${table.id}-mirror-${index}`, tableId: table.id, group: table.name, mission: "Miroir", question: `Question finale ${index + 1}`, text: text.trim(), selected: table.projected.includes(`mirror-${index}`) });
    });
  });
  return answers;
}

export function completedTables(snapshot: { tables: GeneropolyTable[] }) {
  return snapshot.tables.filter((table) => table.completed);
}

