import Link from "next/link";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getEnrollmentBreakdown } from "@/lib/data/admin";
import { getMinistries } from "@/lib/data/admin";
import { buildRows, getMinistrySessions } from "@/lib/data/pilotage";
import { phaseOf, reportState, type Member, type OppRow, type ProgramEntry } from "@/lib/data/admin-hub";
import { formatSessionDate } from "@/lib/format";
import { accountsByTrainingCycle } from "@/lib/training-cycle-stats";
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

  // Pour le moment, aucune distinction : administrateurs, formateurs et étudiants sont comptés ensemble
  const students = members;
  const trainingDates = [...new Set(program.filter((entry) => entry.kind === "course").map((entry) => entry.date))].sort();
  const cycles = accountsByTrainingCycle(members, trainingDates);
  const currentCycle = cycles.find((cycle) => cycle.date >= today) ?? cycles.at(-1);
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

  const toValidate = opps.filter((o) => !o.registration_open && phaseOf(o, today) !== "termine").length;
  const currentProjects = count("projet", false);
  const finishedProjects = count("projet", true);
  const currentServiceTrainings = count("formation", false);
  const finishedServiceTrainings = count("formation", true);

  const genderSub =
    breakdown.byGender.men > 0 || breakdown.byGender.women > 0
      ? `${breakdown.byGender.men} homme${breakdown.byGender.men > 1 ? "s" : ""} · ${breakdown.byGender.women} femme${breakdown.byGender.women > 1 ? "s" : ""}`
      : undefined;

  const cards: { value: number | string; label: string; attention?: boolean; sub?: string }[] = [
    { value: students.length, label: "Membres inscrits", sub: genderSub },
    ...((currentCycle?.value ?? 0) > 0 ? [{ value: currentCycle!.value, label: `Nouveaux comptes · ${currentCycle!.label}` }] : []),
    ...(pending > 0 ? [{ value: pending, label: "En attente de confirmation", attention: true }] : []),
    {
      value: nextDate ? formatSessionDate(nextDate).replace(/^\w+ /, "") : "—",
      label: "Prochaine journée",
    },
    ...(currentProjects > 0 || finishedProjects > 0 ? [{ value: currentProjects, label: "Projets actuels", sub: `${finishedProjects} terminés` }] : []),
    ...(currentServiceTrainings > 0 || finishedServiceTrainings > 0 ? [{
      value: currentServiceTrainings,
      label: "Formations de service actuelles",
      sub: `${finishedServiceTrainings} terminées`,
    }] : []),
    ...(toValidate > 0 ? [{ value: toValidate, label: "Propositions à valider", attention: true }] : []),
    ...(expected > 0 ? [{ value: expected, label: "Comptes rendus attendus", attention: true }] : []),
  ];

  return (
    <div className="space-y-6">
      {toValidate > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 text-[14px]">
          <div className="flex items-start gap-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <p className="font-semibold text-foreground">
                {toValidate} proposition{toValidate > 1 ? "s" : ""} en attente de validation
              </p>
              <p className="mt-0.5 text-[13px] text-muted">
                Des projets ou formations ont été soumis et nécessitent votre approbation avant d&apos;être publiés.
              </p>
            </div>
          </div>
          <Link
            href="/gestion/admin?onglet=projets&phase=a_valider"
            className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-on-accent transition hover:bg-[#1b2221]"
          >
            Examiner et valider →
          </Link>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-lg border border-border bg-background p-6 ${
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-background p-4 sm:p-6">
          <h2 className="label text-xs tracking-[0.18em] text-muted">Implication à MLK</h2>
          <p className="mt-1 text-sm text-muted">Clique sur une ligne pour afficher les personnes. Un seul statut est attribué à chaque membre.</p>
          <ul className="mt-5 divide-y divide-border-soft">
            {[
              ["Aucun", breakdown.engagement.none, "aucun"],
              ["Équipiers", breakdown.engagement.equipiers, "equipier"],
              ["Managers et adjoints", breakdown.engagement.managers, "manager"],
              ["Collaborateurs", breakdown.engagement.collaborators, "collaborateur"],
              ["Non renseigné", breakdown.engagement.unassigned, "non_renseigne"],
            ].map(([label, value, filter]) => (
              <li key={label as string}>
                <Link href={`/gestion/admin?onglet=membres&implication=${filter}`} className="group flex items-center justify-between gap-4 py-3 text-sm transition hover:pl-1">
                  <span className="text-foreground group-hover:underline group-hover:underline-offset-4">{label}</span>
                  <span className="font-title text-[19px] tabular-nums text-foreground">{value}<span className="ml-2 text-sm font-sans text-muted" aria-hidden="true">→</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <BarChart
          title="Répartition par genre"
          subtitle="Nombre d'hommes et de femmes inscrits."
          data={[
            { label: "Hommes", value: breakdown.byGender.men, href: "/gestion/admin?onglet=membres&genre=homme" },
            { label: "Femmes", value: breakdown.byGender.women, href: "/gestion/admin?onglet=membres&genre=femme" },
            ...(breakdown.byGender.unassigned > 0
              ? [{ label: "Non renseigné", value: breakdown.byGender.unassigned, href: "/gestion/admin?onglet=membres&genre=non_renseigne" }]
              : []),
          ]}
        />
      </div>

      <BarChart
        title="Inscrits par ministère"
        subtitle="Nombre d'étudiants ayant choisi chaque ministère."
        data={breakdown.byMinistry.map((m) => ({
          label: m.name,
          value: m.count,
          slug: m.slug,
          fallbackIcon: m.slug ? undefined : "🤔",
          href: m.slug ? `/gestion/admin?onglet=membres&sens=${m.slug}` : "/gestion/admin?onglet=membres&sens=non_renseignee",
        }))}
      />
    </div>
  );
}
