import type { MappProfileCode } from "./consolidated-v4-schema";

export function combinationId(primary: MappProfileCode, secondary: MappProfileCode) {
  return `${primary}__${secondary}` as const;
}

export function interactionId(sourceProfile: MappProfileCode, targetProfile: MappProfileCode) {
  return `${sourceProfile}__${targetProfile}` as const;
}

export function pressureChangeId(profile: MappProfileCode, kind: "change" | "adjustment", number: number | string) {
  return `pressure-${profile}-${kind}-${String(number).padStart(2, "0")}`;
}

export function combinationPressureId(primary: MappProfileCode, secondary: MappProfileCode) {
  return `pressure-${primary}-to-${secondary}`;
}
