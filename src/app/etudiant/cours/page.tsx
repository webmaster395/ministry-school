import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentAllSessions, getStudentProfile } from "@/lib/data/student";
import { getParcours, parcoursSlugOf } from "@/lib/data/parcours";
import { formatSessionDate } from "@/lib/format";
import { getMinistry, INK } from "@/lib/ministry";
import { PROMOTION } from "@/lib/promotion";
import { getViewer } from "@/lib/data/viewer";
import { redirect } from "next/navigation";

const COLORS: Record<string, string> = {
  coeur: "var(--f-coeur)",
  caractere: "var(--f-caractere)",
  sensibilite: "var(--f-sensibilite)",
};

export default async function StudentCoursesPage() {
  const supabase = await createClient();
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [parcours, sessions, { ministrySlug }] = await Promise.all([
    getParcours(supabase),
    getStudentAllSessions(supabase, viewer.id),
    getStudentProfile(supabase, viewer.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const ministryColor = getMinistry(ministrySlug)?.color ?? INK;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <p className="text-sm text-muted">Promotion {PROMOTION}</p>
        <h2 className="font-title text-[24px] leading-tight text-foreground">
          Votre parcours de cours
        </h2>
      </div>

      <nav
        aria-label="Accès rapide aux parcours"
        className="-mx-4 flex max-w-5xl gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {parcours.map((p) => {
          const color = COLORS[p.slug] ?? ministryColor;

          return (
            <a
              key={p.id}
              href={`#parcours-${p.slug}`}
              className="inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: `color-mix(in srgb, ${color} 65%, transparent)`,
                background: `color-mix(in srgb, ${color} 24%, white)`,
                outlineColor: color,
              }}
            >
              {p.title}
            </a>
          );
        })}
      </nav>

      <ul className="grid max-w-5xl gap-4 sm:gap-[22px] md:grid-cols-2">
        {parcours.map((p) => {
          const color = COLORS[p.slug] ?? ministryColor;
          const mine = sessions.filter((s) => parcoursSlugOf(s.track) === p.slug);
          const passed = mine.filter((s) => s.session_date < today).length;
          const next = mine.find((s) => s.session_date >= today);
          const toCome = Math.max(0, p.planned_sessions - passed);
          // Sensibilité ministérielle : pas encore ouverte, bloc grisé et non cliquable
          const locked = p.slug === "sensibilite";

          return (
            <li
              key={p.id}
              id={`parcours-${p.slug}`}
              suppressHydrationWarning
              data-locked={locked || undefined}
              className={`scroll-mt-28 flex flex-col rounded-lg border border-border border-t-[3px] bg-background p-4 sm:p-6 ${
                locked ? "pointer-events-none select-none opacity-55 grayscale" : ""
              }`}
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

              <h3 className="font-title mt-4 text-[21px] leading-tight text-foreground sm:mt-5 sm:text-[22px]">
                {p.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted sm:text-[15px]">{p.description}</p>

              {!locked && (
              <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-border-soft pt-4 sm:mt-5 sm:gap-x-4 sm:gap-y-4 sm:pt-5">
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
              )}

              {p.note && <p className="mt-5 text-[15px] text-muted">{p.note}</p>}

              <div className="mt-auto pt-4 sm:pt-5">
                {locked ? (
                  <p className="rounded-md bg-surface px-4 py-3 text-center text-[15px] font-semibold text-foreground">
                    Votre parcours ministère sera bientôt disponible.
                  </p>
                ) : (
                  <Link
                    href={`/etudiant/cours/parcours/${p.slug}`}
                    className="label flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-xs tracking-[0.12em] text-on-accent hover:bg-[#1b2221]"
                  >
                    Voir les cours →
                  </Link>
                )}
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
