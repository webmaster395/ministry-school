import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStudentAllSessions } from "@/lib/data/student";
import { getParcours, parcoursSlugOf } from "@/lib/data/parcours";
import { formatSessionDate, formatTimeRange } from "@/lib/format";

export default async function ParcoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [parcours, sessions] = await Promise.all([
    getParcours(supabase),
    getStudentAllSessions(supabase, user!.id),
  ]);
  const p = parcours.find((x) => x.slug === slug);
  if (!p) notFound();

  const mine = sessions.filter((s) => parcoursSlugOf(s.track) === slug);

  return (
    <div className="space-y-5">
      <Link href="/etudiant/cours" className="text-sm text-muted hover:text-foreground">
        ← Mes cours
      </Link>

      <section className="rounded-lg border border-border bg-background p-6">
        <h2 className="font-title text-[24px] leading-tight text-foreground">{p.title}</h2>
        <p className="mt-2 text-[15px] text-muted">{p.description}</p>
        <p className="mt-3 text-sm text-muted">
          {p.period_label} · {p.schedule_label} · {p.planned_sessions} sessions
        </p>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-background">
        <h3 className="label border-b border-border-soft px-6 py-4 text-xs tracking-[0.18em] text-muted">
          Sessions
        </h3>
        {mine.length ? (
          <ul className="divide-y divide-border-soft">
            {mine.map((s) => (
              <li key={s.id} className="px-6 py-4">
                <p className="font-title text-[19px] text-foreground">
                  {formatSessionDate(s.session_date)}
                </p>
                <p className="mt-0.5 text-[15px] font-medium text-foreground">
                  {s.courses?.title ?? s.description}
                </p>
                <p className="text-sm text-muted">
                  {formatTimeRange(s.start_time, s.end_time)} · {s.location}
                  {s.teacher ? ` · Avec ${s.teacher.full_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-6 py-5 text-sm text-muted">Dates à définir.</p>
        )}
      </section>
    </div>
  );
}
