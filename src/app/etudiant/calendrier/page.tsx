import { createClient } from "@/lib/supabase/server";
import { getStudentProfile, getStudentSessions } from "@/lib/data/student";
import { getMinistry, sessionColor } from "@/lib/ministry";
import { createCalendarToken } from "@/lib/calendar-token";
import MonthCalendar, { type MonthSession } from "@/components/MonthCalendar";

const AFTERNOON_SESSIONS: MonthSession[] = ["2026-11-07", "2026-12-05"].map((date) => ({
  id: `services-projets-${date}`,
  date,
  start: "14:30:00",
  end: "17:00:00",
  title: "Services & Projets",
  description:
    "Découvre les formations proposées par ton service ou les projets de l’Église MLK auxquels tu souhaites contribuer.",
  label: "Mise en pratique",
  location: null,
  teacher: null,
  color: "var(--accent)",
  informational: true,
}));

export default async function StudentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ jour?: string }>;
}) {
  const { jour } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug, ministryName }] = await Promise.all([
    getStudentSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
  ]);
  const ministryColor = getMinistry(ministrySlug)?.color ?? "var(--foreground)";

  // Sans le secret CALENDAR_TOKEN_SECRET côté serveur, pas de lien d'abonnement automatique
  // (seul le téléchargement ponctuel reste proposé).
  let subscribeUrl: string | null = null;
  try {
    subscribeUrl = `/agenda/${createCalendarToken(user!.id)}`;
  } catch {
    subscribeUrl = null;
  }

  const calendarSessions: MonthSession[] = sessions.map((s) => ({
    id: s.id,
    date: s.session_date,
    start: s.start_time,
    end: s.end_time,
    title: s.courses?.title ?? s.description ?? "Séance",
    description: null,
    label:
      s.track?.replace(/^Votre parcours\s*:\s*/i, "") ??
      (s.session_type === "commun" ? "Tronc commun" : (ministryName ?? "Ministère")),
    location: s.room ? `${s.location} · ${s.room}` : s.location,
    teacher: s.teacher?.full_name ?? null,
    color: sessionColor(s.track, s.session_type, ministryColor),
    informational: false,
  }));

  for (const afternoon of AFTERNOON_SESSIONS) {
    const alreadyPresent = calendarSessions.some(
      (session) =>
        session.date === afternoon.date &&
        session.start.slice(0, 5) === afternoon.start.slice(0, 5) &&
        session.end.slice(0, 5) === afternoon.end.slice(0, 5)
    );
    if (!alreadyPresent) calendarSessions.push(afternoon);
  }

  calendarSessions.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  return (
    <MonthCalendar
      subscribeUrl={subscribeUrl}
      initialDate={jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : undefined}
      sessions={calendarSessions}
    />
  );
}
