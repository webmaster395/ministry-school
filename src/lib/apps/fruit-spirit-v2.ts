export const FRUIT_SPIRIT_QUESTIONNAIRE_VERSION = "fruit-spirit-v2-27";
export const FRUIT_SPIRIT_SCORING_VERSION = "fruit-spirit-v2-mean-v1";
export const FRUIT_SPIRIT_RESTITUTION_VERSION = "fruit-spirit-v2-editorial-1";

export type FruitSpiritKey = "amour" | "joie" | "paix" | "patience" | "bonte" | "bienveillance" | "fidelite" | "douceur" | "maitrise";
export type FruitSpiritLevel = "practice" | "develop" | "discover";

export const fruitSpiritAnswerScale = [
  { value: 1, label: "Jamais" },
  { value: 2, label: "Rarement" },
  { value: 3, label: "Parfois" },
  { value: 4, label: "Souvent" },
  { value: 5, label: "Presque toujours" },
] as const;

export const fruitSpiritLevelLabels: Record<FruitSpiritLevel, string> = {
  practice: "Ce fruit est déjà bien présent",
  develop: "Ce fruit est en train de grandir",
  discover: "Ce fruit commence à germer",
};

export const fruitSpiritSituationsV2 = [
  {
    id: "situation-1",
    title: "Une personne te déçoit",
    context: "Tu avais confiance en quelqu'un, mais cette personne n'a pas tenu sa parole. Tu es déçu et tu dois décider comment réagir.",
    questions: [
      { id: "q01", position: 1, fruit: "amour", prompt: "Quand quelqu'un me déçoit, est-ce que je continue à lui vouloir du bien, même si je suis blessé ?" },
      { id: "q02", position: 2, fruit: "bienveillance", prompt: "Avant de juger son comportement, est-ce que je prends le temps d'écouter ses explications ?" },
      { id: "q03", position: 3, fruit: "douceur", prompt: "Quand je lui exprime ma déception, est-ce que j'arrive à le faire sans chercher à le blesser ?" },
    ],
  },
  {
    id: "situation-2",
    title: "Une journée où tout déborde",
    context: "Tu as beaucoup de choses à faire. Les imprévus s'accumulent, tu prends du retard et plusieurs personnes ont besoin de toi.",
    questions: [
      { id: "q04", position: 4, fruit: "maitrise", prompt: "Quand je suis débordé, est-ce que j'arrive à réfléchir avant de réagir sous le coup de l'agacement ?" },
      { id: "q05", position: 5, fruit: "paix", prompt: "Même lorsque tout ne se passe pas comme prévu, est-ce que j'arrive à ne pas me laisser envahir par l'inquiétude ?" },
      { id: "q06", position: 6, fruit: "patience", prompt: "Quand quelqu'un me ralentit alors que je suis pressé, est-ce que je continue à lui parler calmement ?" },
    ],
  },
  {
    id: "situation-3",
    title: "Quand quelqu'un réussit à ta place",
    context: "Une personne de ton entourage obtient une opportunité que tu espérais depuis longtemps. Elle vient partager sa joie avec toi.",
    questions: [
      { id: "q07", position: 7, fruit: "joie", prompt: "Quand quelqu'un obtient ce que j'espérais, est-ce que j'arrive à me réjouir sincèrement pour lui ?" },
      { id: "q08", position: 8, fruit: "amour", prompt: "Même si je suis déçu pour moi-même, est-ce que je prends le temps de célébrer sa réussite ?" },
      { id: "q09", position: 9, fruit: "bonte", prompt: "Quand une personne réussit, est-ce que je pose un geste concret pour l'encourager ou la soutenir ?" },
    ],
  },
  {
    id: "situation-4",
    title: "Quand quelqu'un fait une erreur qui te pénalise",
    context: "Tu travailles sur un projet avec une autre personne. Elle commet une erreur qui te fait perdre du temps et t'oblige à refaire une partie du travail. Ce n'est pas la première fois.",
    questions: [
      { id: "q10", position: 10, fruit: "patience", prompt: "Quand une personne répète une erreur, est-ce que j'arrive à rester patient avec elle ?" },
      { id: "q11", position: 11, fruit: "bonte", prompt: "Même si son erreur me coûte du temps, est-ce que je cherche à l'aider à progresser ?" },
      { id: "q12", position: 12, fruit: "bienveillance", prompt: "Avant de lui faire des reproches, est-ce que je cherche à comprendre ce qui l'a mise en difficulté ?" },
    ],
  },
  {
    id: "situation-5",
    title: "Une promesse qui devient difficile à tenir",
    context: "Tu as accepté de rendre un service à quelqu'un. Mais le moment venu, tu es fatigué, tu manques de temps et personne ne te relancera si tu ne fais rien.",
    questions: [
      { id: "q13", position: 13, fruit: "fidelite", prompt: "Quand tenir une promesse me demande plus d'efforts que prévu, est-ce que je cherche à aller jusqu'au bout ?" },
      { id: "q14", position: 14, fruit: "maitrise", prompt: "Quand je préférerais faire autre chose, est-ce que j'arrive à résister à l'envie de repousser mon engagement ?" },
      { id: "q15", position: 15, fruit: "fidelite", prompt: "Quand je réalise que je ne pourrai pas tenir ma promesse, est-ce que je préviens rapidement la personne concernée ?" },
    ],
  },
  {
    id: "situation-6",
    title: "Une mauvaise nouvelle qui te déstabilise",
    context: "Tu reçois une nouvelle inquiétante concernant une situation importante pour toi. Tu n'as pas toutes les informations et tu dois attendre plusieurs jours avant d'en savoir davantage.",
    questions: [
      { id: "q16", position: 16, fruit: "paix", prompt: "Quand je ne sais pas ce qui va arriver, est-ce que j'arrive à ne pas imaginer systématiquement le pire ?" },
      { id: "q17", position: 17, fruit: "joie", prompt: "Même pendant une période difficile, est-ce que j'arrive à reconnaître les bonnes choses qui se passent dans ma vie ?" },
      { id: "q18", position: 18, fruit: "maitrise", prompt: "Quand l'inquiétude monte, est-ce que j'arrive à éviter de prendre des décisions précipitées ?" },
    ],
  },
  {
    id: "situation-7",
    title: "Une personne que personne ne remarque",
    context: "Tu participes à un événement. Tout le monde discute en petits groupes, mais une personne reste seule à l'écart et semble mal à l'aise.",
    questions: [
      { id: "q19", position: 19, fruit: "bonte", prompt: "Quand je remarque une personne isolée, est-ce que je prends l'initiative d'aller vers elle ?" },
      { id: "q20", position: 20, fruit: "amour", prompt: "Quand une personne a besoin d'être écoutée, est-ce que je lui accorde du temps, même si cela ne m'arrange pas ?" },
      { id: "q21", position: 21, fruit: "bienveillance", prompt: "Quand quelqu'un semble mal à l'aise, est-ce que je fais attention à ne pas le mettre davantage dans l'embarras ?" },
    ],
  },
  {
    id: "situation-8",
    title: "Quand on te critique devant les autres",
    context: "Tu présentes une idée qui te tient à cœur devant un groupe. Une personne remet publiquement en question ton travail, avec un ton que tu trouves injuste.",
    questions: [
      { id: "q22", position: 22, fruit: "douceur", prompt: "Quand quelqu'un me critique injustement, est-ce que j'arrive à exprimer mon désaccord sans chercher à le rabaisser ?" },
      { id: "q23", position: 23, fruit: "patience", prompt: "Quand une personne critique mon idée, est-ce que je la laisse terminer avant de répondre ?" },
      { id: "q24", position: 24, fruit: "fidelite", prompt: "Quand je réalise que je me suis trompé, est-ce que je reconnais mon erreur, même devant les autres ?" },
    ],
  },
  {
    id: "situation-9",
    title: "Quand les choses ne se passent pas comme tu l'espérais",
    context: "Tu t'es beaucoup investi dans un projet qui te tenait à cœur. Malgré tes efforts, le résultat est décevant et tu dois accepter que les choses ne se soient pas déroulées comme prévu.",
    questions: [
      { id: "q25", position: 25, fruit: "joie", prompt: "Quand un projet échoue, est-ce que j'arrive à reconnaître ce que cette expérience m'a apporté ?" },
      { id: "q26", position: 26, fruit: "paix", prompt: "Quand je ne peux plus changer le résultat d'une situation, est-ce que j'arrive progressivement à l'accepter ?" },
      { id: "q27", position: 27, fruit: "douceur", prompt: "Quand je suis déçu par un résultat collectif, est-ce que j'arrive à parler aux autres sans leur faire porter ma frustration ?" },
    ],
  },
] as const;

