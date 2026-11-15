import Link from "next/link";
import { cookies } from "next/headers";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string; page?: string };
type MappAdminRow = {
  attempt_id: string; participant_id: string; first_name: string | null; last_name: string | null;
  email: string | null; attempt_status: string; started_at: string; completed_at: string | null;
  primary_code: string | null; secondary_code: string | null; pressure_code: string | null; total_count: number;
};
type ArchivedAttempt = {
  id: string; name: string; email: string | null; accountLinked: boolean; status: string;
  completedAt: string | null; startedAt: string; primary: string | null; secondary: string | null;
};

const PAGE_SIZE = 50;
const profileLabels: Record<string, string> = { D: "Conquérant", I: "Communicant", S: "Facilitateur", C: "Analyste", conquerant: "Conquérant", communiquant: "Communicant", communicant: "Communicant", facilitateur: "Facilitateur", analyste: "Analyste" };
const profileLabel = (code: string | null, needsTieBreak = false) => code ? (profileLabels[code] ?? "Profil à préciser") : needsTieBreak ? "À départager" : "—";
const date = (value: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const statusLabel = (status: string) => ({ completed: "Terminé", in_progress: "En cours", abandoned: "Interrompu" } as Record<string, string>)[status] ?? status;

export default async function ProfilMappResultsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const service = createServiceClient();
  const mapp = service.schema("mapp");
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const [{ data, error }, archivedResponse] = await Promise.all([
    mapp.rpc("admin_list_attempts_page", { p_offset: offset, p_limit: PAGE_SIZE, p_search: q || null, p_status: status || null }),
    fetch("https://profil-mapp.vercel.app/apps/profil-mapp/api/integrations/ministry/admin-results", {
      method: "POST", headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({ page: currentPage, pageSize: PAGE_SIZE, search: q, status }), cache: "no-store",
    }).catch(() => null),
  ]);
  const archivedPayload = archivedResponse?.ok
    ? await archivedResponse.json() as { attempts?: ArchivedAttempt[]; total?: number }
    : { attempts: [], total: 0 };
  const archivedAttempts = archivedPayload.attempts ?? [];
  const archivedTotal = Number(archivedPayload.total ?? 0);
  const rows = (data ?? []) as MappAdminRow[];
  const total = Number(rows[0]?.total_count ?? 0);
  const participantIds = [...new Set(rows.map((row) => row.participant_id))];
  const { data: identities } = participantIds.length
    ? await mapp.from("participant_auth_identities").select("participant_id,auth_user_id").in("participant_id", participantIds).is("revoked_at", null)
    : { data: [] };
  const accountByParticipant = new Map((identities ?? []).map((identity) => [identity.participant_id, identity.auth_user_id]));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryForPage = (page: number) => {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (status) search.set("status", status);
    search.set("page", String(page));
    return `?${search.toString()}`;
  };

  return <AppsStudioShell active="results" appTab="results" appSlug="profil-mapp" appName="Profil MAPP" appIconUrl="/apps/profil-mapp/icon.svg" hasResults hasEditor={false}>
    <StudioPageHeader eyebrow="PROFIL MAPP" title="Résultats" description="Les résultats Ministry et les résultats historiques sont réunis ici, sans modifier leurs scores d’origine." action={<Link href="/admin/apps/profil-mapp/invitations" className="rounded-xl bg-[#27302f] px-4 py-2.5 text-sm font-semibold text-white">Invitations MAPP</Link>} />
    <StudioCard>
      <form className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <input name="q" defaultValue={q} placeholder="Rechercher par nom ou e-mail" className="min-h-11 rounded-xl border border-border bg-white px-3" />
        <select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-border bg-white px-3"><option value="">Tous les statuts</option><option value="completed">Terminés</option><option value="in_progress">En cours</option><option value="abandoned">Interrompus</option></select>
        <button className="min-h-11 rounded-xl bg-[#27302f] px-5 text-sm font-semibold text-white">Filtrer</button>
      </form>
      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"><strong>Impossible de charger les résultats.</strong><p className="mt-1">{error.message}</p></div> : rows.length === 0 ? <div className="rounded-2xl bg-surface p-8 text-center"><h2 className="font-title text-2xl">Aucun résultat trouvé</h2><p className="mt-2 text-sm text-muted">Modifie la recherche ou consulte les résultats historiques.</p></div> : <>
        <div className="mb-4 flex items-center justify-between gap-4 text-sm"><p><strong>{total}</strong> test{total > 1 ? "s" : ""}</p><p className="text-muted">Page {currentPage} sur {totalPages}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-border text-muted"><th className="p-3">Participant</th><th className="p-3">Statut</th><th className="p-3">Terminé le</th><th className="p-3">Profil principal</th><th className="p-3">Profil secondaire</th><th className="p-3">Compte Ministry</th></tr></thead><tbody>{rows.map((row) => {
          const accountId = accountByParticipant.get(row.participant_id);
          const needsTieBreak = row.attempt_status === "completed" && (!row.primary_code || !row.secondary_code);
          return <tr key={row.attempt_id} className="border-b border-border/70 align-middle"><td className="p-3"><strong className="block">{[row.first_name, row.last_name].filter(Boolean).join(" ") || "Sans nom"}</strong><span className="text-xs text-muted">{row.email || "E-mail non renseigné"}</span></td><td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${needsTieBreak ? "bg-violet-50 text-violet-900" : row.attempt_status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{needsTieBreak ? "Départage requis" : statusLabel(row.attempt_status)}</span></td><td className="p-3">{date(row.completed_at ?? row.started_at)}</td><td className="p-3 font-semibold">{profileLabel(row.primary_code, needsTieBreak)}</td><td className="p-3">{profileLabel(row.secondary_code, needsTieBreak)}</td><td className="p-3">{accountId ? <Link href={`/gestion/admin/membres/${accountId}`} className="font-semibold text-[#7b4b78] underline-offset-4 hover:underline">Ouvrir la fiche</Link> : <span className="text-muted">Non rattaché</span>}</td></tr>;
        })}</tbody></table></div>
        {totalPages > 1 ? <nav className="mt-6 flex items-center justify-between" aria-label="Pagination des résultats MAPP">{currentPage > 1 ? <Link href={queryForPage(currentPage - 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Précédent</Link> : <span />}{currentPage < totalPages ? <Link href={queryForPage(currentPage + 1)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Suivant</Link> : <span />}</nav> : null}
      </>}
    </StudioCard>
    <StudioCard>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Archive MAPP</p><h2 className="mt-1 font-title text-2xl">Résultats historiques</h2></div><p className="text-sm text-muted"><strong className="text-foreground">{archivedTotal}</strong> test{archivedTotal > 1 ? "s" : ""}</p></div>
      {!archivedResponse?.ok ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">L’archive MAPP est momentanément indisponible. Les résultats Ministry restent accessibles ci-dessus.</div> : archivedAttempts.length === 0 ? <p className="rounded-2xl bg-surface p-6 text-sm text-muted">Aucun résultat historique ne correspond aux filtres.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead><tr className="border-b border-border text-muted"><th className="p-3">Participant</th><th className="p-3">Statut</th><th className="p-3">Terminé le</th><th className="p-3">Profil principal</th><th className="p-3">Profil secondaire</th><th className="p-3">Résultat</th></tr></thead><tbody>{archivedAttempts.map((attempt) => <tr key={attempt.id} className="border-b border-border/70"><td className="p-3"><strong className="block">{attempt.name}</strong><span className="text-xs text-muted">{attempt.email || "E-mail non renseigné"}</span></td><td className="p-3">{statusLabel(attempt.status)}</td><td className="p-3">{date(attempt.completedAt ?? attempt.startedAt)}</td><td className="p-3 font-semibold">{profileLabel(attempt.primary)}</td><td className="p-3">{profileLabel(attempt.secondary)}</td><td className="p-3"><a href={`https://profil-mapp.vercel.app/apps/profil-mapp/admin/participants/${attempt.id}`} className="font-semibold underline underline-offset-4">Ouvrir</a></td></tr>)}</tbody></table></div>}
    </StudioCard>
  </AppsStudioShell>;
}
