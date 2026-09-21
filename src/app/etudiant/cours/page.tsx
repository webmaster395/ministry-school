import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentAllSessions, getStudentProfile } from "@/lib/data/student";
import { getParcours, parcoursSlugOf } from "@/lib/data/parcours";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK } from "@/lib/ministry";
import { PROMOTION } from "@/lib/promotion";

const COLORS: Record<string, string> = {
  coeur: "var(--f-coeur)",
  caractere: "var(--f-caractere)",
  sensibilite: "var(--f-sensibilite)",
};

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [parcours, sessions, { ministrySlug, ministryName }] = await Promise.all([
    getParcours(supabase),
    getStudentAllSessions(supabase, user!.id),
    getStudentProfile(supabase, user!.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">Promotion {PROMOTION}</p>
        <h2 className="font-title text-[24px] leading-tight text-foreground">
          Votre parcours de cours
        </h2>
      </div>

      <ul className="grid gap-[22px] lg:grid-cols-3">
        {parcours.map((p) => {
          const color = COLORS[p.slug] ?? ministryColor;
          const mine = sessions.filter((s) => parcoursSlugOf(s.track) === p.slug);
          const passed = mine.filter((s) => s.session_date < today).length;
          const next = mine.find((s) => s.session_date >= today);
          const toCome = Math.max(0, p.planned_sessions - passed);

          return (
            <li
              key={p.id}
              className="flex flex-col rounded-lg border border-border border-t-[3px] bg-background p-6"
              style={{ borderTopColor: color }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="label rounded-full px-3 py-1 text-[11px] tracking-[0.1em] text-foreground"
                  style={{ background: `color-mix(in srgb, ${color} 28%, transparent)` }}
                >
                  {p.title}
                </span>
                <span className="text-[13px] text-muted">{p.planned_sessions} sessions</span>
              </div>

              <h3 className="font-title mt-5 text-[22px] leading-tight text-foreground">
                {p.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.description}</p>

              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border-soft pt-5">
                <Info label="Période" value={p.period_label} />
                <Info label="Horaire habituel" value={p.schedule_label} />
                <Info
                  label="Prochaine session"
                  value={next ? formatSessionDate(next.session_date) : "Date à définir"}
                />
                <Info
                  label="Sessions"
                  value={`${passed} passée${passed > 1 ? "s" : ""} · ${toCome} à venir`}
                />
              </dl>

              {p.note && <p className="mt-5 text-[15px] text-muted">{p.note}</p>}

              <div className="mt-auto pt-5">
                {p.slug === "sensibilite" && ministryName && (
                  <p className="mb-3 rounded-md bg-surface px-4 py-3 text-[15px] font-semibold text-foreground">
                    Votre parcours : {ministryName}
                  </p>
                )}
                <Link
                  href={`/etudiant/cours/parcours/${p.slug}`}
                  className="label flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
                >
                  Voir les cours →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label text-[11px] tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1 text-[15px] text-foreground">{value}</dd>
    </div>
  );
}
