import { createClient } from "@/lib/supabase/server";
import { getStudentSessions } from "@/lib/data/student";

// Export .ics : ouvert sur téléphone, il propose d'ajouter les séances à l'agenda
const esc = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
const stamp = (date: string, time: string) =>
  `${date.replace(/-/g, "")}T${time.slice(0, 5).replace(":", "")}00`;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Non autorisé", { status: 401 });

  const sessions = await getStudentSessions(supabase, user.id);
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

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ministry School//FR",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Ministry School",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="ministry-school.ics"',
    },
  });
}
