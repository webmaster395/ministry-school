import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAllSessions,
  getStudentNewCounts,
  getStudentProfile,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import WeekCalendar from "@/components/WeekCalendar";
import ProgressRing from "@/components/ProgressRing";
import SessionTypeBadge from "@/components/SessionTypeBadge";
import QuickLinks from "@/components/QuickLinks";
import { getMinistry, INK } from "@/lib/ministry";
import { markNotificationsSeen } from "./actions";

export default async function StudentDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { ministryName, ministrySlug, preferredDay, notificationsSeenAt } = await getStudentProfile(
    supabase,
    user!.id
  );
  const allSessions = await getStudentAllSessions(supabase, user!.id);

  const sessionIds = allSessions.map((s) => s.id);
  const newCounts = await getStudentNewCounts(supabase, sessionIds, notificationsSeenAt);
  const totalNew = newCounts.materials + newCounts.assignments + newCounts.messages;

  const plural = (n: number, singulier: string, pluriel: string) =>
    `${n} ${n > 1 ? pluriel : singulier}`;

  const newsLabel = [
    newCounts.messages > 0 && plural(newCounts.messages, "nouveau message", "nouveaux messages"),
    newCounts.assignments > 0 &&
      plural(newCounts.assignments, "nouvelle consigne", "nouvelles consignes"),
    newCounts.materials > 0 &&
      plural(newCounts.materials, "nouveau document", "nouveaux documents"),
  ]
    .filter(Boolean)
    .join(" · ");

  const today = new Date().toISOString().slice(0, 10);
  const nextSession = allSessions.find((s) => s.session_date >= today);
  const completedCount = allSessions.filter((s) => s.session_date < today).length;
  const totalCount = allSessions.length;
  const progress = totalCount ? (completedCount / totalCount) * 100 : 0;

  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;
  const colorFor = (type: "commun" | "ministere") => (type === "commun" ? INK : ministryColor);

  const calendarSessions = allSessions.map((s) => ({
    id: s.id,
    date: s.session_date,
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location,
    room: s.room,
    teacher: s.teacher?.full_name ?? null,
    course: s.courses?.title ?? null,
    color: colorFor(s.session_type),
  }));

  return (
    <div className="grid items-start gap-[22px] lg:grid-cols-[1fr_330px]">
      <div className="space-y-5">
        {ministryName && (
          <p className="text-sm text-muted">
            Ministère : <span className="font-medium text-foreground">{ministryName}</span>
            {preferredDay && (
              <>
                {" · "}
                <span className="font-medium capitalize text-foreground">{preferredDay}</span>
              </>
            )}
          </p>
        )}

        {totalNew > 0 && (
          <section className="rounded-lg border border-border bg-background px-[18px] py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-[15px] font-medium text-foreground">
                <span className="h-2 w-2 shrink-0 rounded-full bg-m-doctoral" />
                <span>{newsLabel}</span>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={newCounts.messages > 0 ? "/etudiant/messages" : "/etudiant/cours"}
                  className="text-sm font-medium text-link hover:underline"
                >
                  {newCounts.messages > 0 ? "Voir les messages" : "Voir mes cours"}
                </Link>
                <form action={markNotificationsSeen}>
                  <button
                    type="submit"
                    className="text-[13px] text-muted transition hover:text-foreground"
                  >
                    Marquer comme lu
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        <section
          className="rounded-lg border border-border border-l-4 bg-background p-6"
          style={{
            borderLeftColor: nextSession ? colorFor(nextSession.session_type) : "var(--border)",
          }}
        >
          <h2 className="label mb-4 text-xs tracking-[0.18em] text-muted">Prochaine séance</h2>

          {nextSession ? (
            <div className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-title text-[28px] leading-tight text-foreground">
                  {formatSessionDate(nextSession.session_date)}
                </p>
                <SessionTypeBadge type={nextSession.session_type} />
              </div>
              {nextSession.courses && (
                <p className="text-base font-medium text-foreground">
                  {nextSession.courses.title}
                </p>
              )}
              <p className="text-[15px] text-muted">
                {formatTimeRange(nextSession.start_time, nextSession.end_time)} ·{" "}
                {nextSession.location}
                {nextSession.room ? ` · ${nextSession.room}` : ""}
              </p>
              {nextSession.teacher && (
                <p className="text-[15px] text-muted">
                  Intervenant :{" "}
                  <span className="font-semibold text-foreground">
                    {nextSession.teacher.full_name}
                  </span>
                </p>
              )}
              {nextSession.session_type === "commun" && nextSession.description && (
                <p className="text-[15px] text-muted">{nextSession.description}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Aucune séance à venir pour le moment.</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-background p-6">
          <h2 className="label mb-4 text-xs tracking-[0.18em] text-muted">Ma progression</h2>
          {totalCount ? (
            <ProgressRing
              percentage={progress}
              label={`${completedCount} sur ${totalCount} séances effectuées`}
              sublabel="Progression sur votre parcours"
            />
          ) : (
            <p className="text-sm text-muted">
              Votre progression apparaîtra ici une fois inscrit à des séances.
            </p>
          )}
        </section>

        <QuickLinks
          links={[
            { label: "Mes cours", href: "/etudiant/cours", icon: "book" },
            { label: "Mon calendrier", href: "/etudiant/calendrier", icon: "calendar" },
            { label: "Ma formation", href: "/etudiant/palier", icon: "layers" },
            { label: "Ministères", href: "/etudiant/formation", icon: "compass" },
          ]}
        />
      </div>

      <WeekCalendar sessions={calendarSessions} />
    </div>
  );
}
