export type NotificationPrefs = {
  messages: boolean;
  rappel_journee: boolean;
  travail: boolean;
  reponse_question: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  rappel_journee: true,
  travail: true,
  reponse_question: true,
};

export const NOTIFICATION_LABELS: Record<keyof NotificationPrefs, { label: string; hint: string }> = {
  messages: {
    label: "Nouveaux messages",
    hint: "Quand un formateur ou l'équipe vous écrit.",
  },
  rappel_journee: {
    label: "Rappel de la prochaine journée",
    hint: "La veille ou le matin du samedi de formation.",
  },
  travail: {
    label: "Travail à faire",
    hint: "Rappel avant l'échéance d'une préparation.",
  },
  reponse_question: {
    label: "Réponse à une question envoyée",
    hint: "Quand votre question dans « Une question ? » a été traitée.",
  },
};

export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  const v = (value ?? {}) as Partial<NotificationPrefs>;
  return {
    messages: v.messages ?? DEFAULT_NOTIFICATION_PREFS.messages,
    rappel_journee: v.rappel_journee ?? DEFAULT_NOTIFICATION_PREFS.rappel_journee,
    travail: v.travail ?? DEFAULT_NOTIFICATION_PREFS.travail,
    reponse_question: v.reponse_question ?? DEFAULT_NOTIFICATION_PREFS.reponse_question,
  };
}
