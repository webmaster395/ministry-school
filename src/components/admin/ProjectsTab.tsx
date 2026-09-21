import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  datesLabel,
  phaseOf,
  REPORT_DELAY_DAYS,
  reportState,
  type OppPhase,
  type OppRow,
} from "@/lib/data/admin-hub";

const PHASES: { key: OppPhase; label: string }[] = [
  { key: "actuel", label: "Actuels" },
  { key: "plus_tard", label: "Plus tard" },
  { key: "termine", label: "Terminés" },
];

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
  const current: OppPhase = phase === "plus_tard" || phase === "termine" ? phase : "actuel";
  const list = opps.filter((o) => o.kind === kind && phaseOf(o, today) === current);

  const href = (k: string, p: string) => `/admin?onglet=projets&type=${k}&phase=${p}`;

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

      {list.length ? (
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
          {list.map((o) => {
            const past = o.dates.filter((d) => d.session_date <= today);
            const received = past.filter((d) => reportState(o, d.session_date, today) === "recu").length;
            return (
              <li key={o.id}>
                <Link
                  href={`/etudiant/services/${o.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-semibold text-foreground">{o.title}</span>
                    <span className="block text-sm text-muted">
                      Référent : {o.organizer_label ?? "Non renseigné"}
                      {o.services?.name ? ` · ${o.services.name}` : ""}
                    </span>
                    <span className="block text-sm text-muted">
                      {datesLabel(o)} · MLK Studio{o.dates[0]?.room ? ` · ${o.dates[0].room}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[15px] font-semibold text-foreground">
                      {o.registration_open ? "Publié" : "Inscriptions à venir"}
                    </span>
                    <span className="block text-xs text-muted">
                      {received} reçu{received > 1 ? "s" : ""} · {past.length - received} attendu
                      {past.length - received > 1 ? "s" : ""}
                    </span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" />
                </Link>
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
