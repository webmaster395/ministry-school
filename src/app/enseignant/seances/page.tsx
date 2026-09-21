import { createClient } from "@/lib/supabase/server";
import { getAllSessions } from "@/lib/data/admin";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionEditForm from "@/components/SessionEditForm";

export default async function TeacherSessionsPage() {
  const supabase = await createClient();
  const sessions = await getAllSessions(supabase);
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = sessions.filter((s) => s.session_date >= today);
  const past = sessions.filter((s) => s.session_date < today);

  return (
    <div className="space-y-5">
      <p className="text-[15px] text-muted">
        En cas de changement (date, horaire, lieu, titre ou intervenant), corrigez la séance ici :
        les étudiants voient la modification immédiatement.
      </p>

      <List title="Séances à venir" sessions={upcoming} empty="Aucune séance à venir." />
      {past.length > 0 && <List title="Séances passées" sessions={past} empty="" />}
    </div>
  );
}

function List({
  title,
  sessions,
  empty,
}: {
  title: string;
  sessions: Awaited<ReturnType<typeof getAllSessions>>;
  empty: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <h2 className="label border-b border-border-soft px-6 py-4 text-xs tracking-[0.18em] text-muted">
        {title}
      </h2>
      {sessions.length ? (
        <ul className="divide-y divide-border-soft">
          {sessions.map((s) => (
            <li key={s.id} className="px-6 py-4">
              <p className="font-title text-[19px] text-foreground">
                {formatSessionDate(s.session_date)}
                {s.track && <span className="ml-3 text-sm text-muted">{s.track}</span>}
              </p>
              <p className="mt-0.5 text-[15px] font-medium text-foreground">
                {s.courses?.title ?? s.description ?? "Séance"}
              </p>
              <p className="text-sm text-muted">
                {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                {s.room ? ` · ${s.room}` : ""}
                {s.speaker_name ?? s.teacher?.full_name
                  ? ` · ${s.speaker_name ?? s.teacher?.full_name}`
                  : ""}
              </p>
              <SessionEditForm session={{ ...s, teacherName: s.teacher?.full_name }} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-6 py-5 text-sm text-muted">{empty}</p>
      )}
    </section>
  );
}
