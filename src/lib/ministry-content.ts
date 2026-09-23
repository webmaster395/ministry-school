/**
 * Textes de l'onglet « Mon choix » : ce qui explique la sensibilité choisie.
 * Prophétique : texte fourni par Rose Alice. Les quatre autres sont des rédactions
 * provisoires, construites sur le même modèle, à faire valider avant la mise en ligne.
 */
export type MinistryProfile = {
  intro: string;
  anime: string;
  contribution: string;
  vigilance: string;
};

const SUITE =
  "Votre parcours de Sensibilité ministérielle sera adapté à cette orientation à partir de janvier.";

export const MINISTRY_PROFILES: Record<string, MinistryProfile> = {
  prophete: {
    intro: `Vous êtes particulièrement sensible au discernement, à l'écoute de Dieu et à une transmission juste. ${SUITE}`,
    anime: "Écouter, discerner et révéler ce qui doit être entendu.",
    contribution: "Apporter de la clarté et encourager une réponse fidèle.",
    vigilance: "Transmettre avec humilité, sagesse et redevabilité.",
  },
  apotre: {
    intro: `Vous êtes particulièrement sensible à l'ouverture de nouveaux horizons, à l'envoi et à la mise en place de fondations solides. ${SUITE}`,
    anime: "Ouvrir de nouveaux chemins, envoyer et poser des fondations.",
    contribution: "Apporter une vision, de l'élan et une direction pour lancer de nouveaux projets.",
    vigilance: "S'entourer, prendre soin des personnes et avancer à un rythme que tous peuvent suivre.",
  },
  evangeliste: {
    intro: `Vous êtes particulièrement sensible à ceux qui n'ont pas encore entendu, à l'annonce de la bonne nouvelle et à l'invitation. ${SUITE}`,
    anime: "Annoncer la bonne nouvelle et inviter chacun à faire un pas.",
    contribution: "Apporter de l'ouverture, de l'enthousiasme et le goût d'aller vers les autres.",
    vigilance: "Accompagner dans la durée ceux que l'on rencontre, au-delà du premier pas.",
  },
  pasteur: {
    intro: `Vous êtes particulièrement sensible au soin des personnes, à l'accompagnement et à la vie de la communauté. ${SUITE}`,
    anime: "Prendre soin, écouter et accompagner chacun avec patience.",
    contribution: "Apporter de la stabilité, de la bienveillance et un climat de confiance.",
    vigilance: "Oser dire les choses difficiles et penser aussi à se ménager soi-même.",
  },
  docteur: {
    intro: `Vous êtes particulièrement sensible à la compréhension de la Parole, à l'enseignement et à la transmission d'un fondement solide. ${SUITE}`,
    anime: "Étudier, comprendre et transmettre la Parole avec précision.",
    contribution: "Apporter de la profondeur, de la clarté et de la rigueur.",
    vigilance: "Garder la relation et le cœur au centre, au-delà de la connaissance.",
  },
};

export type MinistryResource = {
  title: string;
  description: string;
  action: string;
  icon: "book" | "user" | "heart";
  /** Lien interne ou externe. Sans lien, la ligne s'affiche comme « bientôt disponible ». */
  href?: string;
};

export const MINISTRY_RESOURCES: MinistryResource[] = [
  {
    title: "Comprendre les cinq ministères",
    description:
      "Un document pour découvrir les sensibilités apostolique, prophétique, évangélique, pastorale et doctorale.",
    action: "Découvrir",
    icon: "book",
    href: "/etudiant/formation?onglet=decouvrir",
  },
  {
    title: "Découvrir sa sensibilité avec l'APEST",
    description: "Un questionnaire pour mieux identifier sa sensibilité ministérielle.",
    action: "Commencer",
    icon: "heart",
  },
];
