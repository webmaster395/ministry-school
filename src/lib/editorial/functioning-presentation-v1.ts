import source from "./profil-mapp-fonctionnement-v1.json";
import { withMappAssetPath } from "@/lib/routing/base-path";

// Concise, ordered bridges derived from the approved profiles. They change the
// presentation of the motivation field, not the underlying editorial source.
export const functioningMotivationLeads: Record<keyof typeof source.natural.orderedCombinations, string> = {
  DI: "Les défis et les responsabilités peuvent te stimuler, surtout quand ils te donnent l’occasion de mobiliser d’autres personnes autour d’un objectif concret.",
  DS: "Faire avancer un objectif peut te motiver, avec le souci de préserver des relations de confiance dans la durée.",
  DC: "Tu peux apprécier les défis concrets tout en voulant t’appuyer sur des informations solides avant d’aller plus loin.",
  ID: "Les échanges et la participation peuvent te donner de l’élan, puis t’aider à prendre une initiative concrète.",
  IS: "Tu peux trouver de l’énergie dans les échanges et apprécier qu’ils construisent une confiance durable.",
  IC: "Partager des idées peut te stimuler, surtout lorsque tu as aussi la possibilité de les approfondir et de les préciser.",
  SD: "Être utile et soutenir les autres peuvent te motiver, sans exclure le besoin de faire avancer une décision.",
  SI: "Tu peux aimer construire des liens fiables tout en trouvant de l’énergie dans les échanges et la participation.",
  SC: "La continuité et la fiabilité peuvent compter pour toi, avec une attention particulière à la qualité du travail accompli.",
  CD: "Comprendre et vérifier peuvent te donner des bases solides, puis t’aider à décider et à agir avec clarté.",
  CI: "La précision peut te motiver, notamment lorsque tu peux rendre une idée claire et intéressante pour les autres.",
  CS: "Tu peux apprécier un travail cohérent et soigné, mené dans un cadre stable où chacun sait sur quoi compter.",
};

export const functioningSubtitles: Record<keyof typeof source.natural.orderedCombinations, string> = {
  DI: "Tu aimes faire avancer les choses et donner aux autres envie de te suivre. Découvre comment cette énergie influence tes décisions, tes échanges et tes relations.",
  DS: "Tu recherches des avancées concrètes sans perdre de vue les personnes qui t’entourent. Voici comment cet équilibre peut guider ton rythme et tes relations.",
  DC: "Tu apprécies de choisir une direction tout en vérifiant ce qui compte vraiment. Explore la place que prennent l’action et la précision dans ton quotidien.",
  ID: "Les échanges te donnent de l’élan, et tu peux transformer cet élan en initiative. Découvre comment tu partages tes idées et passes à l’action.",
  IS: "Tu trouves de l’énergie dans la rencontre et accordes aussi de la valeur aux liens qui durent. Cette lecture éclaire ta façon de communiquer et de coopérer.",
  IC: "Tu aimes partager des idées, puis leur donner de la profondeur et de la clarté. Explore ce dialogue entre expression et réflexion dans tes échanges.",
  SD: "Tu tiens à préserver des relations fiables, tout en sachant faire avancer ce qui importe. Découvre comment cette attention accompagne tes décisions.",
  SI: "Tu prends soin de la qualité des liens et apprécies les échanges qui rapprochent. Voici comment cette présence peut se traduire dans ton quotidien.",
  SC: "Tu recherches des repères stables et prends le temps de faire les choses avec soin. Explore comment cette constance nourrit tes décisions et tes relations.",
  CD: "Tu aimes comprendre avant de décider, sans perdre de vue le moment d’agir. Découvre comment tu relies précision, choix et passage à l’action.",
  CI: "Tu prends le temps de clarifier tes idées et peux aimer les rendre accessibles aux autres. Voici comment réflexion et échange se rencontrent dans ton fonctionnement.",
  CS: "Tu accordes de l’importance à la cohérence et à la fiabilité des liens. Explore comment ton attention aux détails et à la continuité façonne tes échanges.",
};

// Stable editorial media slots for a future content administration interface.
export const functioningMedia = {
  communication: {
    id: "functioning-communication-photo",
    src: withMappAssetPath("/images/functioning/communication-mlk.webp"),
    alt: "Femme souriante en veste verte, une tablette à la main, lors d’un événement MLK.",
    objectPosition: "center 10%",
  },
  advice: {
    id: "functioning-advice-photo",
    src: withMappAssetPath("/images/functioning/relations-mlk.webp"),
    alt: "Femme blonde souriante tenant une tasse lors d’un échange à l’Église MLK.",
    objectPosition: "center 12%",
  },
} as const;
