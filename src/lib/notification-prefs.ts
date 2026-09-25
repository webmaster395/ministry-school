export type NotificationPrefs = {
  messages: boolean;
  rappel_journee: boolean;
  travail: boolean;
  reponse_question: boolean;
  /** Combien de jours avant la journée le rappel est envoyé */
  rappel_jours: 1 | 3 | 7;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  messages: true,
  rappel_journee: true,
  travail: true,
  reponse_question: true,
  rappel_jours: 1,
};

export const NOTIFICATION_LABELS: Record<Exclude<keyof NotificationPrefs, "rappel_jours">, { label: string; hint: string }> = {
  messages: {
    label: "Messages pédagogiques",
    hint: "Recevoir les nouvelles communications liées à ma formation.",
  },
  rappel_journee: {
    label: "Rappels de formation",
    hint: "Recevoir un rappel avant chaque journée de formation.",
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
    rappel_jours: v.rappel_jours === 3 || v.rappel_jours === 7 ? v.rappel_jours : DEFAULT_NOTIFICATION_PREFS.rappel_jours,
  };
}
