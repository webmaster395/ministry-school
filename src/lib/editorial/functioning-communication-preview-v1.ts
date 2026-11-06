import source from "./profil-mapp-communication-et-interactions-12-combinaisons-v1.json";
import reviewedInteractions from "./profil-mapp-comment-communiquer-avec-toi-v4.json";
import { interactionsIntrosPreviewV2 } from "./functioning-interactions-intros-preview-v2";

export const communicationPreviewVersion = "profil-mapp-communication-interactions-preview-v1";
export type CommunicationCombination = keyof typeof source.orderedCombinations;

// Reviewed preview copy. The supplied JSON remains intact and is not used by participant results.
const reviewed: Record<CommunicationCombination, {
  communicationIntro: string;
  expression?: string;
}> = {
  DI: {
    communicationIntro: "Tu vas volontiers droit au but et annonces clairement la direction que tu veux prendre. L'enthousiasme et le plaisir d'échanger peuvent rendre cette parole plus vivante et entraînante.",
  },
  DS: {
    communicationIntro: "Tu peux exprimer une direction avec franchise tout en restant attentif à la façon dont elle est reçue. Selon la situation, ton propos peut être direct ou prendre davantage de temps pour préserver le dialogue.",
  },
  DC: {
    communicationIntro: "Tu apprécies les échanges qui conduisent à une décision concrète et s'appuient sur des faits solides. Tu peux aller à l'essentiel, puis approfondir les données lorsque la précision devient décisive.",
  },
  ID: {
    communicationIntro: "Tu peux donner de l'énergie à une conversation par tes idées et tes réactions spontanées. Lorsque le sujet appelle une décision, cette expression vivante peut devenir plus directe et orientée vers un résultat.",
    expression: "Tu peux raconter, illustrer tes idées par des anecdotes et passer spontanément d'un sujet à un autre. Ton débit, ton volume et ton intonation peuvent varier avec l'enthousiasme, et tu peux interrompre pour rebondir sur une idée. Lorsqu'il faut décider, ta parole peut devenir plus brève et plus affirmative sans perdre son caractère vivant.",
  },
  IS: {
    communicationIntro: "Tu peux rendre les échanges chaleureux et expressifs, tout en veillant à ce que chacun y trouve sa place. Ton enthousiasme peut s'accompagner d'une écoute plus posée lorsque la relation demande du temps.",
  },
  IC: {
    communicationIntro: "Tu peux partager tes idées avec entrain tout en cherchant à les rendre précises et cohérentes. L'élan de la conversation et le besoin de vérifier les faits peuvent se relayer selon le sujet.",
  },
  SD: {
    communicationIntro: "Tu peux privilégier un échange calme, attentif à chacun, avant de formuler une position. Quand une direction doit être prise, cette réserve peut laisser place à une parole plus affirmée.",
    expression: "Tu peux choisir des mots mesurés, poser des questions et réfléchir à leur effet sur les autres avant de répondre. Ta voix peut rester posée, avec un débit régulier et peu de variations, et tu peux t'interrompre pour laisser parler quelqu'un. Lorsqu'un résultat doit être défendu, tu peux toutefois formuler plus nettement ton avis et donner davantage de fermeté à ton ton.",
  },
  SI: {
    communicationIntro: "Tu peux commencer par écouter et chercher un climat serein, puis apporter de la chaleur à la conversation. Cette combinaison laisse de la place aux autres sans exclure la spontanéité.",
  },
  SC: {
    communicationIntro: "Tu peux prendre le temps d'écouter et de comprendre avant de t'exprimer. Le souci de préserver la relation peut s'allier à celui d'exposer des faits précis et cohérents.",
  },
  CD: {
    communicationIntro: "Tu peux construire ton propos avec méthode et vérifier les informations avant de conclure. Une fois les faits établis, tu peux aussi vouloir trancher et passer à l'action.",
    expression: "Tu peux choisir tes mots avec soin, poser des questions précises et dérouler les étapes de ton raisonnement avant sa conclusion. Ton débit et ton volume peuvent rester mesurés, avec peu de variations d'intonation. Quand les faits sont établis et qu'une décision s'impose, tu peux devenir plus direct et formuler clairement ta position.",
  },
  CI: {
    communicationIntro: "Tu peux rechercher la justesse des mots et la cohérence des faits, tout en appréciant une conversation vivante. Une idée peut naître dans l'échange, puis demander un temps de vérification.",
  },
  CS: {
    communicationIntro: "Tu peux privilégier une parole réfléchie, étayée par des faits, et attentive à son effet sur les autres. Prendre le temps de vérifier les informations peut aller de pair avec le souci de préserver le dialogue.",
  },
};

export function getCommunicationPreview(combination: CommunicationCombination) {
  const item = source.orderedCombinations[combination];
  const edits = reviewed[combination];
  return {
    primary: item.primary,
    secondary: item.secondary,
    communication: {
      ...item.communication,
      intro: edits.communicationIntro,
      accordions: item.communication.accordions.map(panel => ({
        ...panel,
        text: panel.id === "expression" && edits.expression ? edits.expression : panel.text,
      })),
    },
    interactions: {
      ...reviewedInteractions.orderedCombinations[combination].natural,
      title: "Comment communiquer avec toi.",
      intro: interactionsIntrosPreviewV2[combination].natural,
    },
  };
}
