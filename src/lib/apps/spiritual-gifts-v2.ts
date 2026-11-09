export const giftScaleLabels = ["Jamais", "Très rarement", "Rarement", "Parfois", "Souvent", "Très souvent"] as const;

export type SpiritualGift = {
  id: string;
  name: string;
  definition: string;
  challenge: string;
  palette: { background: string; foreground: string };
  questions: Array<{ id: string; dimension: string; text: string }>;
};

export const spiritualGiftsV2: SpiritualGift[] = [
  {
    id: "discernement_esprits",
    name: "Discernement des esprits",
    definition: "Capacité donnée par le Saint-Esprit à discerner l’origine spirituelle d’un message, d’une manifestation ou d’une situation.",
    challenge: "Face à un message ou une impression spirituelle, prends le temps de prier, de le confronter aux Écritures et d’en discuter avec un chrétien mature avant de conclure.",
    palette: { background: "#50091D", foreground: "#FF95B3" },
    questions: [
      { id: "discernement_esprits_1", dimension: "origine_divine", text: "T’arrive-t-il de reconnaître qu’un message vient de Dieu ?" },
      { id: "discernement_esprits_2", dimension: "influence_demoniaque", text: "T’arrive-t-il de percevoir la présence ou l’influence d’un esprit démoniaque ?" },
      { id: "discernement_esprits_3", dimension: "origine_humaine", text: "T’arrive-t-il de reconnaître qu’une personne parle en son propre nom alors qu’elle affirme parler de la part de Dieu ?" },
      { id: "discernement_esprits_4", dimension: "tromperie_spirituelle", text: "T’arrive-t-il de sentir que quelque chose ne va pas dans un message spirituel, même si tout semble correct en apparence ?" },
      { id: "discernement_esprits_5", dimension: "confirmation", text: "T’est-il déjà arrivé de discerner quelque chose spirituellement et d’avoir ensuite la confirmation que tu avais raison ?" },
    ],
  },
  {
    id: "parole_connaissance",
    name: "Parole de connaissance",
    definition: "Capacité à recevoir surnaturellement une connaissance précise sur une personne ou une situation passée ou présente, sans l’avoir apprise naturellement.",
    challenge: "Si tu penses recevoir une information pour quelqu’un, note-la précisément, examine-la avec humilité et demande un avis mature avant de la partager sans pression. Ne présente pas une impression comme un fait établi.",
    palette: { background: "#09272A", foreground: "#9EF4F1" },
    questions: [
      { id: "parole_connaissance_1", dimension: "connaissance_personne", text: "T’arrive-t-il de connaître des choses sur une personne sans qu’elle te les ait confiées et sans pouvoir expliquer comment tu les sais ?" },
      { id: "parole_connaissance_2", dimension: "revelation", text: "As-tu déjà reçu, par un rêve, une vision ou pendant la prière, une information précise qui s’est ensuite révélée exacte ?" },
      { id: "parole_connaissance_3", dimension: "connaissance_situation", text: "T’arrive-t-il de recevoir une information précise sur une situation que tu ne connais pas, puis de découvrir qu’elle correspond à la réalité ?" },
      { id: "parole_connaissance_4", dimension: "transmission", text: "T’arrive-t-il de ressentir que le Saint-Esprit te révèle quelque chose à partager avec une personne pour l’encourager, la conseiller ou l’aider ?" },
      { id: "parole_connaissance_5", dimension: "confirmation", text: "Une personne t’a-t-elle déjà confirmé qu’une information que tu lui avais partagée était parfaitement juste, alors qu’elle ne t’en avait jamais parlé ?" },
    ],
  },
  {
    id: "don_foi",
    name: "Don de foi",
    definition: "Capacité particulière donnée par le Saint-Esprit à recevoir une assurance profonde que Dieu va intervenir dans une situation précise, même lorsque toute solution humaine semble impossible.",
    challenge: "Identifie une situation difficile, prie avec une personne de confiance et pose un premier acte concret et réfléchi, sans prendre de risque inconsidéré.",
    palette: { background: "#183FCE", foreground: "#F3E997" },
    questions: [
      { id: "don_foi_1", dimension: "conviction", text: "As-tu déjà eu la certitude profonde que Dieu allait intervenir dans une situation, alors que rien ne laissait penser qu’elle pouvait s’arranger ?" },
      { id: "don_foi_2", dimension: "reflexe", text: "Lorsqu’un nouveau défi se présente et qu’il semble humainement impossible à relever, ta première pensée est-elle que Dieu peut agir malgré les circonstances ?" },
      { id: "don_foi_3", dimension: "encouragement", text: "Face à un problème qui semble insurmontable, as-tu le réflexe d’encourager les autres en leur rappelant que Dieu peut intervenir ?" },
      { id: "don_foi_4", dimension: "action", text: "As-tu déjà agi avec assurance dans une situation sans issue, parce que tu avais la conviction que Dieu t’avait donné une promesse précise ?" },
      { id: "don_foi_5", dimension: "confirmation", text: "As-tu déjà eu la certitude que Dieu allait intervenir dans une situation, puis vu les événements se dérouler comme tu l’avais cru ?" },
    ],
  },
  {
    id: "guerison",
    name: "Don de guérison",
    definition: "Capacité particulière donnée par le Saint-Esprit d’être utilisé par Dieu pour apporter une guérison surnaturelle à une personne malade ou souffrante.",
    challenge: "Propose à une personne malade de prier pour elle, avec son accord. Prends de ses nouvelles et apporte une aide concrète, sans promettre de guérison ni interrompre ses soins.",
    palette: { background: "#28503C", foreground: "#D7FF99" },
    questions: [
      { id: "guerison_1", dimension: "reflexe", text: "Lorsqu’une personne te parle de sa maladie, ton premier réflexe est-il de lui proposer de prier pour sa guérison ?" },
      { id: "guerison_2", dimension: "pratique", text: "Pries-tu régulièrement pour la guérison de personnes malades, même lorsqu’elles ne te le demandent pas spontanément ?" },
      { id: "guerison_3", dimension: "conviction", text: "As-tu déjà prié pour une personne et reçu la conviction qu’elle était guérie, même si tu ne pouvais pas encore le vérifier ?" },
      { id: "guerison_4", dimension: "sollicitation", text: "Des personnes viennent-elles spontanément te demander de prier pour leur guérison ?" },
      { id: "guerison_5", dimension: "amelioration", text: "As-tu déjà prié pour une personne malade et constaté une amélioration de son état après ta prière ?" },
    ],
  },
  {
    id: "miracles",
    name: "Don d’opérer des miracles",
    definition: "Capacité particulière donnée par le Saint-Esprit d’être utilisé par Dieu pour accomplir des actes surnaturels qui manifestent sa puissance.",
    challenge: "Prie avec une personne de confiance pour une situation difficile, puis note les faits observables sans chercher à provoquer ou à exagérer un miracle.",
    palette: { background: "#4D2577", foreground: "#E7B6FF" },
    questions: [
      { id: "miracles_1", dimension: "reflexe", text: "Face à une situation qui semble humainement impossible, as-tu spontanément le réflexe de prier pour que Dieu accomplisse un miracle ?" },
      { id: "miracles_2", dimension: "disponibilite", text: "T’arrive-t-il de prier avec foi pour que Dieu accomplisse un miracle à travers toi ?" },
      { id: "miracles_3", dimension: "reconnaissance", text: "Lorsque tu es témoin d’un miracle, prends-tu le temps de remercier Dieu et de lui rendre gloire ?" },
      { id: "miracles_4", dimension: "sollicitation", text: "Des personnes viennent-elles spontanément te demander de prier pour des situations qui semblent sans issue ?" },
      { id: "miracles_5", dimension: "experience", text: "As-tu déjà prié pour une situation et assisté à un événement que tu considères comme un miracle de Dieu ?" },
    ],
  },
  {
    id: "prophetie",
    name: "Don de prophétie",
    definition: "Capacité particulière donnée par le Saint-Esprit à transmettre un message de Dieu pour édifier, encourager, consoler, avertir ou conduire une personne à changer.",
    challenge: "Si une parole d’encouragement te vient pour quelqu’un, examine-la à la lumière de la Bible et partage-la humblement, sans imposer qu’elle vienne de Dieu.",
    palette: { background: "#D64B27", foreground: "#FFF0CC" },
    questions: [
      { id: "prophetie_1", dimension: "reception", text: "As-tu déjà ressenti que Dieu te donnait un message précis à transmettre à une personne ou à un groupe ?" },
      { id: "prophetie_2", dimension: "edification", text: "As-tu déjà partagé une parole que tu pensais venir de Dieu et qui a aidé une personne à grandir dans sa foi ?" },
      { id: "prophetie_3", dimension: "avertissement", text: "As-tu déjà ressenti que Dieu te demandait d’avertir une personne ou de l’appeler à changer de comportement ?" },
      { id: "prophetie_4", dimension: "impact", text: "Des personnes t’ont-elles déjà dit qu’une parole que tu leur avais transmise les avait profondément encouragées, consolées ou interpellées ?" },
      { id: "prophetie_5", dimension: "exercice", text: "T’arrive-t-il de partager un message que tu crois avoir reçu de Dieu, même lorsque cela te demande du courage ?" },
    ],
  },
  {
    id: "sagesse",
    name: "Parole de sagesse",
    definition: "Capacité particulière donnée par le Saint-Esprit à apporter des conseils et des solutions adaptés à une situation, en s’appuyant sur la sagesse de Dieu.",
    challenge: "Accompagne une personne qui doit prendre une décision : écoute-la, explore les principes bibliques et les conséquences possibles, puis laisse-la décider librement.",
    palette: { background: "#EFCB56", foreground: "#342E50" },
    questions: [
      { id: "sagesse_1", dimension: "conseil", text: "Face à une situation compliquée, as-tu déjà reçu une compréhension particulière qui t’a permis de conseiller quelqu’un avec sagesse ?" },
      { id: "sagesse_2", dimension: "sollicitation", text: "Des personnes viennent-elles spontanément te demander conseil lorsqu’elles doivent prendre une décision importante ?" },
      { id: "sagesse_3", dimension: "sagesse_biblique", text: "Arrives-tu à appliquer les principes bibliques à des situations concrètes pour aider les autres à prendre de bonnes décisions ?" },
      { id: "sagesse_4", dimension: "solution", text: "As-tu déjà proposé une solution à un problème difficile, alors que personne ne semblait savoir quoi faire ?" },
      { id: "sagesse_5", dimension: "confirmation", text: "Des personnes t’ont-elles déjà témoigné que tes conseils les avaient aidées à prendre une bonne décision ou à sortir d’une situation compliquée ?" },
    ],
  },
];

