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
  picto: string;
  /** Libellé coloré lisible sur papier — jamais la couleur brute pour du texte */
  textColor: string;
};

export const MINISTRIES: Record<string, MinistryInfo> = {
  pasteur: {
    slug: "pasteur",
    name: "Pasteur",
    adjective: "pastorale",
    color: "var(--m-pastoral)",
    picto: "/picto-pastoral.png",
    textColor: "#a0700a",
  },
  prophete: {
    slug: "prophete",
    name: "Prophète",
    adjective: "prophétique",
    color: "var(--m-prophetique)",
    picto: "/picto-prophetique.png",
    textColor: "var(--foreground)",
  },
  docteur: {
    slug: "docteur",
    name: "Docteur",
    adjective: "doctorale",
    color: "var(--m-doctoral)",
    picto: "/picto-doctoral.png",
    textColor: "var(--link)",
  },
  evangeliste: {
    slug: "evangeliste",
    name: "Évangéliste",
    adjective: "évangélique",
    color: "var(--m-evangelique)",
    picto: "/picto-evangelique.png",
    textColor: "var(--foreground)",
  },
  apotre: {
    slug: "apotre",
    name: "Apôtre",
    adjective: "apostolique",
    color: "var(--m-apostolique)",
    picto: "/picto-apostolique.png",
    textColor: "var(--foreground)",
  },
};

export function getMinistry(slug: string | null | undefined): MinistryInfo | null {
  return slug ? (MINISTRIES[slug] ?? null) : null;
}

/** Encre : couleur de repli pour le tronc commun, qui n'appartient à aucun ministère. */
export const INK = "var(--foreground)";
