const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Le cycle Ministry d'un mois se termine le dimanche du premier week-end.
 * Dès le lundi suivant, l'interface se positionne sur le mois de formation
 * suivant, même si le mois civil n'est pas terminé.
 */
export function activeTrainingMonth(todayIso: string) {
  const [year, month, day] = todayIso.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const firstSaturday = 1 + ((6 - firstWeekday + 7) % 7);
  const firstSunday = firstSaturday + 1;
  if (day <= firstSunday) return `${year}-${pad(month)}`;

  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`;
}

export function activeTrainingCycleStart(todayIso: string) {
  return `${activeTrainingMonth(todayIso)}-01`;
}
