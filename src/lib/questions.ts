export type QuestionCategory = "organisation" | "ministeres" | "technique";

/** Chaque type de question a son destinataire, décidé avec Rose Alice. */
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
