import { createClient } from "@/lib/supabase/server";
import { getCommonSessions, getEnrollmentCounts, getTeacherSessions } from "@/lib/data/teacher";
import { formatSessionDate, formatTimeRange } from "@/lib/format";

export default async function TeacherCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [allSessions, commonSessions] = await Promise.all([
    getTeacherSessions(supabase, user!.id),
    getCommonSessions(supabase),
  ]);
  const counts = await getEnrollmentCounts(supabase, allSessions);

  return (
    <>
      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">MES SÉANCES</h2>
        {allSessions.length ? (
          <ul className="divide-y divide-border">
            {allSessions.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-foreground">{formatSessionDate(s.session_date)}</span>
                <span className="text-muted">
                  {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                  {s.room ? ` · ${s.room}` : ""} · {counts.get(s.id) ?? 0} inscrit(s)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Aucune séance assignée.</p>
        )}
      </section>

      {commonSessions.length > 0 && (
        <section className="rounded-lg border border-border bg-background p-6">
          <h2 className="mb-1 text-sm font-medium tracking-wide text-muted">TRONC COMMUN</h2>
          <p className="mb-4 text-sm text-muted">
            Enseignement commun à tous les ministères. Ce samedi 19 septembre : <strong>Paul Goulet — Le caractère</strong> à <strong>MLK 2</strong> (MLK Studio).
          </p>
          <ul className="divide-y divide-border">
            {commonSessions.map((s) => (
              <li key={s.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-foreground">{formatSessionDate(s.session_date)}</span>
                <span className="text-muted">
                  {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
