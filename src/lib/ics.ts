import {
  studentSessionTrainerNames,
  type StudentSession,
} from "@/lib/data/student";

const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

/** Décalage de Paris par rapport à l'UTC à un instant donné (heure d'été et d'hiver comprises). */
function parisOffsetMs(utcMs: number) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const v = (t: string) => Number(parts.find((x) => x.type === t)?.value ?? 0);
  return Date.UTC(v("year"), v("month") - 1, v("day"), v("hour"), v("minute"), v("second")) - utcMs;
}

/** « 2026-11-07 » + « 09:30 » (heure de Paris) → « 20261107T083000Z » : le même instant dans tous les agendas. */
export function stamp(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.slice(0, 5).split(":").map(Number);
  const local = Date.UTC(y, m - 1, d, hh, mm);
  let utc = local - parisOffsetMs(local);
  utc = local - parisOffsetMs(utc);
  return new Date(utc).toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
}

/** Une ligne d'un fichier de calendrier ne dépasse pas 75 octets : on la plie (norme RFC 5545). */
export function fold(line: string) {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Ne jamais couper au milieu d'un caractère accentué
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    out.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74;
  }
  return out.join("\r\n ");
}

export function buildIcs(sessions: StudentSession[]) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const events = sessions.flatMap((s) => {
    const trainers = studentSessionTrainerNames(s);
    return [
    "BEGIN:VEVENT",
    `UID:${s.id}@ministry-school`,
    `DTSTAMP:${now}`,
    `LAST-MODIFIED:${now}`,
    "STATUS:CONFIRMED",
    `DTSTART:${stamp(s.session_date, s.start_time)}`,
    `DTEND:${stamp(s.session_date, s.end_time)}`,
    `SUMMARY:${esc(`Ministry School — ${s.courses?.title ?? s.description ?? "Séance"}`)}`,
    `LOCATION:${esc(s.room ? `${s.location}, ${s.room}` : s.location)}`,
    ...(trainers ? [`DESCRIPTION:${esc(`Avec ${trainers}`)}`] : []),
    "END:VEVENT",
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ministry School//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Ministry School",
    "X-WR-TIMEZONE:Europe/Paris",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "X-PUBLISHED-TTL:P1D",
    ...events,
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}
