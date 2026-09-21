import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStudentAssignments,
  getStudentCourse,
  getStudentMaterials,
} from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import MaterialLink from "@/components/MaterialLink";

function isRecentlyShared(visibleAt: string) {
  const diffMs = Date.now() - new Date(visibleAt).getTime();
  return diffMs >= 0 && diffMs < 1000 * 60 * 60 * 3;
}

export default async function StudentCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const course = await getStudentCourse(supabase, user!.id, courseId);
  if (!course) notFound();

  const sessionIds = course.sessions.map((s) => s.id);
  const [materials, assignments] = await Promise.all([
    getStudentMaterials(supabase, sessionIds),
    getStudentAssignments(supabase, sessionIds),
  ]);

  const objectives = (course.objectives ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <>
      <div>
        <Link href="/etudiant/cours" className="text-sm text-muted hover:text-foreground">
          ← Mes cours
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-background p-6">
        <h1 className="font-title text-[24px] leading-tight text-foreground">{course.title}</h1>
        {course.description && <p className="mt-2 text-sm text-muted">{course.description}</p>}

        {objectives.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 label text-xs tracking-[0.18em] text-muted">OBJECTIFS</h2>
            <ul className="space-y-1.5">
              {objectives.map((o) => (
                <li key={o} className="flex gap-2 text-sm text-foreground">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">SÉANCES</h2>
        <ul className="space-y-5">
          {course.sessions.map((s) => {
            const sessionMaterials = materials.filter((m) => m.session_id === s.id);
            const sessionAssignments = assignments.filter((a) => a.session_id === s.id);
            const sessionObjectives = (s.objectives ?? "")
              .split("\n")
              .map((l) => l.trim())
              .filter(Boolean);

            return (
              <li
                key={s.id}
                className="rounded-md border border-border p-4 last:mb-0"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-foreground">
                    {formatSessionDate(s.session_date)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                    {s.room ? ` · ${s.room}` : ""}
                  </p>
                </div>
                {s.teacher && (
                  <p className="mt-1 text-sm text-muted">Intervenant : {s.teacher.full_name}</p>
                )}

                {sessionObjectives.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 label text-[11px] tracking-[0.14em] text-muted">
                      Objectifs de la séance
                    </p>
                    <ul className="space-y-1">
                      {sessionObjectives.map((o) => (
                        <li key={o} className="flex gap-2 text-sm text-foreground/80">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3">
                  <p className="mb-1 label text-[11px] tracking-[0.14em] text-muted">
                    Supports
                  </p>
                  {sessionMaterials.length ? (
                    <ul className="space-y-2">
                      {sessionMaterials.map((m) => (
                        <li key={m.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <MaterialLink title={m.title} url={m.link_url ?? m.file_url ?? null} />
                          {isRecentlyShared(m.visible_at) && (
                            <span className="flex items-center gap-1.5 rounded-full border border-foreground/20 bg-foreground/[0.06] px-2 py-0.5 text-xs text-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-m-doctoral" />
                              Partagé à l&apos;instant
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">
                      Disponibles après la séance.
                    </p>
                  )}
                </div>

                {sessionAssignments.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 label text-[11px] tracking-[0.14em] text-muted">
                      Consignes
                    </p>
                    <ul className="space-y-1">
                      {sessionAssignments.map((a) => (
                        <li key={a.id} className="text-sm text-foreground">
                          {a.instructions}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