export const fruitSpiritFruitsV2: ReadonlyArray<{ key: FruitSpiritKey; name: string; questionIds: readonly string[] }> = [
  { key: "amour", name: "Amour", questionIds: ["q01", "q08", "q20"] },
  { key: "joie", name: "Joie", questionIds: ["q07", "q17", "q25"] },
  { key: "paix", name: "Paix", questionIds: ["q05", "q16", "q26"] },
  { key: "patience", name: "Patience", questionIds: ["q06", "q10", "q23"] },
  { key: "bonte", name: "Bonté", questionIds: ["q09", "q11", "q19"] },
  { key: "bienveillance", name: "Bienveillance", questionIds: ["q02", "q12", "q21"] },
  { key: "fidelite", name: "Fidélité", questionIds: ["q13", "q15", "q24"] },
  { key: "douceur", name: "Douceur", questionIds: ["q03", "q22", "q27"] },
  { key: "maitrise", name: "Maîtrise de soi", questionIds: ["q04", "q14", "q18"] },
];

export const fruitSpiritQuestionIdsV2 = fruitSpiritSituationsV2.flatMap((situation) => situation.questions.map((question) => question.id));

export function validFruitSpiritAnswer(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
}

export function isFruitSpiritV2Complete(answers: Record<string, unknown>) {
  return fruitSpiritQuestionIdsV2.every((questionId) => validFruitSpiritAnswer(answers[questionId]));
}

export function fruitSpiritLevelForScore(score: number): FruitSpiritLevel {
  if (score >= 4) return "practice";
  if (score >= 2.5) return "develop";
  return "discover";
}

export function calculateFruitSpiritV2(answers: Record<string, unknown>) {
  const scores = Object.fromEntries(fruitSpiritFruitsV2.map((fruit) => {
    const values = fruit.questionIds.map((questionId) => Number(answers[questionId])).filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
    const average = values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : 0;
    return [fruit.key, average];
  })) as Record<FruitSpiritKey, number>;
  const levels = Object.fromEntries(fruitSpiritFruitsV2.map((fruit) => [fruit.key, fruitSpiritLevelForScore(scores[fruit.key])])) as Record<FruitSpiritKey, FruitSpiritLevel>;
  return {
    questionnaireVersion: FRUIT_SPIRIT_QUESTIONNAIRE_VERSION,
    scoringVersion: FRUIT_SPIRIT_SCORING_VERSION,
    provisionalThresholds: true,
    complete: isFruitSpiritV2Complete(answers),
    scores,
    levels,
  };
}
