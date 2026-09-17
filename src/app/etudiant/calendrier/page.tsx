import { createClient } from "@/lib/supabase/server";
import { getStudentSessions } from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";

export default async function StudentCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sessions = await getStudentSessions(supabase, user!.id);

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-4 text-sm font-medium tracking-wide text-muted">SÉANCES À VENIR</h2>
      {sessions.length ? (
        <ul className="divide-y divide-border">
          {sessions.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span className="flex flex-wrap items-center gap-2 text-foreground">
                {formatSessionDate(s.session_date)}
                <SessionTypeBadge type={s.session_type} />
                {s.courses && <span className="text-muted">· {s.courses.title}</span>}
              </span>
              <span className="text-muted">
                {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                {s.teacher ? (
                  <>
                    {" · "}Intervenant :{" "}
                    <strong className="font-medium text-foreground">{s.teacher.full_name}</strong>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Rien de programmé.</p>
      )}
    </section>
  );
}
