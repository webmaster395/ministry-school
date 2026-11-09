import { getSpiritualGiftEditorial, type SpiritualGiftEditorialPath } from "./spiritual-gifts-editorial.ts";

export const giftScaleLabels = ["Jamais", "Très rarement", "Rarement", "Parfois", "Souvent", "Très souvent"] as const;

export type SpiritualGiftQuestion = { id: string; dimension: string; text: string; insight: string };
export type SpiritualGift = {
  id: string;
  name: string;
  definition: string;
  challenge: string;
  palette: { background: string; foreground: string };
  evidenceDimensions: string[];
  questions: SpiritualGiftQuestion[];
};

export const spiritualGiftsV2: SpiritualGift[] = [
  {
    id: "discernement", name: "Discernement des esprits",
    definition: "Capacité donnée par le Saint-Esprit à discerner l’origine spirituelle d’un message, d’une manifestation ou d’une situation.",
    challenge: "Face à un message ou une impression spirituelle, prends le temps de prier, de le confronter aux Écritures et d’en discuter avec un chrétien mature avant de conclure.",
    palette: { background: "#50091D", foreground: "#FF95B3" }, evidenceDimensions: ["confirmation"],
    questions: [
      { id: "disc_1", dimension: "perception", insight: "la perception d’une présence ou d’une influence spirituelle", text: "Ressens-tu parfois la présence ou l'influence d'un esprit démoniaque dans une situation ?" },
      { id: "disc_2", dimension: "distinction", insight: "la capacité à distinguer l’origine d’un message spirituel", text: "Lorsqu'une personne partage un message spirituel, arrives-tu à reconnaître s'il vient réellement de Dieu ou s'il reflète simplement ses propres pensées ?" },
      { id: "disc_3", dimension: "confirmation", insight: "la confirmation ultérieure de ce que tu avais discerné", text: "Lorsque tu discernes quelque chose spirituellement, est-ce que les événements viennent ensuite confirmer ce que tu avais perçu ?" },
    ],
  },
  {
    id: "connaissance", name: "Parole de connaissance",
    definition: "Capacité à recevoir surnaturellement une connaissance précise sur une personne ou une situation passée ou présente, sans l’avoir apprise naturellement.",
    challenge: "Si tu penses recevoir une information pour quelqu’un, note-la précisément, examine-la avec humilité et demande un avis mature avant de la partager sans pression. Ne présente pas une impression comme un fait établi.",
    palette: { background: "#09272A", foreground: "#9EF4F1" }, evidenceDimensions: ["confirmation"],
    questions: [
      { id: "conn_1", dimension: "experience", insight: "la réception d’une information que tu ne pouvais pas connaître naturellement", text: "As-tu déjà reçu une information précise sur une personne ou une situation, sans pouvoir la connaître par tes propres moyens ?" },
      { id: "conn_2", dimension: "revelation", insight: "des informations reçues dans la prière, un rêve ou une vision", text: "Reçois-tu parfois, pendant la prière, dans un rêve ou une vision, des informations précises qui se révèlent ensuite exactes ?" },
      { id: "conn_3", dimension: "confirmation", insight: "la confirmation de ces informations par la personne concernée", text: "Quand tu partages une information que tu penses avoir reçue de Dieu, est-ce que la personne te confirme parfois qu'elle est juste, alors que tu ne pouvais pas la connaître ?" },
    ],
  },
  {
    id: "foi", name: "Don de foi",
    definition: "Capacité particulière donnée par le Saint-Esprit à recevoir une assurance profonde que Dieu va intervenir dans une situation précise, même lorsque toute solution humaine semble impossible.",
    challenge: "Identifie une situation difficile, prie avec une personne de confiance et pose un premier acte concret et réfléchi, sans prendre de risque inconsidéré.",
    palette: { background: "#183FCE", foreground: "#F3E997" }, evidenceDimensions: ["confirmation"],
    questions: [
      { id: "foi_1", dimension: "conviction", insight: "une certitude intérieure que Dieu va intervenir", text: "Face à une situation qui semble humainement impossible, ressens-tu parfois une certitude profonde que Dieu va intervenir ?" },
      { id: "foi_2", dimension: "action", insight: "le fait d’agir à partir d’une promesse reçue", text: "Lorsqu'une situation semble sans issue, t'arrive-t-il d'agir avec assurance parce que tu as la conviction que Dieu t'a donné une promesse précise ?" },
      { id: "foi_3", dimension: "confirmation", insight: "la confirmation de cette conviction dans les événements", text: "As-tu déjà vu une situation évoluer comme tu en avais reçu la conviction dans la prière ?" },
    ],
  },
  {
    id: "guerison", name: "Don de guérison",
    definition: "Capacité particulière donnée par le Saint-Esprit d’être utilisé par Dieu pour apporter une guérison surnaturelle à une personne malade ou souffrante.",
    challenge: "Propose à une personne malade de prier pour elle, avec son accord. Prends de ses nouvelles et apporte une aide concrète, sans promettre de guérison ni interrompre ses soins.",
    palette: { background: "#28503C", foreground: "#D7FF99" }, evidenceDimensions: ["observation"],
    questions: [
      { id: "guer_1", dimension: "pratique", insight: "le réflexe de proposer de prier pour une personne malade", text: "Lorsque quelqu'un est malade, as-tu spontanément le réflexe de proposer de prier pour sa guérison ?" },
      { id: "guer_2", dimension: "conviction", insight: "la conviction reçue pendant la prière pour une guérison", text: "Quand tu pries pour une personne malade, reçois-tu parfois la conviction qu'elle est guérie, même si rien ne permet encore de le vérifier ?" },
      { id: "guer_3", dimension: "observation", insight: "l’observation d’une amélioration après la prière", text: "As-tu déjà prié pour une personne malade et constaté une amélioration de son état après ta prière ?" },
    ],
  },
  {
    id: "miracles", name: "Don d'opérer des miracles",
    definition: "Capacité particulière donnée par le Saint-Esprit d’être utilisé par Dieu pour accomplir des actes surnaturels qui manifestent sa puissance.",
    challenge: "Prie avec une personne de confiance pour une situation difficile, puis note les faits observables sans chercher à provoquer ou à exagérer un miracle.",
    palette: { background: "#4D2577", foreground: "#E7B6FF" }, evidenceDimensions: ["experience", "sollicitation"],
    questions: [
      { id: "mir_1", dimension: "pratique", insight: "le réflexe de prier face à une situation impossible", text: "Face à une situation qui semble impossible, as-tu spontanément le réflexe de prier pour que Dieu accomplisse un miracle ?" },
      { id: "mir_2", dimension: "experience", insight: "l’expérience d’un événement que tu considères comme un miracle", text: "Lorsque tu pries pour une situation, t'arrive-t-il d'assister à un événement que tu considères comme un miracle de Dieu ?" },
      { id: "mir_3", dimension: "sollicitation", insight: "le fait que d’autres personnes te sollicitent pour prier avec elles", text: "Des personnes viennent-elles te demander de prier avec elles lorsqu'elles traversent des situations qui semblent sans issue ?" },
    ],
  },
  {
    id: "prophetie", name: "Don de prophétie",
    definition: "Capacité particulière donnée par le Saint-Esprit à transmettre un message de Dieu pour édifier, encourager, consoler, avertir ou conduire une personne à changer.",
    challenge: "Si une parole d’encouragement te vient pour quelqu’un, examine-la à la lumière de la Bible et partage-la humblement, sans imposer qu’elle vienne de Dieu.",
    palette: { background: "#D64B27", foreground: "#FFF0CC" }, evidenceDimensions: ["confirmation"],
    questions: [
      { id: "prop_1", dimension: "reception", insight: "la réception d’un message précis pour quelqu’un", text: "Pendant la prière ou dans ton quotidien, ressens-tu parfois que Dieu te donne un message précis à transmettre à quelqu'un ?" },
      { id: "prop_2", dimension: "transmission", insight: "l’élan d’avertir ou d’encourager une personne à changer", text: "T'arrive-t-il de ressentir que Dieu te pousse à avertir une personne ou à l'encourager à changer quelque chose dans sa vie ?" },
      { id: "prop_3", dimension: "confirmation", insight: "les retours reçus après avoir partagé une parole", text: "Des personnes t'ont-elles déjà confirmé qu'une parole que tu leur avais transmise les avait profondément encouragées, consolées ou interpellées ?" },
    ],
  },
  {
    id: "sagesse", name: "Parole de sagesse",
    definition: "Capacité particulière donnée par le Saint-Esprit à apporter des conseils et des solutions adaptés à une situation, en s’appuyant sur la sagesse de Dieu.",
    challenge: "Accompagne une personne qui doit prendre une décision : écoute-la, explore les principes bibliques et les conséquences possibles, puis laisse-la décider librement.",
    palette: { background: "#EFCB56", foreground: "#342E50" }, evidenceDimensions: ["sollicitation", "confirmation"],
    questions: [
      { id: "sag_1", dimension: "sollicitation", insight: "le fait que les autres viennent naturellement te demander conseil", text: "Les autres viennent-ils naturellement te demander conseil lorsqu'ils doivent prendre une décision importante ?" },
      { id: "sag_2", dimension: "experience", insight: "une compréhension particulière qui permet d’apporter un conseil adapté", text: "Face à une situation compliquée, reçois-tu parfois une compréhension particulière qui te permet d'apporter un conseil juste et adapté ?" },
      { id: "sag_3", dimension: "confirmation", insight: "les retours positifs reçus sur l’utilité de tes conseils", text: "Des personnes t'ont-elles déjà dit que tes conseils les avaient aidées à prendre une bonne décision ou à résoudre un problème ?" },
    ],
  },
];

