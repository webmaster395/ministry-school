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

export default function ProjectsTab({
  opps,
  type,
  phase,
  today,
}: {
  opps: OppRow[];
  type: string;
  phase: string;
  today: string;
}) {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex gap-1 rounded-lg border border-border bg-background p-1">
          {[
            { key: "projet", label: "Projets" },
            { key: "formation", label: "Formations de service" },
          ].map((t) => (
            <Link
              key={t.key}
              href={href(t.key, current)}
              className={`rounded-md px-4 py-2 text-sm transition ${
                kind === t.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <nav className="inline-flex gap-1 rounded-lg border border-border bg-background p-1">
          {PHASES.map((p) => (
            <Link
              key={p.key}
              href={href(kind, p.key)}
              className={`rounded-md px-4 py-2 text-sm transition ${
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
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface">
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
                    {datesLabel(o)} · MLK Studio{o.dates[0]?.room ? ` · ${o.dates[0].room}` : ""}
                  </span>
                </Link>

                <div className="flex items-center gap-2">
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
