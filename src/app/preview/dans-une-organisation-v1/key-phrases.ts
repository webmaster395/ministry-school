import type { ProfileCode, RoleId } from "./types";

export type KeyPhrase = { intention: string; words: string };

const situationPhrases: Record<string, KeyPhrase> = {
  convaincre: { intention: "Proposer", words: "Je te propose cette option parce qu’elle répond directement à notre objectif." },
  motiver: { intention: "Mobiliser", words: "Quelle partie de ce projet te donnerait vraiment envie de t’engager ?" },
  encourager: { intention: "Encourager", words: "Ce que tu as déjà accompli montre que tu peux franchir cette prochaine étape." },
  reunion: { intention: "Cadrer", words: "L’objectif de cette réunion est de décider ensemble de la prochaine étape." },
  telephone: { intention: "Ouvrir", words: "Je t’appelle pour clarifier ce point et convenir d’une suite précise." },
  email: { intention: "Objet", words: "Objet : [Projet] | décision attendue avant [date]" },
  whatsapp: { intention: "Introduire", words: "Bonjour, je t’écris au sujet de [sujet]. As-tu quelques minutes pour me répondre aujourd’hui ?" },
  feedback_positif: { intention: "Reconnaître", words: "Ta contribution sur [fait précis] a permis [résultat concret]." },
  feedback_correctif: { intention: "Recadrer", words: "J’ai constaté [fait précis] et j’aimerais que nous corrigions ce point ensemble." },
  objection: { intention: "Objecter", words: "Je comprends la proposition, mais un point important m’empêche encore d’y adhérer." },
  refuser: { intention: "Dire non", words: "Je ne peux pas m’engager sur cette demande dans les conditions actuelles." },
  conflit: { intention: "Apaiser", words: "Je veux que nous repartions des faits et que nous cherchions une solution acceptable." },
  annoncer_difficulte: { intention: "Alerter", words: "Nous rencontrons une difficulté sur [point] et voici ce que nous savons avec certitude." },
  gerer_urgence: { intention: "Prioriser", words: "La priorité immédiate est [action] ; le reste peut attendre jusqu’à [moment]." },
  mobiliser_crise: { intention: "Mobiliser", words: "Voici notre priorité, le rôle de chacun et le prochain point de situation." },
};

const combinationPhrases: Record<string, KeyPhrase> = {
  D: { intention: "Clarifier", words: "Voici le résultat attendu et la décision que je te propose." },
  DI: { intention: "Donner l’élan", words: "Voici le cap ; dis-moi ce qui te donnerait envie de nous rejoindre." },
  DS: { intention: "Sécuriser", words: "Voici le cap, et je veux vérifier avec toi que sa mise en œuvre reste réaliste." },
  DC: { intention: "Structurer", words: "Voici la décision proposée et les faits qui la soutiennent." },
  I: { intention: "Créer l’adhésion", words: "J’aimerais entendre ton point de vue avant que nous avancions ensemble." },
  ID: { intention: "Engager", words: "Je te propose que nous choisissions une direction claire et que nous passions à l’action." },
  IS: { intention: "Associer", words: "J’aimerais construire la prochaine étape avec toi, à un rythme qui convienne à chacun." },
  IC: { intention: "Préciser", words: "Je te partage l’idée, puis vérifions ensemble les points qui doivent être précisés." },
  S: { intention: "Rassurer", words: "Prenons le temps de clarifier ce dont chacun a besoin pour avancer sereinement." },
  SD: { intention: "Faire avancer", words: "Je veux préserver la qualité de l’échange tout en arrêtant une prochaine étape claire." },
  SI: { intention: "Encourager", words: "Ton point de vue compte ; cherchons une façon positive d’avancer ensemble." },
  SC: { intention: "Fiabiliser", words: "Vérifions les faits et convenons d’une méthode claire pour la suite." },
  C: { intention: "Préciser", words: "Avant de conclure, je voudrais vérifier les faits et les critères de décision." },
  CD: { intention: "Décider", words: "Les faits conduisent à cette option ; validons maintenant qui fait quoi." },
  CI: { intention: "Expliquer", words: "Je vais résumer les éléments essentiels, puis j’aimerais connaître ta réaction." },
  CS: { intention: "Mettre en confiance", words: "Je te propose de revoir les éléments ensemble pour avancer sur une base sûre." },
};

const rolePhrases: Record<RoleId, KeyPhrase> = {
  direction: { intention: "Arbitrer", words: "Après avoir entendu les objections, j’assumerai la décision et j’en expliquerai les raisons." },
  management: { intention: "Accompagner", words: "De quoi as-tu besoin de ma part pour réaliser cette prochaine étape ?" },
  contribution: { intention: "Contribuer", words: "Voici ma recommandation ; je te laisse l’arbitrage final et je peux préparer la suite." },
  transversal: { intention: "Coordonner", words: "Mettons-nous d’accord sur les responsabilités et sur notre prochain point de coordination." },
};

const counterpartPhrases: Record<ProfileCode, KeyPhrase> = {
  D: { intention: "Aller à l’essentiel", words: "Quel résultat veux-tu obtenir, et quelle décision pouvons-nous prendre maintenant ?" },
  I: { intention: "Impliquer", words: "Qu’est-ce qui te paraît le plus stimulant dans cette proposition ?" },
  S: { intention: "Rassurer", words: "Qu’est-ce qui te permettrait d’avancer sereinement dans ce changement ?" },
  C: { intention: "Vérifier", words: "Quelles informations ou quels critères te manquent encore pour te positionner ?" },
};

export function getKeyPhrases({ combination, role, situation, counterpart }: {
  combination: string;
  role: RoleId;
  situation: string;
  counterpart: ProfileCode;
}): KeyPhrase[] {
  return [situationPhrases[situation], combinationPhrases[combination], rolePhrases[role], counterpartPhrases[counterpart]];
}
