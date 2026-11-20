export function sumValues(values = {}) {
  return Object.values(values).reduce((total, value) => total + (typeof value === "number" ? value : 0), 0);
}
export function budgetRemaining(values = {}, budget = 750) {
  return budget - sumValues(values);
}

export function finalTimeAvailable(firstCommitment) {
  return Math.max(0, 28 - Number(firstCommitment || 0) - 6);
}

export function hasMinimumTrimmedLength(value, minimum) {
  return String(value ?? "").trim().length >= minimum;
}

export function decisionFromValues(initial, final) {
  if (initial === 0 && final === 0) return "rester à zéro";
  if (initial > 0 && final === 0) return "suspendre";
  if (final > initial) return "augmenter";
  if (final < initial) return "diminuer";
  return "maintenir";
}

/**
 * Finds the most notable category changes for one constrained situation.
 * A category that started at zero is deliberately excluded: a percentage
 * cannot describe its evolution without being misleading. When every usable
 * category changed in exactly the same way, no category is singled out.
 */
export function scenarioHighlights(initial = {}, current = {}, keys = Object.keys(initial)) {
  const comparisons = keys.flatMap((key) => {
    const before = initial[key];
    const after = current[key];
    if (!Number.isFinite(before) || !Number.isFinite(after) || before <= 0) return [];
    return [{ key, variation: (after - before) / before }];
  });

  if (comparisons.length < 2) return { largestDecrease: [], mostPreserved: [] };
  if (new Set(comparisons.map(({ variation }) => variation)).size === 1) return { largestDecrease: [], mostPreserved: [] };

  const smallest = Math.min(...comparisons.map(({ variation }) => variation));
  const largest = Math.max(...comparisons.map(({ variation }) => variation));
  return {
    largestDecrease: smallest < 0 ? comparisons.filter(({ variation }) => variation === smallest).map(({ key }) => key) : [],
    mostPreserved: comparisons.filter(({ variation }) => variation === largest).map(({ key }) => key),
  };
}
