import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatSessionDate } from "@/lib/format";
import { reportState, type OppRow, type ReportState } from "@/lib/data/admin-hub";

const FILTERS: { key: string; label: string }[] = [
  { key: "a_recevoir", label: "À recevoir" },
  { key: "recu", label: "Reçus" },
  { key: "en_retard", label: "En retard" },
  { key: "tous", label: "Tous" },
];

const LABEL: Record<ReportState, string> = { recu: "Reçu", a_recevoir: "À recevoir", en_retard: "En retard" };

export default async function ReportsTab({
  opps,
  filter,
  today,
}: {
  opps: OppRow[];
  filter: string;
  today: string;
}) {
  const supabase = await createClient();
  const active = FILTERS.some((f) => f.key === filter) ? filter : "a_recevoir";

  const rows = opps
    .flatMap((o) =>
      o.dates.map((d) => ({ o, date: d.session_date, state: reportState(o, d.session_date, today) }))
    )
    .filter((r): r is { o: OppRow; date: string; state: ReportState } => r.state !== null)
    .filter((r) => active === "tous" || r.state === active)
    .sort((a, b) => b.date.localeCompare(a.date));

  // Liens temporaires vers les fichiers reçus
  const links = new Map<string, string>();
  await Promise.all(
    rows
      .filter((r) => r.state === "recu")
      .map(async (r) => {
        const file = r.o.reports.get(r.date);
        if (!file) return;
        const { data } = await supabase.storage.from("comptes-rendus").createSignedUrl(file.file_path, 3600);
        if (data?.signedUrl) links.set(`${r.o.id}-${r.date}`, data.signedUrl);
      })
  );

  return (
    <div className="space-y-5">
      <nav className="inline-flex gap-1 rounded-lg border border-border bg-background p-1">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin?onglet=comptes-rendus&filtre=${f.key}`}
            className={`rounded-md px-4 py-2 text-sm transition ${
              active === f.key ? "bg-accent font-medium text-on-accent" : "text-muted hover:text-foreground"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {rows.length ? (
        <ul className="divide-y divide-border-soft overflow-hidden rounded-lg border border-border bg-background">
          {rows.map((r) => {
            const url = links.get(`${r.o.id}-${r.date}`);
            const file = r.o.reports.get(r.date);
            return (
              <li key={`${r.o.id}-${r.date}`} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-foreground">{r.o.title}</span>
                  <span className="block text-sm text-muted">
                    {formatSessionDate(r.date)} · Référent : {r.o.organizer_label ?? "Non renseigné"}
                  </span>
                </span>
                <span className="text-right">
                  <span
                    className={`label rounded-full px-3 py-1 text-[10px] tracking-[0.1em] ${
                      r.state === "en_retard"
                        ? "bg-m-doctoral/[0.12] text-link"
                        : r.state === "recu"
                          ? "bg-surface text-foreground"
                          : "bg-surface text-muted"
                    }`}
                  >
                    {LABEL[r.state]}
                  </span>
                  {url && file && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 flex items-center justify-end gap-1.5 text-sm font-medium text-foreground underline underline-offset-2"
                    >
                      <FileText size={15} strokeWidth={1.7} /> {file.file_name}
                    </a>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <section className="rounded-lg border border-border bg-background p-6">
          <p className="text-[15px] text-muted">Aucun compte rendu dans cette catégorie.</p>
        </section>
      )}
      <p className="text-xs text-muted">
        Les référents déposent leur compte rendu (PDF ou PowerPoint) depuis la page de leur formation ou de leur projet.
      </p>
    </div>
  );
}