// Ordre stable et mélangé : une question de chaque don par cycle, puis rotation.
// Aucun don n'est affiché dans le questionnaire.
export const spiritualGiftQuestions = Array.from({ length: 5 }, (_, round) =>
  spiritualGiftsV2.map((gift, giftIndex) => {
    const questionIndex = (round + giftIndex * 2) % 5;
    const question = gift.questions[questionIndex];
    return { ...question, giftId: gift.id };
  }),
).flat();

export type GiftCategory = "exercised" | "developing" | "less_visible";

export function classifySpiritualGifts(answers: Record<string, unknown>) {
  return spiritualGiftsV2.map((gift) => {
    const values = gift.questions.map((question) => Number(answers[question.id])).filter((value) => Number.isFinite(value) && value >= 0 && value <= 5);
    const average = values.length === 5 ? values.reduce((sum, value) => sum + value, 0) / 5 : 0;
    const category: GiftCategory = average >= 3.6 ? "exercised" : average >= 1.8 ? "developing" : "less_visible";
    const strongest = gift.questions
      .map((question) => ({ ...question, value: Number(answers[question.id]) || 0 }))
      .sort((left, right) => right.value - left.value)[0];
    return { ...gift, average, category, strongestDimension: strongest?.dimension ?? null };
  });
}

export function isSpiritualGiftsV2Complete(answers: Record<string, unknown>) {
  return spiritualGiftQuestions.every((question) => {
    const value = Number(answers[question.id]);
    return Number.isInteger(value) && value >= 0 && value <= 5;
  });
}
