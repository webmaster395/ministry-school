import type { AnswerValue, DimensionResult, ScoringRule } from "./types";

export function pointsForAnswer(value: AnswerValue, rule: Pick<ScoringRule, "direction" | "weight" | "pointsMap">) {
  const base = rule.pointsMap?.[value] ?? (rule.direction === 1 ? value - 1 : 5 - value);
  return base * rule.weight;
}

export function scoreNaturalAnswers(answers: ReadonlyMap<string, AnswerValue>, rules: readonly ScoringRule[]): DimensionResult[] {
  return scoreAnswersByContext(answers, rules, "natural");
}

export function scoreAnswersByContext(
  answers: ReadonlyMap<string, AnswerValue>,
  rules: readonly ScoringRule[],
  context: ScoringRule["context"],
): DimensionResult[] {
  const totals = new Map<string, { rawScore: number; maxScore: number }>();
  for (const rule of rules) {
    if (rule.context !== context) continue;
    const answer = answers.get(rule.questionId);
    if (answer === undefined) continue;
    const current = totals.get(rule.dimensionId) ?? { rawScore: 0, maxScore: 0 };
    current.rawScore += pointsForAnswer(answer, rule);
    current.maxScore += 4 * Math.abs(rule.weight);
    totals.set(rule.dimensionId, current);
  }
  return [...totals.entries()].map(([dimensionId, value]) => ({
    dimensionId,
    rawScore: value.rawScore,
    maxScore: value.maxScore,
    percentage: value.maxScore === 0 ? 0 : (value.rawScore / value.maxScore) * 100,
  }));
}
