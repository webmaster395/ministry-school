import type { ResultProfileCode } from "./premium-result-model";

export const resultProfileOrder: ResultProfileCode[] = ["conquerant", "communiquant", "facilitateur", "analyste"];

export type RelativePercentages = Record<ResultProfileCode, number | null>;

/**
 * Converts the four independent natural indices into display-only shares.
 * Values are rounded to one decimal with the largest remainder method, so the
 * four displayed shares add up to exactly 100.0 without changing ranking.
 */
export function toRelativePercentages(scores: readonly { code: string; value: number }[]): RelativePercentages {
  const raw = Object.fromEntries(resultProfileOrder.map((code) => [code, 0])) as Record<ResultProfileCode, number>;
  for (const score of scores) {
    if (resultProfileOrder.includes(score.code as ResultProfileCode) && Number.isFinite(score.value) && score.value > 0) {
      raw[score.code as ResultProfileCode] = score.value;
    }
  }
  const sum = resultProfileOrder.reduce((total, code) => total + raw[code], 0);
  if (sum === 0) return Object.fromEntries(resultProfileOrder.map((code) => [code, null])) as RelativePercentages;

  const exactUnits = resultProfileOrder.map((code, index) => ({ code, index, units: raw[code] / sum * 1000 }));
  const roundedUnits = Object.fromEntries(exactUnits.map(({ code, units }) => [code, Math.floor(units)])) as Record<ResultProfileCode, number>;
  const remaining = 1000 - resultProfileOrder.reduce((total, code) => total + roundedUnits[code], 0);
  const priority = [...exactUnits].sort((left, right) => (right.units - Math.floor(right.units)) - (left.units - Math.floor(left.units)) || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) roundedUnits[priority[index].code] += 1;
  return Object.fromEntries(resultProfileOrder.map((code) => [code, roundedUnits[code] / 10])) as RelativePercentages;
}

/**
 * Makes the display-only percentages reflect an officially resolved ranking.
 * A minimal tenth of a point is transferred between adjacent tied profiles,
 * preserving both the stored scores and an exact displayed total of 100.0%.
 */
export function resolveDisplayPercentageTies(
  percentages: RelativePercentages,
  resolvedOrder: readonly ResultProfileCode[],
): RelativePercentages {
  const uniqueOrder = resolvedOrder.filter((code, index, all) => all.indexOf(code) === index);
  const remainingOrder = resultProfileOrder
    .filter((code) => !uniqueOrder.includes(code))
    .sort((left, right) => Number(percentages[right] ?? 0) - Number(percentages[left] ?? 0));
  const order = [...uniqueOrder, ...remainingOrder];
  if (order.length < 2) return percentages;

  const units = Object.fromEntries(resultProfileOrder.map((code) => [
    code,
    percentages[code] == null ? null : Math.round(Number(percentages[code]) * 10),
  ])) as Record<ResultProfileCode, number | null>;

  for (let pass = 0; pass < resultProfileOrder.length; pass += 1) {
    let changed = false;
    for (let index = 0; index < order.length - 1; index += 1) {
      const higherCode = order[index];
      const lowerCode = order[index + 1];
      const higher = units[higherCode];
      const lower = units[lowerCode];
      if (higher == null || lower == null || higher > lower) continue;

      const transfer = Math.ceil((lower - higher + 1) / 2);
      if (lower < transfer) continue;
      units[higherCode] = higher + transfer;
      units[lowerCode] = lower - transfer;
      changed = true;
    }
    if (!changed) break;
  }

  return Object.fromEntries(resultProfileOrder.map((code) => [
    code,
    units[code] == null ? null : Number(units[code]) / 10,
  ])) as RelativePercentages;
}

export function formatRelativePercentage(value: number | null | undefined) {
  return value == null ? "-" : value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
