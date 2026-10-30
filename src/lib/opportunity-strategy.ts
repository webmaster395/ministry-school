export type StrategicAxis = "former" | "auberge" | "fundraising";

export const STRATEGIC_AXES: Record<StrategicAxis, {
  shortLabel: string;
  label: string;
  description: string;
  prompt: string;
}> = {
  former: {
    shortLabel: "Former",
    label: "Former",
    description: "Faire grandir les personnes et développer leur potentiel spirituel, personnel, relationnel, professionnel, entrepreneurial ou ministériel.",
    prompt: "Qu’est-ce que les participants vont apprendre, développer ou mettre en pratique, et pourquoi cela compte-t-il ?",
  },
  auberge: {
    shortLabel: "L’Auberge",
    label: "Développer une Église solidaire — L’Auberge",
    description: "Accueillir, soutenir, inclure et apporter des réponses concrètes aux besoins de la communauté et au-delà.",
    prompt: "À quels besoins l’initiative répond-elle, qui accompagne-t-elle et comment agit-elle concrètement ?",
  },
  fundraising: {
    shortLabel: "Levée de fonds",
    label: "Mobiliser les ressources — Levée de fonds",
    description: "Réunir les financements, partenariats et autres ressources nécessaires pour soutenir durablement la mission de MLK.",
    prompt: "Quelles ressources seront mobilisées, que permettront-elles de rendre possible et comment cela sert-il la mission de MLK ?",
  },
};

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

function initiativeLabel(o: StrategicOpportunity) {
  return o.is_project && o.is_training ? "Ce projet et cette formation" : o.is_training ? "Cette formation" : "Ce projet";
}

export function strategicAxesComplete(o: StrategicOpportunity) {
  const axes = [...new Set(o.strategic_axes ?? [])].filter((axis): axis is StrategicAxis => axis in STRATEGIC_AXES);
  return axes.length > 0;
}

/** Résumé volontairement factuel : seuls les axes choisis sont affichés. */
export function strategicNarrativeOf(o: StrategicOpportunity): string[] {
  if (!strategicAxesComplete(o)) return [];
  const axes = [...new Set(o.strategic_axes ?? [])] as StrategicAxis[];
  const initiative = initiativeLabel(o);
  const labels = axes.map((axis) => STRATEGIC_AXES[axis].shortLabel);
  const joined = labels.length < 2 ? labels[0] : `${labels.slice(0, -1).join(", ")} et ${labels.at(-1)}`;
  return [`${initiative} « ${o.title} » s’inscrit dans ${axes.length === 1 ? "l’un des axes stratégiques" : "plusieurs axes stratégiques"} 2026-2027 de l’Église MLK : ${joined}.`];
}
