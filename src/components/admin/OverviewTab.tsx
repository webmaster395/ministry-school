import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getEnrollmentBreakdown } from "@/lib/data/admin";
import { getMinistries } from "@/lib/data/admin";
import { buildRows, getMinistrySessions } from "@/lib/data/pilotage";
import { phaseOf, reportState, type Member, type OppRow, type ProgramEntry } from "@/lib/data/admin-hub";
import { formatSessionDate } from "@/lib/format";
import BarChart from "@/components/BarChart";
import { DayList } from "@/components/admin/ProgramTab";

export default async function OverviewTab({
  members,
  opps,
  program,
  today,
}: {
  members: Member[];
  opps: OppRow[];
  program: ProgramEntry[];
  today: string;
}) {
  const supabase = await createClient();
  const [breakdown, ministries] = await Promise.all([getEnrollmentBreakdown(supabase), getMinistries(supabase)]);

  const students = members.filter((m) => m.role === "student");
  const monthStart = today.slice(0, 7);
  const newThisMonth = members.filter((m) => m.created_at.slice(0, 7) === monthStart).length;
  const pending = students.filter((m) => !m.email_confirmed && !m.deactivated).length;

  const nextDate = program.find((e) => e.date >= today)?.date;
  const nextDay = program.filter((e) => e.date === nextDate);

  const count = (kind: "projet" | "formation", finished: boolean) =>
    opps.filter((o) => o.kind === kind && (phaseOf(o, today) === "termine") === finished).length;

  const expected = opps.reduce(
    (n, o) =>
      n +
      o.dates.filter((d) => {
        const s = reportState(o, d.session_date, today);
        return s === "a_recevoir" || s === "en_retard";
      }).length,
    0
  );

  // Préparation du programme, ministère par ministère
  const prep = await Promise.all(
    ministries.map(async (m) => {
      const rows = await buildRows(supabase, await getMinistrySessions(supabase, m.id), "pilotage");
      const done = rows.reduce((n, r) => n + r.progress.requiredDone, 0);
      const total = rows.reduce((n, r) => n + r.progress.requiredTotal, 0);
      return { m, sessions: rows.length, percent: total ? Math.round((done / total) * 100) : null };
    })
  );

  const cards: { value: number | string; label: string; attention?: boolean; sub?: string }[] = [
    { value: students.length, label: "Membres inscrits" },
    { value: newThisMonth, label: "Nouveaux comptes ce mois" },
    { value: pending, label: "En attente de confirmation", attention: pending > 0 },
    {
      value: nextDate ? formatSessionDate(nextDate).replace(/^\w+ /, "") : "—",
      label: "Prochaine journée",
    },
    { value: count("projet", false), label: "Projets actuels", sub: `${count("projet", true)} terminés` },
    {
      value: count("formation", false),
      label: "Formations de service actuelles",
      sub: `${count("formation", true)} terminées`,
    },
    { value: expected, label: "Comptes rendus attendus", attention: expected > 0 },
    { value: members.filter((m) => m.deactivated).length, label: "Comptes désactivés" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid overflow-hidden rounded-lg border border-border bg-background sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div
            key={c.label}
            className={`border-border-soft p-6 ${i % 4 !== 3 ? "lg:border-r" : ""} ${i < 4 ? "border-b" : ""} ${
              c.attention ? "bg-m-doctoral/[0.05]" : ""
            }`}
          >
            <p className="font-title text-[30px] leading-none text-foreground">{c.value}</p>
            <p className={`mt-3 text-sm ${c.attention ? "text-link" : "text-muted"}`}>
              {c.label}
              {c.sub ? ` · ${c.sub}` : ""}
            </p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-title text-[24px] text-foreground">Programme de la prochaine journée</h3>
            {nextDate && <p className="text-sm text-muted">{formatSessionDate(nextDate)}</p>}
          </div>
          <Link href="/gestion/admin?onglet=programme" className="text-sm font-medium text-foreground underline underline-offset-2">
            Voir tout le programme
          </Link>
        </div>
        {nextDay.length ? (
          <DayList entries={nextDay} />
        ) : (
          <section className="rounded-lg border border-border bg-background p-6">
            <p className="text-[15px] text-muted">Aucune journée à venir.</p>
          </section>
        )}
      </section>

      <section className="rounded-lg border border-border bg-background p-6">
        <h3 className="font-title text-[22px] text-foreground">Préparation des cours par ministère</h3>
        <p className="mt-1 text-sm text-muted">Éléments obligatoires renseignés par les pasteurs et leurs secrétaires.</p>
        <ul className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {prep.map(({ m, sessions, percent }) => (
            <li key={m.id}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground">{m.name}</span>
                <span className="text-muted">{percent === null ? "Aucune séance" : `${percent} % · ${sessions} séances`}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-accent" style={{ width: `${percent ?? 0}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <BarChart
        title="Inscrits par ministère"
        subtitle="Nombre d'étudiants ayant choisi chaque ministère."
        data={breakdown.byMinistry.map((m) => ({ label: m.name, value: m.count, slug: m.slug }))}
      />
      <BarChart
        title="Répartition par jour"
        subtitle="Jour de cours choisi par les étudiants."
        data={breakdown.byDay.map((d) => ({ label: d.day, value: d.count }))}
      />
    </div>
  );
}
