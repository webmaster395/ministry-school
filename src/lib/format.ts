export function formatSessionDate(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** « 11 h 30–13 h 00 » : l'écriture de la maquette de Rose Alice. */
export function formatTimeRangeFr(start: string, end: string) {
  const t = (v: string) => v.slice(0, 5).replace(":", " h ");
  return `${t(start)}–${t(end)}`;
}

export function formatTimeRange(start: string, end: string) {
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
}
