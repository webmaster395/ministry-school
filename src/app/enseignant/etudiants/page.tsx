import { createClient } from "@/lib/supabase/server";
import { getTeacherSessions, getTeacherStudents } from "@/lib/data/teacher";
import { formatSessionDate } from "@/lib/format";

export default async function TeacherStudentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allSessions = await getTeacherSessions(supabase, user!.id);
  const sessionIds = allSessions.map((s) => s.id);
  const enrolled = await getTeacherStudents(supabase, sessionIds);

  return (
    <section className="rounded-lg border border-border bg-background p-6">
      <h2 className="mb-4 label text-xs tracking-[0.18em] text-muted">MES ÉTUDIANTS</h2>

      {allSessions.length === 0 ? (
        <p className="text-sm text-muted">Aucune séance assignée pour le moment.</p>
      ) : (
        <div className="space-y-6">
          {allSessions.map((s) => {
            const students = enrolled.filter((e) => e.session_id === s.id);
            return (
              <div key={s.id}>
                <p className="mb-2 text-sm font-medium text-foreground">
                  {formatSessionDate(s.session_date)} · {s.location}
                </p>
                {students.length ? (
                  <ul className="divide-y divide-border">
                    {students.map((st) => (
                      <li key={st.id} className="py-2 text-sm text-muted">
                        {st.full_name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Aucun étudiant inscrit.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
