/** Les neuf samedis de la promotion 2026–2027 : le premier samedi de chaque mois, d'octobre à juin. */
export function programDates(): string[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  return Array.from({ length: 9 }, (_, i) => {
    const month = 9 + i; // 9 = octobre 2026 … 17 = juin 2027
    const year = 2026 + Math.floor(month / 12);
    const m = month % 12;
    const firstDay = new Date(Date.UTC(year, m, 1)).getUTCDay();
    const saturday = 1 + ((6 - firstDay + 7) % 7);
    return `${year}-${pad(m + 1)}-${pad(saturday)}`;
  });
}

/** Horaire des formations de service et projets : l'après-midi de chaque samedi. */
export const AFTERNOON = { start: "14:00", end: "17:00", label: "14 h–17 h" } as const;

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** « 1er mai 2027 », « 3 octobre 2026 » */
export function longDateLabel(iso: string) {
  const day = Number(iso.slice(8, 10));
  return `${day === 1 ? "1er" : day} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
