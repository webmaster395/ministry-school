export type StrategicAxis = "former" | "auberge" | "fundraising";
export type OfficialStrategicAxis = "former" | "auberge" | "une_place_de_plus";

export const STRATEGIC_AXIS_ORDER: StrategicAxis[] = ["former", "auberge", "fundraising"];

/**
 * Correspondance explicite entre les identifiants historiques stockés en base et
 * les noms officiels 2026–2027. Aucune migration des fiches existantes n'est nécessaire.
 */
export const TECHNICAL_TO_OFFICIAL_AXIS: Record<StrategicAxis, OfficialStrategicAxis> = {
  former: "former",
  auberge: "auberge",
  fundraising: "une_place_de_plus",
};

export const STRATEGIC_AXES: Record<StrategicAxis, {
  shortLabel: string;
  label: string;
  description: string;
  prompt: string;
}> = {
  former: {
    shortLabel: "Former",
    label: "Former",
    description: "Permettre à chacun d’apprendre, de développer ses talents et d’acquérir de nouvelles compétences.",
    prompt: "Qu’est-ce que les participants vont apprendre, développer ou mettre en pratique, et pourquoi cela compte-t-il ?",
  },
  auberge: {
    shortLabel: "L'auberge",
    label: "L'auberge",
    description: "Bâtir une communauté toujours plus accueillante et solidaire, où chacun peut trouver sa place.",
    prompt: "À quels besoins l’initiative répond-elle, qui accompagne-t-elle et comment agit-elle concrètement ?",
  },
  fundraising: {
    shortLabel: "Une place de plus",
    label: "Une place de plus",
    description: "Mobiliser les ressources nécessaires pour accueillir davantage de personnes à MLK.",
    prompt: "Quelles ressources seront mobilisées, que permettront-elles de rendre possible et comment cela sert-il la mission de MLK ?",
  },
};

