import type { StudentSession } from "@/lib/data/student";

const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
const stamp = (date: string, time: string) =>
  `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

export function buildIcs(sessions: StudentSession[]) {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const events = sessions.flatMap((s) => [
    "BEGIN:VEVENT",
    `UID:${s.id}@ministry-school`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(s.session_date, s.start_time)}`,
    `DTEND:${stamp(s.session_date, s.end_time)}`,
    `SUMMARY:${esc(`Ministry School — ${s.courses?.title ?? s.description ?? "Séance"}`)}`,
    `LOCATION:${esc(s.room ? `${s.location}, ${s.room}` : s.location)}`,
    ...(s.teacher ? [`DESCRIPTION:${esc(`Avec ${s.teacher.full_name}`)}`] : []),
    "END:VEVENT",
  ]);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ministry School//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Ministry School",
    "REFRESH-INTERVAL;VALUE=DURATION:P1D",
    "X-PUBLISHED-TTL:P1D",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
