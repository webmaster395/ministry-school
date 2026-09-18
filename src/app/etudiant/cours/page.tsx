import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentCourses, getStudentProfile } from "@/lib/data/student";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK } from "@/lib/ministry";

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [courses, { ministrySlug }] = await Promise.all([
    getStudentCourses(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;

  if (!courses.length) {
    return (
      <section className="rounded-lg border border-border bg-background p-6">
        <p className="text-[15px] text-muted">
          Aucun cours pour le moment. Vos cours apparaîtront ici une fois le programme de votre
          ministère publié.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[15px] text-muted">
        Ouvrez un cours pour accéder à ses objectifs, ses supports et ses consignes.
      </p>

      <ul className="space-y-4">
        {courses.map((c) => {
          const upcomingSessions = c.sessions.filter((s) => s.session_date >= today);
          const nextSession = upcomingSessions[0];
          const finished = upcomingSessions.length === 0;
          const isCommon = c.sessions.every((s) => s.session_type === "commun");

          return (
            <li key={c.id}>
              <Link
                href={`/etudiant/cours/${c.id}`}
                className={`block rounded-lg border border-l-4 bg-background p-6 transition hover:border-[#27302f] ${
                  finished ? "border-border opacity-70" : "border-border"
                }`}
                style={{
                  borderLeftColor: finished ? "var(--border)" : isCommon ? INK : ministryColor,
                }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-title text-[22px] leading-tight text-foreground">
                    {c.title}
                  </h2>
                  <span className="label text-xs tracking-[0.1em] text-muted">
                    {c.sessions.length} séance{c.sessions.length > 1 ? "s" : ""}
                    {upcomingSessions.length > 0 && ` · ${upcomingSessions.length} à venir`}
                  </span>
                </div>
                {c.description && (
                  <p className="mt-2 text-[15px] text-muted">{c.description}</p>
                )}
                <p className="mt-3 text-sm text-foreground">
                  {nextSession ? (
                    <>
                      Prochaine séance :{" "}
                      <span className="font-semibold">
                        {formatSessionDate(nextSession.session_date)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Toutes les séances de ce cours ont eu lieu.</span>
                  )}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
