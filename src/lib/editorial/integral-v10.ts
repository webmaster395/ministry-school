import source from "@/data/editorial/profil-mapp-bibliotheque-integrale-v10.json";
import { integralV10Schema } from "./integral-v10-schema";
import { combinationId, combinationPressureId, pressureChangeId } from "./editorial-identifiers";
import type { MappProfileCode } from "./consolidated-v4-schema";

export const INTEGRAL_V10_SOURCE_SHA256 = "9e8cb5caaa1e52086509368518e945da7566d534d0d1d24f4b6713856612f236";
export const integralV10 = integralV10Schema.parse(source);

export type NormalizedIntegralV10 = Record<string, any>;

export function normalizeIntegralV10(pkg = integralV10): NormalizedIntegralV10 {
  const original = pkg.editorialLibrary as Record<string, any>;
  const profiles = Object.fromEntries(Object.entries(original.profiles).map(([profileCode, profileValue]) => {
    const profile = profileValue as Record<string, any>;
    const code = profileCode as MappProfileCode;
    const underPressure = profile.pages["02_fonctionnement"].underPressure;
    return [code, {
      ...profile,
      pages: {
        ...profile.pages,
        "02_fonctionnement": {
          ...profile.pages["02_fonctionnement"],
          underPressure: {
            ...underPressure,
            possibleChanges: underPressure.possibleChanges.map((item: Record<string, unknown>) => ({ ...item, id: pressureChangeId(code, "change", item.number as string) })),
            practicalAdjustments: underPressure.practicalAdjustments.map((item: Record<string, unknown>) => ({ ...item, id: pressureChangeId(code, "adjustment", item.number as string) })),
          },
        },
      },
    }];
  }));
  const combinations = Object.fromEntries(Object.values(original.orientedCombinations).map((value) => {
    const combination = value as Record<string, any>;
    const primary = combination.primary as MappProfileCode;
    const secondary = combination.secondary as MappProfileCode;
    return [combinationId(primary, secondary), {
      ...combination,
      pages: {
        ...combination.pages,
        "02_fonctionnement": {
          ...combination.pages["02_fonctionnement"],
          underPressure: { ...combination.pages["02_fonctionnement"].underPressure, id: combinationPressureId(primary, secondary) },
        },
      },
    }];
  }));
  return {
    ...original,
    profiles,
    orientedCombinations: combinations,
    structuralReport: { citationConflicts: [] },
    questionnaireSource: pkg.questionnaireSource,
    packageMetadata: {
      packageSchema: pkg.packageSchema,
      publicationAllowed: pkg.publicationAllowed,
      reviewStatus: pkg.reviewStatus,
      featureActivation: pkg.featureActivation,
      integrationContract: pkg.integrationContract,
    },
  };
}

export function flattenEditorialLeaves(value: unknown, path = ""): Map<string, unknown> {
  const leaves = new Map<string, unknown>();
  const visit = (current: unknown, currentPath: string) => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${currentPath}[${index}]`));
    } else if (current && typeof current === "object") {
      for (const [key, item] of Object.entries(current)) visit(item, currentPath ? `${currentPath}.${key}` : key);
    } else {
      leaves.set(currentPath, current);
    }
  };
  visit(value, path);
  return leaves;
}

export function compareEditorialRevisions(previous: unknown, next: unknown) {
  const before = flattenEditorialLeaves(previous);
  const after = flattenEditorialLeaves(next);
  return {
    removedPaths: [...before.keys()].filter((path) => !after.has(path)),
    addedPaths: [...after.keys()].filter((path) => !before.has(path)),
    changedPaths: [...before.keys()].filter((path) => after.has(path) && before.get(path) !== after.get(path)),
  };
}