export const spiritualGiftQuestionOrder = [
  "disc_1", "conn_1", "foi_1", "guer_1", "mir_1", "prop_1", "sag_1",
  "disc_2", "conn_2", "foi_2", "guer_2", "mir_2", "prop_2", "sag_2",
  "disc_3", "conn_3", "foi_3", "guer_3", "mir_3", "prop_3", "sag_3",
] as const;

const questionById = new Map(spiritualGiftsV2.flatMap((gift) => gift.questions.map((question) => [question.id, { ...question, giftId: gift.id }] as const)));
export const spiritualGiftQuestions = spiritualGiftQuestionOrder.map((id) => questionById.get(id)!);

export type GiftCategory = "exercised" | "developing" | "less_visible";

export function classifySpiritualGifts(answers: Record<string, unknown>) {
  return spiritualGiftsV2.map((gift) => {
    const responses = gift.questions.map((question) => ({ ...question, value: Number.isInteger(Number(answers[question.id])) ? Number(answers[question.id]) : 0 }));
    const evidence = responses.filter((response) => gift.evidenceDimensions.includes(response.dimension));
    const strongestEvidence = Math.max(0, ...evidence.map((response) => response.value));
    const support = Math.max(0, ...responses.filter((response) => !gift.evidenceDimensions.includes(response.dimension)).map((response) => response.value));
    const sorted = [...responses].sort((left, right) => right.value - left.value);
    const average = responses.reduce((sum, response) => sum + response.value, 0) / responses.length;
    const exercised = strongestEvidence >= 4 && support >= 3;
    const developing = !exercised && (sorted[0].value >= 3 || (strongestEvidence >= 2 && sorted[1].value >= 2));
    const category: GiftCategory = exercised ? "exercised" : developing ? "developing" : "less_visible";
    const path: SpiritualGiftEditorialPath = exercised
      ? "grounded"
      : category === "less_visible"
        ? "quiet"
        : support >= 3 && strongestEvidence <= 2
          ? "unverified"
          : "emerging";
    const editorial = getSpiritualGiftEditorial(gift.id, path);
    return { ...gift, ...editorial, average, category, responses, editorialPath: path, strongestDimension: sorted[0].dimension };
  });
}

export function isSpiritualGiftsV2Complete(answers: Record<string, unknown>) {
  return spiritualGiftQuestions.every((question) => {
    const value = Number(answers[question.id]);
    return Number.isInteger(value) && value >= 0 && value <= 5;
  });
}
