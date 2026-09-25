/** « Une question ? » adressée à l'équipe : retirée pour l'instant (code et données conservés). À passer à true pour la réactiver. */
export const QUESTIONS_ENABLED = false;

export type QuestionCategory = "organisation" | "ministeres" | "technique";

// Flora, Nathalie et l'équipe technique se partagent la même boîte : pas d'adresse
// personnelle par sujet, une seule adresse commune reçoit toutes les questions.
export const QUESTIONS_EMAIL = process.env.QUESTIONS_EMAIL || "ministryschool@mlkgrandparis.com";

/** Chaque type de question a son destinataire, décidé avec Rose Alice — pour l'affichage. */
export const QUESTION_CATEGORIES: Record<
  QuestionCategory,
  { label: string; hint: string; handler: string }
> = {
  organisation: {
    label: "Organisation du programme",
    hint: "Dates, lieux, horaires, inscriptions, formations de service et projets.",
    handler: "Flora",
  },
  ministeres: {
    label: "Ministères et enseignement",
    hint: "Sensibilités, contenu des cours, questions de fond.",
    handler: "Nathalie Boudehent",
  },
  technique: {
    label: "Connexion ou problème technique",
    hint: "Compte, mot de passe, e-mail de confirmation, bug.",
    handler: "Équipe technique",
  },
};
