export type MappAnswerValue = string | number | boolean | string[] | Record<string, unknown>;

export type MappQuestionOption = {
  value: string | number;
  label: string;
};

export type MappQuestion = {
  id: string;
  code: string;
  position: number;
  prompt: string;
  options: MappQuestionOption[];
};

export type MappStoredAnswer = {
  questionId: string;
  value: MappAnswerValue;
  clientSequence: number;
};

export type MappQuestionnaireContext = {
  attemptId: string;
  status: "in_progress" | "completed";
  serverRevision: number;
  questionnaireVersionId: string;
  scoringVersionId: string;
  expectedAnswerCount: number;
  questions: MappQuestion[];
  answers: MappStoredAnswer[];
};

export type MappAnswerMutation = {
  attemptId: string;
  mutationId: string;
  expectedRevision: number;
  clientSequence: number;
  answers: Array<{ questionId: string; value: MappAnswerValue }>;
};

export type MappSaveAcknowledgement = {
  appliedMutationId: string;
  serverRevision: number;
  savedAt: string;
  answerCount: number;
  completed: boolean;
};

export type MappResultBundle = {
  attemptId: string;
  participantName: string;
  completedAt: string;
  resultRevisionId: string;
  revision: number;
  scoringVersionId: string;
  scores: Array<Record<string, unknown>>;
  metrics: Array<Record<string, unknown>>;
  rankings: Array<Record<string, unknown>>;
  tieBreak: Record<string, unknown> | null;
};
