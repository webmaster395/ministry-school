import { createClient } from "@/lib/supabase/server";
import { getStudentProfile, getStudentSessions } from "@/lib/data/student";
import { formatSessionDate, formatTimeRange } from "@/lib/format";
import { getMinistry, INK } from "@/lib/ministry";

export default async function StudentCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [sessions, { ministrySlug, ministryName }] = await Promise.all([
    getStudentSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
  ]);
  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-background">
      <h2 className="label border-b border-border-soft px-6 py-4 text-xs tracking-[0.18em] text-muted">
        Séances à venir
      </h2>

      {sessions.length ? (
        <ul className="divide-y divide-border-soft">
          {sessions.map((s) => {
            const isCommon = s.session_type === "commun";
            return (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-6 py-[18px] md:flex-row md:items-center md:gap-5"
              >
                <span
                  className="hidden h-11 w-1 shrink-0 rounded-sm md:block"
                  style={{ background: isCommon ? INK : ministryColor }}
                  aria-hidden="true"
                />

                <div className="md:w-[210px] md:shrink-0">
                  <p className="font-title text-[19px] leading-tight text-foreground">
                    {formatSessionDate(s.session_date)}
                  </p>
                  <p className="label text-[11px] tracking-[0.14em] text-muted">
                    {isCommon ? "Tronc commun" : (ministryName ?? "Ministère")}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-foreground">
                    {s.courses?.title ?? "Séance"}
                  </p>
                  <p className="text-sm text-muted">
                    {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                    {s.room ? ` · ${s.room}` : ""}
                  </p>
                </div>

                {s.teacher && (
                  <p className="text-sm text-muted md:text-right">
                    Intervenant :{" "}
                    <span className="font-semibold text-foreground">{s.teacher.full_name}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-6 py-5 text-sm text-muted">Rien de programmé.</p>
      )}
    </section>
  );
}
