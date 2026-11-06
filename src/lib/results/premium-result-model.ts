import { rankNaturalDimensions, type RankedDimension } from "./provisional-classification";
import { selectPressureReading } from "@/lib/scoring/pressure-v1";
import { withMappAssetPath } from "@/lib/routing/base-path";

export const resultProfileCodes = ["conquerant", "communiquant", "facilitateur", "analyste"] as const;
export type ResultProfileCode = (typeof resultProfileCodes)[number];

export const resultProfilePresentation: Record<ResultProfileCode, {
  character: string;
  characterImage: string;
  landscape: string;
}> = {
  conquerant: { character: "l’apôtre Paul", characterImage: withMappAssetPath("/images/characters/paul.png"), landscape: withMappAssetPath("/images/profile-cards/paul-hero-hd-v2.webp") },
  communiquant: { character: "l’apôtre Pierre", characterImage: withMappAssetPath("/images/characters/pierre.png"), landscape: withMappAssetPath("/images/profile-cards/pierre-hero-hd-v2.webp") },
  facilitateur: { character: "Abraham", characterImage: withMappAssetPath("/images/characters/abraham.png"), landscape: withMappAssetPath("/images/profile-cards/abraham-hero-hd-v2.webp") },
  analyste: { character: "Moïse", characterImage: withMappAssetPath("/images/characters/moise.png"), landscape: withMappAssetPath("/images/profile-cards/moise-hero-hd-v2.webp") },
};

function isProfileCode(code: string): code is ResultProfileCode {
  return resultProfileCodes.includes(code as ResultProfileCode);
}

export function buildPremiumClassification(scores: readonly RankedDimension[]) {
  const ranking = rankNaturalDimensions(scores);
  const primary = ranking.primaryCandidates.length === 1 && isProfileCode(ranking.primaryCandidates[0])
    ? ranking.primaryCandidates[0]
    : null;
  const secondary = primary && ranking.secondaryCandidates.length === 1 && isProfileCode(ranking.secondaryCandidates[0])
    ? ranking.secondaryCandidates[0]
    : null;

  return {
    ...ranking,
    primary,
    secondary,
    combinationCode: primary && secondary ? `${primary}-to-${secondary}` : null,
    presentation: primary ? resultProfilePresentation[primary] : null,
  };
}

export function buildPressureSelection(scores: readonly RankedDimension[]) {
  if (scores.length !== 4) return { state: "unavailable" as const, candidates: [] as ResultProfileCode[] };
  try {
    const selection = selectPressureReading(scores.map(({ code, value }) => ({
      dimensionId: code,
      percentage: value,
      rawScore: 0,
      maxScore: 0,
    })));
    const candidates = selection.tiedDimensionIds.filter(isProfileCode);
    if (candidates.length !== selection.tiedDimensionIds.length) return { state: "unavailable" as const, candidates: [] as ResultProfileCode[] };
    return selection.kind === "unique"
      ? { state: "unique" as const, profile: candidates[0], candidates }
      : { state: "tie" as const, candidates };
  } catch {
    return { state: "unavailable" as const, candidates: [] as ResultProfileCode[] };
  }
}
