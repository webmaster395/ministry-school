import { normalizeIntegralV10 } from "@/lib/editorial/integral-v10";
import { buildPremiumClassification, resultProfilePresentation, type ResultProfileCode } from "./premium-result-model";
import type { RankedDimension } from "./provisional-classification";

export const TIE_BREAK_VERSION = "mapp-v10-tie-break-v1";
export const tieBreakQuestions = normalizeIntegralV10().tieBreaker.questions;

export type TieBreakScope = "primary" | "secondary";
export type TieBreakAnswer = { questionId: string; selectedCode: ResultProfileCode };
export type TieBreakRecord = {
  version: string;
  scope: TieBreakScope;
  candidate_codes: ResultProfileCode[];
  answers: TieBreakAnswer[];
  selected_code: ResultProfileCode | null;
  persistent_codes: ResultProfileCode[];
};

export function getTieBreakRequirement(scores: readonly RankedDimension[]) {
  const classification = buildPremiumClassification(scores);
  if (classification.hasPrimaryTie) return { scope: "primary" as const, candidates: classification.primaryCandidates as ResultProfileCode[] };
  if (classification.hasSecondaryTie) return { scope: "secondary" as const, candidates: classification.secondaryCandidates as ResultProfileCode[] };
  return null;
}

export function countTieBreakVotes(candidates: readonly ResultProfileCode[], answers: readonly TieBreakAnswer[]) {
  const votes = Object.fromEntries(candidates.map((code) => [code, 0])) as Record<ResultProfileCode, number>;
  for (const answer of answers) {
    if (!(answer.selectedCode in votes)) throw new Error("Réponse de départage incompatible avec les profils ex æquo.");
    votes[answer.selectedCode] += 1;
  }
  const maximum = Math.max(...candidates.map((code) => votes[code]));
  const winners = candidates.filter((code) => votes[code] === maximum);
  return { votes, selectedCode: winners.length === 1 ? winners[0] : null, persistentCodes: winners };
}

export function applyTieBreak(scores: readonly RankedDimension[], tieBreak?: TieBreakRecord | null) {
  const natural = buildPremiumClassification(scores);
  if (!tieBreak) return natural;
  if (tieBreak.scope === "primary") {
    const primary = tieBreak.selected_code;
    const secondaryGroup = primary
      ? natural.groups.flatMap((group) => group.codes).filter((code) => code !== primary).filter((code, _, all) => {
        const value = scores.find((score) => score.code === code)?.value;
        const highestRemaining = Math.max(...all.map((candidate) => scores.find((score) => score.code === candidate)?.value ?? -Infinity));
        return value === highestRemaining;
      })
      : [];
    const secondary = secondaryGroup.length === 1 ? secondaryGroup[0] as ResultProfileCode : null;
    return { ...natural, primary, secondary, combinationCode: primary && secondary ? `${primary}-to-${secondary}` : null, presentation: primary ? resultProfilePresentation[primary] : null, tieBreak };
  }
  const secondary = tieBreak.selected_code;
  return { ...natural, secondary, combinationCode: natural.primary && secondary ? `${natural.primary}-to-${secondary}` : null, tieBreak };
}

export function stableOptionOrder(candidates: readonly ResultProfileCode[], seed: string) {
  const hash = (value: string) => [...value].reduce((total, char) => ((total * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  return [...candidates].sort((left, right) => hash(`${seed}:${left}`) - hash(`${seed}:${right}`));
}
