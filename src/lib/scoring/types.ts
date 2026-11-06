export type AnswerValue = 1 | 2 | 3 | 4 | 5;

export type ScoringRule = {
  questionId: string;
  dimensionId: string;
  direction: 1 | -1;
  weight: number;
  context: "natural" | "under_pressure" | "other";
  pointsMap?: Partial<Record<AnswerValue, number>>;
};

export type DimensionResult = {
  dimensionId: string;
  rawScore: number;
  maxScore: number;
  percentage: number;
};
