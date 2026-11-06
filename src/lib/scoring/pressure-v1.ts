import pressureManifest from "../../data/scoring/profil-mapp-pressure-v1.json";
import { scoreAnswersByContext } from "./engine";
import type { AnswerValue, DimensionResult, ScoringRule } from "./types";

export const pressureQuestionKeys = ["P01", "P02", "P03", "P04", "P05", "P06", "P07", "P08", "P09", "P10"] as const;
export type PressureQuestionKey = (typeof pressureQuestionKeys)[number];

export const pressureV1Rules: readonly ScoringRule[] = pressureManifest.rules.map((rule) => ({
  questionId: rule.questionKey,
  dimensionId: rule.dimension,
  direction: rule.direction as 1 | -1,
  weight: rule.weight,
  context: "under_pressure" as const,
}));

export type PressureEvidence = {
  questionKey: PressureQuestionKey;
  dimension: string;
  rawAnswer: AnswerValue;
  codedAnswer: AnswerValue;
  direction: 1 | -1;
};

export type PressureResultModel = {
  scoringCode: typeof pressureManifest.code;
  scoringVersion: typeof pressureManifest.version;
  exploratory: true;
  classification: null;
  scores: DimensionResult[];
  evidence: PressureEvidence[];
};

export type PressureReadingSelection =
  | { kind: "unique"; dimensionId: string; tiedDimensionIds: [string] }
  | { kind: "tie"; dimensionId: null; tiedDimensionIds: string[] };

/**
 * Selects editorial material only. This is deliberately separate from the
 * pressure scoring result: it does not create a psychological classification,
 * a secondary profile, or use the natural profile as a tie-breaker.
 */
export function selectPressureReading(scores: readonly DimensionResult[]): PressureReadingSelection {
  if (scores.length !== 4) throw new Error("Four pressure dimension scores are required");
  const maximum = Math.max(...scores.map((score) => score.percentage));
  const tiedDimensionIds = scores
    .filter((score) => score.percentage === maximum)
    .map((score) => score.dimensionId);

  return tiedDimensionIds.length === 1
    ? { kind: "unique", dimensionId: tiedDimensionIds[0], tiedDimensionIds: [tiedDimensionIds[0]] }
    : { kind: "tie", dimensionId: null, tiedDimensionIds };
}

export function scorePressureAnswers(answers: ReadonlyMap<string, AnswerValue>): PressureResultModel {
  const missing = pressureQuestionKeys.filter((key) => !answers.has(key));
  if (missing.length) throw new Error(`Missing pressure answers: ${missing.join(", ")}`);

  const scores = scoreAnswersByContext(answers, pressureV1Rules, "under_pressure");
  const evidence = pressureV1Rules.map((rule) => {
    const rawAnswer = answers.get(rule.questionId)!;
    const codedAnswer = (rule.direction === 1 ? rawAnswer : 6 - rawAnswer) as AnswerValue;
    return { questionKey: rule.questionId as PressureQuestionKey, dimension: rule.dimensionId, rawAnswer, codedAnswer, direction: rule.direction };
  });

  return {
    scoringCode: pressureManifest.code,
    scoringVersion: pressureManifest.version,
    exploratory: true,
    classification: null,
    scores,
    evidence,
  };
}
