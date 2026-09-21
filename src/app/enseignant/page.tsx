import { createClient } from "@/lib/supabase/server";
import { getCommonSessions, getEnrollmentCounts, getTeacherSessions } from "@/lib/data/teacher";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import WeekCalendar from "@/components/WeekCalendar";
import QuickLinks from "@/components/QuickLinks";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import { getMinistry, INK } from "@/lib/ministry";

export default async function TeacherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [allSessions, commonSessions] = await Promise.all([
    getTeacherSessions(supabase, user!.id),
    getCommonSessions(supabase),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const nextSession = allSessions.filter((s) => s.session_date >= today)[0];
  const counts = await getEnrollmentCounts(supabase, allSessions);

  const colorFor = (s: { session_type: "commun" | "ministere"; ministries: { slug: string } | null }) =>
    s.session_type === "commun" ? INK : (getMinistry(s.ministries?.slug)?.color ?? INK);

  const calendarSessions = [...allSessions, ...commonSessions].map((s) => ({
    id: s.id,
    date: s.session_date,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    room: s.room,
    course: s.courses?.title ?? null,
    color: colorFor(s),
  }));

  return (
    <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_330px]">
      <div className="space-y-5">
        <section
          className="rounded-lg border border-border border-l-4 bg-background p-6"
          style={{ borderLeftColor: nextSession ? colorFor(nextSession) : "var(--border)" }}
        >
          <h2 className="label mb-4 text-xs tracking-[0.18em] text-muted">Prochaine séance</h2>
          {nextSession ? (
            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-title text-[26px] leading-tight text-foreground">
                  {formatSessionDate(nextSession.session_date)}
                </p>
                <SessionTypeBadge type={nextSession.session_type} />
              </div>
              {nextSession.courses && (
                <p className="text-base font-medium text-foreground">{nextSession.courses.title}</p>
              )}
              <p className="text-[15px] text-muted">
                {formatTimeRange(nextSession.start_time, nextSession.end_time)} ·{" "}
                {nextSession.location}
                {nextSession.room ? ` · ${nextSession.room}` : ""}
              </p>
              <p className="text-[15px] text-muted">
                <span className="font-semibold text-foreground">
                  {counts.get(nextSession.id) ?? 0}
                </span>{" "}
                étudiant(s) inscrit(s)
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted">Aucune séance à venir.</p>
          )}
        </section>

        <QuickLinks
          links={[
            { label: "Supports & consignes", href: "/enseignant/supports", icon: "megaphone" },
            { label: "Mon calendrier", href: "/enseignant/calendrier", icon: "calendar" },
            { label: "Mes étudiants", href: "/enseignant/etudiants", icon: "users" },
            { label: "Vue promo", href: "/enseignant/programme", icon: "book" },
          ]}
        />
      </div>

      <WeekCalendar sessions={calendarSessions} />
    </div>
  );
}
