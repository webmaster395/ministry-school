const PARIS_TIME_ZONE = "Europe/Paris";

export type CreatedAccount = { created_at: string };

export type TrainingCycleStat = {
  date: string;
  label: string;
  value: number;
};

/** Retourne YYYY-MM-DD dans le fuseau métier, indépendamment du fuseau du navigateur. */
export function parisDateKey(value: string) {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    timeZone: PARIS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function cycleLabel(date: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * Première journée : tous les comptes créés jusqu'à la date incluse.
 * Journées suivantes : après la journée précédente et jusqu'à la nouvelle date incluse.
 */
export function accountsByTrainingCycle(
  accounts: CreatedAccount[],
  trainingDates: string[],
): TrainingCycleStat[] {
  const dates = [...new Set(trainingDates.filter(Boolean))].sort();
  const accountDates = accounts.map((account) => parisDateKey(account.created_at));

  return dates.map((date, index) => {
    const previous = dates[index - 1];
    return {
      date,
      label: cycleLabel(date),
      value: accountDates.filter((created) => created <= date && (!previous || created > previous)).length,
    };
  });
}
