export type QuestionCategory = "organisation" | "ministeres" | "technique";

const fallbackEmail = process.env.QUESTIONS_FALLBACK_EMAIL || "ministryschool@mlkgrandparis.com";

/**
 * Chaque type de question a son destinataire, décidé avec Rose Alice, et une adresse à qui
 * envoyer un e-mail automatique. Sans adresse dédiée définie en variable d'environnement
 * (voir .env.example), l'e-mail part vers l'adresse générale de contact.
 */
export const QUESTION_CATEGORIES: Record<
  QuestionCategory,
  { label: string; hint: string; handler: string; email: string }
> = {
  organisation: {
    label: "Organisation du programme",
    hint: "Dates, lieux, horaires, inscriptions, formations de service et projets.",
    handler: "Flora",
    email: process.env.QUESTIONS_EMAIL_ORGANISATION || fallbackEmail,
  },
  ministeres: {
    label: "Ministères et enseignement",
    hint: "Sensibilités, contenu des cours, questions de fond.",
    handler: "Nathalie Boudehent",
    email: process.env.QUESTIONS_EMAIL_MINISTERES || fallbackEmail,
  },
  technique: {
    label: "Connexion ou problème technique",
    hint: "Compte, mot de passe, e-mail de confirmation, bug.",
    handler: "Équipe technique",
    email: process.env.QUESTIONS_EMAIL_TECHNIQUE || fallbackEmail,
  },
};
