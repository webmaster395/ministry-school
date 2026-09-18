import { createClient } from "@/lib/supabase/server";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import SessionTypeBadge from "@/components/SessionTypeBadge";

type ProgrammeSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
  session_type: "commun" | "ministere";
  ministries: { name: string } | null;
  teacher: { full_name: string } | null;
};

type ProgrammeMaterial = {
  id: string;
  title: string;
  session_id: string;
};

export default async function TeacherProgrammePage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  const { data: sessions } = await supabase
    .from("sessions")
    .select(
      "id, session_date, start_time, end_time, location, session_type, ministries(name), teacher:profiles!sessions_teacher_id_fkey(full_name)"
    )
    .lte("session_date", today)
    .order("session_date", { ascending: false });

  const pastSessions = (sessions ?? []) as unknown as ProgrammeSession[];
  const sessionIds = pastSessions.map((s) => s.id);

  const { data: materials } = sessionIds.length
    ? await supabase.from("materials").select("id, title, session_id").in("session_id", sessionIds)
    : { data: [] };

  const materialsBySession = new Map<string, ProgrammeMaterial[]>();
  for (const m of (materials ?? []) as ProgrammeMaterial[]) {
    const list = materialsBySession.get(m.session_id) ?? [];
    list.push(m);
    materialsBySession.set(m.session_id, list);
  }

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-1 label text-xs tracking-[0.18em] text-muted">VUE PROMO</h2>
      <p className="mb-6 text-sm text-muted">
        Ce que la promotion a déjà vu, tous ministères confondus — pour éviter les redites entre
        intervenants.
      </p>

      {pastSessions.length ? (
        <ul className="divide-y divide-border">
          {pastSessions.map((s) => {
            const sessionMaterials = materialsBySession.get(s.id) ?? [];
            return (
              <li key={s.id} className="py-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {formatSessionDate(s.session_date)}
                  </span>
                  <SessionTypeBadge type={s.session_type} />
                  {s.ministries && (
                    <span className="text-sm text-muted">· {s.ministries.name}</span>
                  )}
                </div>
                <p className="mb-1 text-sm text-muted">
                  {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                  {s.teacher ? ` · ${s.teacher.full_name}` : ""}
                </p>
                {sessionMaterials.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {sessionMaterials.map((m) => (
                      <li key={m.id} className="text-sm text-foreground/80">
                        · {m.title}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucune séance passée pour le moment.</p>
      )}
    </section>
  );
}
