import source from "@/data/mapp-official/profil-mapp-44-questionnaire.json";

export const HYBRID_44_VERSION = "profil-mapp-hybrid-44-v1.0.0";
export type HybridDimension = "D" | "I" | "S" | "C";
export type HybridScores = Record<HybridDimension, number>;

export const dimensions: HybridDimension[] = ["D", "I", "S", "C"];

export function percentages(scores: HybridScores) {
  const total = dimensions.reduce((sum, code) => sum + scores[code], 0);
  if (!(total > 0)) return null;
  const target = 1000;
  const rows = dimensions.map((code, index) => {
    const exact = scores[code] / total * target;
    const floor = Math.floor(exact + Number.EPSILON);
    return { code, index, floor, remainder: exact - floor };
  });
  let remaining = target - rows.reduce((sum, row) => sum + row.floor, 0);
  rows.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remaining > 0; index += 1, remaining -= 1) rows[index % rows.length].floor += 1;
  return Object.fromEntries(rows.map((row) => [row.code, row.floor / 10])) as HybridScores;
}

export function ranking(scores: HybridScores) {
  const sorted = [...dimensions].sort((a, b) => scores[b] - scores[a] || dimensions.indexOf(a) - dimensions.indexOf(b));
  const primaryCandidates = sorted.filter((code) => scores[code] === scores[sorted[0]]);
  const secondaryCandidates = primaryCandidates.length > 1
    ? primaryCandidates
    : sorted.slice(1).filter((code) => scores[code] === scores[sorted[1]]);
  return { sorted, primaryCandidates, secondaryCandidates, tieBreakRequired: primaryCandidates.length > 1 || secondaryCandidates.length > 1 };
}

export function applyHybridTieBreak(preScores: HybridScores, selections: readonly HybridDimension[]) {
  const postScores = { ...preScores };
  for (const code of selections) postScores[code] += 1;
  return { preScores: { ...preScores }, postScores, percentages: percentages(postScores) };
}

export function scoreHybrid44(duelAnswers: Record<string, string>, scaleAnswers: Record<string, number>) {
  const natural: HybridScores = { D: 0, I: 0, S: 0, C: 0 };
  const pressure: HybridScores = { D: 0, I: 0, S: 0, C: 0 };
  for (const question of source.natural.duels) {
    const selected = question.options.find((option) => option.id === duelAnswers[question.id]);
    if (!selected) throw new Error(`Réponse manquante : ${question.id}`);
    natural[selected.dimension as HybridDimension] += 1;
  }
  for (const question of source.natural.affirmations) {
    const value = scaleAnswers[question.id];
    if (!Number.isInteger(value) || value < 1 || value > 4) throw new Error(`Réponse invalide : ${question.id}`);
    natural[question.dimension as HybridDimension] += value - 1;
  }
  for (const question of source.under_pressure.duels) {
    const selected = question.options.find((option) => option.id === duelAnswers[question.id]);
    if (!selected) throw new Error(`Réponse manquante : ${question.id}`);
    pressure[selected.dimension as HybridDimension] += 1;
  }
  const makeRanking = (context: "natural" | "under_pressure", scores: HybridScores) => {
    const ranked = ranking(scores);
    return {
      context,
      contextScoringVersion: context === "natural" ? "natural-hybrid-32-v1.0.0" : "pressure-duels-12-v1.0.0",
      basis: scores,
      initialOrder: ranked.sorted,
      primaryCandidates: ranked.primaryCandidates,
      secondaryCandidates: ranked.secondaryCandidates,
      tieBreakRequired: ranked.tieBreakRequired,
    };
  };
  return {
    metrics: [
      ...dimensions.map((dimensionCode) => ({ context: "natural", dimensionCode, rawScore: natural[dimensionCode], displayPercentage: percentages(natural)?.[dimensionCode] })),
      ...dimensions.map((dimensionCode) => ({ context: "under_pressure", dimensionCode, rawScore: pressure[dimensionCode], displayPercentage: percentages(pressure)?.[dimensionCode] })),
    ],
    rankings: [makeRanking("natural", natural), makeRanking("under_pressure", pressure)],
  };
}

