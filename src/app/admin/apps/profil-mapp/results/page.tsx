import Link from "next/link";
import { notFound } from "next/navigation";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { getCatalogAppBySlug } from "@/lib/apps/catalog";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type AttemptRow = {
  attempt_id: string;
  participant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  attempt_status: string;
  started_at: string;
  completed_at: string | null;
  primary_code: string | null;
  secondary_code: string | null;
  pressure_code: string | null;
  total_count: number;
};

const profileNames: Record<string, string> = { D: "Conquérant", I: "Communiquant", S: "Facilitateur", C: "Analyste" };
const pageSize = 50;

export default async function ProfilMappResultsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string; status?: string }> }) {
  const app = await getCatalogAppBySlug("profil-mapp");
  if (!app || app.archivedAt) notFound();
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const search = String(query.q ?? "").trim().slice(0, 120);
  const status = ["in_progress", "finalizing", "completed", "abandoned"].includes(query.status ?? "") ? query.status! : "";
  const { data, error } = await createServiceClient().schema("mapp").rpc("admin_list_attempts_page", {
    p_offset: (page - 1) * pageSize,
    p_limit: pageSize,
    p_search: search || null,
    p_status: status || null,
  });
  if (error) throw new Error(`Résultats MAPP indisponibles : ${error.message}`);
  const rows = (data ?? []) as AttemptRow[];
  const total = Number(rows[0]?.total_count ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const hrefForPage = (target: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    params.set("page", String(target));
    return `/admin/apps/profil-mapp/results?${params.toString()}`;
  };

  return <AppsStudioShell active="results" appTab="results" appSlug={app.slug} appName={app.name} appIconUrl={app.iconUrl} hasResults hasEditor>
    <StudioPageHeader eyebrow="PROFIL MAPP" title="Résultats" description={`${total} passage${total > 1 ? "s" : ""}. La liste charge uniquement 50 lignes et le dernier classement de chaque passage.`} />
    <StudioCard>
      <form className="mb-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]" method="get">
        <input className="rounded-xl border border-border bg-background px-4 py-3 text-sm" defaultValue={search} name="q" placeholder="Rechercher un nom ou un e-mail" />
        <select className="rounded-xl border border-border bg-background px-4 py-3 text-sm" defaultValue={status} name="status">
          <option value="">Tous les statuts</option><option value="completed">Terminés</option><option value="in_progress">En cours</option><option value="finalizing">Finalisation</option><option value="abandoned">Abandonnés</option>
        </select>
        <button className="rounded-xl bg-[#20302e] px-5 py-3 text-sm font-semibold text-white" type="submit">Filtrer</button>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Participant</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Statut</th><th className="px-3 py-3">Dominant</th><th className="px-3 py-3">Secondaire</th><th className="px-3 py-3">Sous pression</th><th className="px-3 py-3" /></tr></thead>
          <tbody>{rows.map((row) => <tr className="border-b border-border/70" key={row.attempt_id}>
            <td className="px-3 py-4"><strong className="block">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "Participant sans nom"}</strong><span className="text-xs text-muted">{row.email || "Aucun e-mail"}</span></td>
            <td className="px-3 py-4">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(row.started_at))}</td>
            <td className="px-3 py-4">{row.attempt_status === "completed" ? "Terminé" : row.attempt_status === "in_progress" ? "En cours" : row.attempt_status}</td>
            <td className="px-3 py-4">{row.primary_code ? profileNames[row.primary_code] : "—"}</td><td className="px-3 py-4">{row.secondary_code ? profileNames[row.secondary_code] : "—"}</td><td className="px-3 py-4">{row.pressure_code ? profileNames[row.pressure_code] : "—"}</td>
            <td className="px-3 py-4 text-right"><Link className="font-semibold text-[#20302e] underline-offset-4 hover:underline" href={`/apps/profil-mapp/admin/participants/${row.attempt_id}`}>Détail</Link></td>
          </tr>)}</tbody>
        </table>
        {!rows.length && <p className="py-12 text-center text-sm text-muted">Aucun passage ne correspond à ces filtres.</p>}
      </div>
      <nav className="mt-5 flex items-center justify-between text-sm" aria-label="Pagination des résultats">
        {page > 1 ? <Link className="rounded-lg border border-border px-4 py-2" href={hrefForPage(page - 1)}>Précédent</Link> : <span />}
        <span>Page {Math.min(page, pageCount)} sur {pageCount}</span>
        {page < pageCount ? <Link className="rounded-lg border border-border px-4 py-2" href={hrefForPage(page + 1)}>Suivant</Link> : <span />}
      </nav>
    </StudioCard>
  </AppsStudioShell>;
}
