/**
 * Les cinq ministères de la charte. La couleur ne sert que d'étiquette :
 * elle est toujours doublée par le picto ou le nom, jamais seule.
 */
export type MinistryInfo = {
  slug: string;
  name: string;
  /** Adjectif de la charte : « Sensibilité pastorale », « Sensibilité prophétique »… */
  adjective: string;
  /** Variable CSS de la couleur (voir globals.css) */
  color: string;
  /** Libellé coloré lisible sur papier — jamais la couleur brute pour du texte */
  textColor: string;
};

export const MINISTRIES: Record<string, MinistryInfo> = {
  pasteur: {
    slug: "pasteur",
    name: "Pasteur",
    adjective: "pastorale",
    color: "var(--m-pastoral)",
    textColor: "#a0700a",
  },
  prophete: {
    slug: "prophete",
    name: "Prophète",
    adjective: "prophétique",
    color: "var(--m-prophetique)",
    textColor: "var(--foreground)",
  },
  docteur: {
    slug: "docteur",
    name: "Docteur",
    adjective: "doctorale",
    color: "var(--m-doctoral)",
    textColor: "var(--link)",
  },
  evangeliste: {
    slug: "evangeliste",
    name: "Évangéliste",
    adjective: "évangélique",
    color: "var(--m-evangelique)",
    textColor: "var(--foreground)",
  },
  apotre: {
    slug: "apotre",
    name: "Apôtre",
    adjective: "apostolique",
    color: "var(--m-apostolique)",
    textColor: "var(--foreground)",
  },
};

export function getMinistry(slug: string | null | undefined): MinistryInfo | null {
  return slug ? (MINISTRIES[slug] ?? null) : null;
}

/** Encre : couleur de repli pour le tronc commun, qui n'appartient à aucun ministère. */
export const INK = "var(--foreground)";

/**
 * Couleur d'une formation. Palette volontairement distincte de celle des ministères
 * (voir --f-* dans globals.css) pour ne jamais confondre une formation et un ministère.
 */
export function sessionColor(
  track: string | null | undefined,
  sessionType: "commun" | "ministere",
  ministryColor: string
) {
  const t = (track ?? "").toLowerCase();
  if (t.includes("cœur") || t.includes("coeur")) return "var(--f-coeur)";
  if (t.includes("caractère") || t.includes("caractere")) return "var(--f-caractere)";
  if (t.includes("sensibilité") || t.includes("sensibilite")) return "var(--f-sensibilite)";
  if (t.includes("parcours") || t.includes("projet")) return "var(--f-projet)";
  return sessionType === "commun" ? INK : ministryColor;
}
