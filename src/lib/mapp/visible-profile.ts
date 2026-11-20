export const visibleMappProfileNames = {
  D: "Conquérant",
  I: "Communicant",
  S: "Facilitateur",
  C: "Analyste",
  conquerant: "Conquérant",
  communiquant: "Communicant",
  communicant: "Communicant",
  facilitateur: "Facilitateur",
  analyste: "Analyste",
} as const;

export function visibleMappProfileName(code: string | null | undefined, fallback = "Profil à préciser") {
  if (!code) return fallback;
  return visibleMappProfileNames[code as keyof typeof visibleMappProfileNames] ?? fallback;
}

export function normalizeVisibleMappText(value: string) {
  return value
    .replace(/\bDISC(?:\s+V2)?\b/gi, "Profil MAPP")
    .replace(/\bCommuniquant\b/gi, "Communicant");
}
