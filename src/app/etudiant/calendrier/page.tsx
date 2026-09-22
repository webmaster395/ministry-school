import { createClient } from "@/lib/supabase/server";
import { getStudentProfile, getStudentSessions } from "@/lib/data/student";
import { getMinistry, sessionColor } from "@/lib/ministry";
import { createCalendarToken } from "@/lib/calendar-token";
import MonthCalendar from "@/components/MonthCalendar";

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

  return (
    <MonthCalendar
      subscribeUrl={subscribeUrl}
      initialDate={jour && /^\d{4}-\d{2}-\d{2}$/.test(jour) ? jour : undefined}
      sessions={sessions.map((s) => ({
        id: s.id,
        date: s.session_date,
        start: s.start_time,
        end: s.end_time,
        title: s.courses?.title ?? s.description ?? "Séance",
        label: s.track ?? (s.session_type === "commun" ? "Tronc commun" : (ministryName ?? "Ministère")),
        location: s.room ? `${s.location} · ${s.room}` : s.location,
        teacher: s.teacher?.full_name ?? null,
        color: sessionColor(s.track, s.session_type, ministryColor),
      }))}
    />
  );
}