export const MLK_STRATEGIC_VISION = {
  schemaVersion: "mlk-strategic-axes-v1.0.0",
  period: "2026-2027",
  section: {
    eyebrow: "VISION MLK · 2026–2027",
    title: "Ensemble, faisons vivre notre vision",
  },
  axes: {
    former: { label: "Former" },
    auberge: { label: "L'auberge" },
    une_place_de_plus: { label: "Une place de plus" },
  },
  texts: {
    former: {
      selectedAxes: ["former"],
      paragraphs: [
        "Cette initiative contribue à « Former », l'un des trois axes stratégiques du groupe MLK pour 2026–2027.",
        "Nous voulons donner à chacun la possibilité d'apprendre, de développer ses talents et d'acquérir de nouvelles compétences. Parce que chaque personne qui grandit peut, à son tour, faire grandir les autres.",
      ],
    },
    auberge: {
      selectedAxes: ["auberge"],
      paragraphs: [
        "Cette initiative contribue à « L'auberge », l'un des trois axes stratégiques du groupe MLK pour 2026–2027.",
        "Fidèles à notre vision « Aimé(e), Aimer mieux, Aimer plus », nous voulons bâtir une auberge toujours plus accueillante et solidaire, où chacun peut trouver sa place, être aimé, accompagné et soutenu, quels que soient ses moyens, ses origines ou sa culture.",
        "Avec L'auberge, notre ambition est de faire de l'amour et de la solidarité une réalité concrète, en développant l'entraide, le partage et des initiatives qui répondent aux besoins de chacun.",
      ],
    },
    une_place_de_plus: {
      selectedAxes: ["une_place_de_plus"],
      paragraphs: [
        "Cette initiative contribue à « Une place de plus », l'un des trois axes stratégiques du groupe MLK pour 2026–2027.",
        "Nous rêvons d'une Église capable d'accueillir toutes les personnes qui en ont besoin, sans que personne ne reste dehors faute de place.",
        "Avec « Une place de plus », notre ambition est de mobiliser les ressources nécessaires pour agrandir notre capacité d'accueil et permettre à toujours plus de personnes de trouver leur place à MLK.",
        "Parce que derrière chaque place supplémentaire, il y a une personne, une histoire et une vie que nous pouvons accueillir.",
      ],
    },
    former_auberge: {
      selectedAxes: ["former", "auberge"],
      paragraphs: [
        "Cette initiative s'inscrit dans deux des trois axes stratégiques du groupe MLK pour 2026–2027 : « Former » et « L'auberge ».",
        "Nous croyons que chacun a quelque chose à apprendre, mais aussi quelque chose à apporter. En donnant à chacun la possibilité de développer ses talents et ses compétences, nous voulons construire une auberge où ces richesses peuvent être partagées et mises au service des autres.",
        "Fidèles à notre vision « Aimé(e), Aimer mieux, Aimer plus », nous voulons faire grandir une communauté toujours plus accueillante et solidaire, où chacun peut trouver sa place, quels que soient ses moyens, ses origines ou sa culture.",
      ],
    },
    former_une_place_de_plus: {
      selectedAxes: ["former", "une_place_de_plus"],
      paragraphs: [
        "Cette initiative s'inscrit dans deux des trois axes stratégiques du groupe MLK pour 2026–2027 : « Former » et « Une place de plus ».",
        "Notre rêve est de pouvoir accueillir toutes les personnes qui en ont besoin, sans que personne ne reste dehors faute de place. Mais pour accueillir davantage, il ne suffit pas d'agrandir nos espaces : nous devons aussi préparer les personnes qui feront vivre cette vision.",
        "C'est pourquoi nous voulons à la fois développer les compétences et les talents de chacun, et mobiliser les ressources nécessaires pour nous donner les moyens de nos ambitions.",
      ],
    },
    auberge_une_place_de_plus: {
      selectedAxes: ["auberge", "une_place_de_plus"],
      paragraphs: [
        "Cette initiative s'inscrit dans deux des trois axes stratégiques du groupe MLK pour 2026–2027 : « L'auberge » et « Une place de plus ».",
        "Nous voulons bâtir une auberge où chacun se sent accueilli, aimé et soutenu, quels que soient ses moyens, ses origines ou sa culture. Une Église solidaire, où personne n'est laissé de côté.",
        "Mais cette ambition nous pousse aussi à regarder plus loin : comment prendre soin de toutes les personnes qui frappent à notre porte si nous n'avons plus de place pour les accueillir ?",
        "Avec « Une place de plus », nous voulons mobiliser les ressources nécessaires pour que notre capacité d'accueil soit à la hauteur de notre désir d'aimer.",
      ],
    },
    former_auberge_une_place_de_plus: {
      selectedAxes: ["former", "auberge", "une_place_de_plus"],
      paragraphs: [
        "Cette initiative s'inscrit dans les trois axes stratégiques du groupe MLK pour 2026–2027 : « Former », « L'auberge » et « Une place de plus ».",
        "Notre vision « Aimé(e), Aimer mieux, Aimer plus » nous pousse à aller toujours plus loin dans notre manière d'accueillir, d'accompagner et de servir les autres.",
        "Pour y parvenir, nous voulons former des personnes capables de mettre leurs talents au service des autres, bâtir une auberge toujours plus accueillante et solidaire, et mobiliser les ressources nécessaires pour ouvrir nos portes à davantage de personnes.",
        "Parce que notre ambition n'est pas seulement d'accueillir plus de monde, mais de pouvoir mieux aimer chaque personne que nous accueillons.",
      ],
    },
  },
} as const;

export type StrategicOpportunity = {
  title: string;
  description?: string | null;
  is_project: boolean;
  is_training: boolean;
  objectives?: string | null;
  strategic_axes?: StrategicAxis[] | null;
  strategic_contribution_former?: string | null;
  strategic_contribution_auberge?: string | null;
  strategic_contribution_fundraising?: string | null;
  strategic_axes_connection?: string | null;
};

export function strategicAxesOf(o: Pick<StrategicOpportunity, "strategic_axes">): StrategicAxis[] {
  const selected = new Set(o.strategic_axes ?? []);
  return STRATEGIC_AXIS_ORDER.filter((axis) => selected.has(axis));
}

export function strategicAxesComplete(o: StrategicOpportunity) {
  return strategicAxesOf(o).length > 0;
}

/** Retourne exactement un texte officiel, sous forme de paragraphes, pour la combinaison choisie. */
export function strategicNarrativeOf(o: StrategicOpportunity): readonly string[] {
  const key = strategicAxesOf(o)
    .map((axis) => TECHNICAL_TO_OFFICIAL_AXIS[axis])
    .join("_") as keyof typeof MLK_STRATEGIC_VISION.texts;
  return key ? MLK_STRATEGIC_VISION.texts[key]?.paragraphs ?? [] : [];
}
