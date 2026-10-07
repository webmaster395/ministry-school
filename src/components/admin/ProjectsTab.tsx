import Link from "next/link";
import { Check, ChevronRight, Clock } from "lucide-react";
import RejectOpportunityDialog from "@/components/RejectOpportunityDialog";
import {
  datesLabel,
  phaseOf,
  REPORT_DELAY_DAYS,
  reportState,
  type OppPhase,
  type OppRow,
} from "@/lib/data/admin-hub";
import { validateOpportunity } from "@/app/etudiant/services/actions";
import ReportsTab from "@/components/admin/ReportsTab";

export default async function ProjectsTab({
  opps,
  type,
  phase,
  reportFilter,
  today,
}: {
  opps: OppRow[];
  type: string;
  phase: string;
  reportFilter: string;
  today: string;
}) {
  const section = type === "formation" || type === "comptes-rendus" ? type : "projet";
  const kind = type === "formation" ? "formation" : "projet";
  const current: OppPhase = phase === "a_valider" || phase === "plus_tard" || phase === "termine" ? phase : "actuel";
  const list = opps.filter((o) => o.kind === kind && phaseOf(o, today) === current);

  const pendingCount = opps.filter((o) => o.kind === kind && phaseOf(o, today) === "a_valider").length;

  const PHASES: { key: OppPhase; label: string }[] = [
    { key: "actuel", label: "Actuels" },
    { key: "a_valider", label: pendingCount > 0 ? `À valider (${pendingCount})` : "À valider" },
    { key: "plus_tard", label: "Plus tard" },
    { key: "termine", label: "Terminés" },
  ];

  const href = (k: string, p: string) => `/gestion/admin?onglet=projets&type=${k}&phase=${p}`;

  const sectionNav = (
    <nav className="tabbar grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-background p-1 sm:inline-grid sm:w-auto">
      {[
        { key: "projet", label: "Projets" },
        { key: "formation", label: "Formations de service" },
        { key: "comptes-rendus", label: "Comptes rendus" },
      ].map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "comptes-rendus" ? "/gestion/admin?onglet=projets&type=comptes-rendus" : href(tab.key, current)}
          className={`min-w-0 rounded-md px-1.5 py-2 text-center text-[11px] leading-tight transition min-[375px]:text-xs sm:px-4 sm:text-sm ${
            section === tab.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );

  if (section === "comptes-rendus") {
    return <div className="space-y-5">{sectionNav}<ReportsTab opps={opps} filter={reportFilter} today={today} /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {sectionNav}
        <nav className="tabbar grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-background p-1 min-[390px]:grid-cols-4 sm:inline-flex sm:w-auto">
          {PHASES.map((p) => (
            <Link
              key={p.key}
              href={href(kind, p.key)}
              className={`rounded-md px-2 py-2 text-center text-xs transition sm:px-4 sm:text-sm ${
                current === p.key ? "bg-surface font-medium text-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </div>

      {current === "a_valider" && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 text-[14px]">
          <Clock size={18} className="mt-0.5 shrink-0 text-muted" />
          <p className="text-foreground">
            <strong className="font-semibold">Propositions en attente de validation :</strong>{" "}
            <span className="text-muted">
              ces projets ou formations ont été soumis par les responsables et chefs de projet. Ils ne sont pas visibles
              par les étudiants tant qu&apos;ils ne sont pas validés.
            </span>
          </p>
        </div>
      )}

      {list.length ? (
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
          {list.map((o) => {
            const past = o.dates.filter((d) => d.session_date <= today);
            const received = past.filter((d) => reportState(o, d.session_date, today) === "recu").length;
            const manageHref = `/gestion/${o.kind === "projet" ? "projets" : "services"}/${o.id}`;
            return (
              <li key={o.id} className="flex flex-col gap-4 px-4 py-4 transition hover:bg-surface sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
                <Link
                  href={manageHref}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="block text-[17px] font-semibold text-foreground">{o.title}</span>
                    {!o.registration_open && (
                      <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                        En attente de validation
                      </span>
                    )}
                  </div>
                  <span className="block text-sm text-muted">
                    Responsable : {o.organizer_label ?? "Non renseigné"}
                    {o.services?.name ? ` · ${o.services.name}` : ""}
                  </span>
                  <span className="block text-sm text-muted">
                    {datesLabel(o)} · Espace Martin Luther King{o.dates[0]?.room ? ` · ${o.dates[0].room}` : ""}
                  </span>
                </Link>

                <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-start">
                  {!o.registration_open ? (
                    <>
                      <RejectOpportunityDialog id={o.id} title={o.title} kind={o.kind} />
                      <form action={validateOpportunity}>
                        <input type="hidden" name="opportunity_id" value={o.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-on-accent transition hover:bg-[#1b2221]"
                        >
                          <Check size={14} /> Valider et publier
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-right">
                      <span className="block text-[14px] font-semibold text-foreground">Publié</span>
                      <span className="block text-xs text-muted">
                        {received} reçu{received > 1 ? "s" : ""} · {past.length - received} attendu
                        {past.length - received > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  <Link href={manageHref} className="text-muted hover:text-foreground">
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">Rien dans cette catégorie pour le moment.</p>
        </section>
      )}
      <p className="text-xs text-muted">
        Un compte rendu est attendu après chaque date. Il est en retard au-delà de {REPORT_DELAY_DAYS} jours.
      </p>
    </div>
  );
}
