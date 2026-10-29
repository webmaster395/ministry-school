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
  is_project: boolean;
  is_training: boolean;
  objectives?: string | null;
  strategic_axes?: StrategicAxis[] | null;
  strategic_contribution_former?: string | null;
  strategic_contribution_auberge?: string | null;
  strategic_contribution_fundraising?: string | null;
  strategic_axes_connection?: string | null;
};

const sentence = (value: string | null | undefined) => {
  const clean = (value ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return /[.!?…]$/.test(clean) ? clean : `${clean}.`;
};

const lowerFirst = (value: string) => value ? value.charAt(0).toLocaleLowerCase("fr-FR") + value.slice(1) : value;

function initiativeLabel(o: StrategicOpportunity) {
  return o.is_project && o.is_training ? "Cette initiative" : o.is_training ? "Cette formation" : "Ce projet";
}

export function strategicAxesComplete(o: StrategicOpportunity) {
  const axes = [...new Set(o.strategic_axes ?? [])].filter((axis): axis is StrategicAxis => axis in STRATEGIC_AXES);
  if (!axes.length) return false;
  if (axes.includes("former") && !sentence(o.strategic_contribution_former)) return false;
  if (axes.includes("auberge") && !sentence(o.strategic_contribution_auberge)) return false;
  if (axes.includes("fundraising") && !sentence(o.strategic_contribution_fundraising)) return false;
  return axes.length < 2 || !!sentence(o.strategic_axes_connection);
}

/**
 * Sept compositions éditoriales, alimentées uniquement par les contributions saisies.
 * Aucun public, besoin, apprentissage ou montant n'est déduit automatiquement.
 */
export function strategicNarrativeOf(o: StrategicOpportunity): string[] {
  if (!strategicAxesComplete(o)) return [];
  const axes = [...new Set(o.strategic_axes ?? [])] as StrategicAxis[];
  const has = (axis: StrategicAxis) => axes.includes(axis);
  const initiative = initiativeLabel(o);
  const former = sentence(o.strategic_contribution_former);
  const auberge = sentence(o.strategic_contribution_auberge);
  const fundraising = sentence(o.strategic_contribution_fundraising);
  const connection = sentence(o.strategic_axes_connection);
  const firstObjective = sentence((o.objectives ?? "").split("\n").map((item) => item.trim()).find(Boolean));
  const objective = firstObjective
    ? `Un objectif concret donne son cap à cette démarche : ${lowerFirst(firstObjective)}`
    : "";

  if (axes.length === 1 && has("former")) return [
    `${initiative} « ${o.title} » s’inscrit dans la priorité Former de MLK : donner à chacun des moyens concrets de grandir et de développer son potentiel.`,
    `Dans cette initiative, ${lowerFirst(former)}`,
    objective || "Les apprentissages proposés sont ainsi reliés à une mise en pratique réelle, dans la vie personnelle, professionnelle, ecclésiale ou ministérielle des participants.",
  ];
  if (axes.length === 1 && has("auberge")) return [
    `${initiative} « ${o.title} » participe à l’esprit de l’Auberge, la priorité de MLK qui fait de l’Église un lieu d’accueil, de soutien et de solidarité concrète.`,
    `Concrètement, ${lowerFirst(auberge)}`,
    objective || "Cette contribution précise les personnes et les besoins concernés, afin que la solidarité se traduise par une action identifiable.",
  ];
  if (axes.length === 1 && has("fundraising")) return [
    `${initiative} « ${o.title} » contribue à la priorité de MLK consacrée à la mobilisation des ressources nécessaires à sa mission.`,
    `Dans ce cadre, ${lowerFirst(fundraising)}`,
    objective || "La mobilisation des ressources est ainsi reliée à ce qu’elle permettra réellement de rendre possible, au service de la vision de MLK.",
  ];
  if (axes.length === 2 && has("former") && has("auberge")) return [
    `${initiative} « ${o.title} » réunit deux priorités de MLK : développer les personnes et faire vivre une Église accueillante, solidaire et capable d’accompagner concrètement.`,
    `Sur le plan de la formation, ${lowerFirst(former)} Du côté de l’Auberge, ${lowerFirst(auberge)}`,
    connection,
    objective,
  ].filter(Boolean);
  if (axes.length === 2 && has("former") && has("fundraising")) return [
    `${initiative} « ${o.title} » associe le développement des compétences à la mobilisation des ressources utiles à la mission de MLK.`,
    `Les apprentissages visés sont précis : ${lowerFirst(former)} La contribution à la mobilisation des ressources est elle aussi explicitée : ${lowerFirst(fundraising)}`,
    connection,
    objective,
  ].filter(Boolean);
  if (axes.length === 2 && has("auberge") && has("fundraising")) return [
    `${initiative} « ${o.title} » articule la solidarité portée par l’Auberge avec les moyens nécessaires pour la rendre concrète et durable.`,
    `La réponse solidaire prend la forme suivante : ${lowerFirst(auberge)} Pour la soutenir, ${lowerFirst(fundraising)}`,
    connection,
    objective,
  ].filter(Boolean);
  return [
    `${initiative} « ${o.title} » réunit les trois priorités de MLK pour 2026-2027 : former, développer une Église solidaire et mobiliser les ressources nécessaires à sa mission.`,
    `Elle contribue d’abord au développement des personnes : ${lowerFirst(former)} Elle fait également vivre l’Auberge de manière concrète : ${lowerFirst(auberge)} Enfin, elle participe à la mobilisation des ressources : ${lowerFirst(fundraising)}`,
    connection,
    objective,
  ].filter(Boolean);
}
