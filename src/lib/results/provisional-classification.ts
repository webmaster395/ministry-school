export type RankedDimension = { code: string; value: number };

export function rankNaturalDimensions(dimensions: readonly RankedDimension[]) {
  const groups = new Map<number, string[]>();
  for (const dimension of dimensions) groups.set(dimension.value, [...(groups.get(dimension.value) ?? []), dimension.code]);
  const rankedGroups = [...groups.entries()].sort(([a], [b]) => b - a).map(([value, codes]) => ({ value, codes: codes.sort() }));
  return {
    groups: rankedGroups,
    primaryCandidates: rankedGroups[0]?.codes ?? [],
    secondaryCandidates: rankedGroups[0]?.codes.length === 1 ? rankedGroups[1]?.codes ?? [] : [],
    hasPrimaryTie: (rankedGroups[0]?.codes.length ?? 0) > 1,
    hasSecondaryTie: rankedGroups[0]?.codes.length === 1 && (rankedGroups[1]?.codes.length ?? 0) > 1,
  };
}

