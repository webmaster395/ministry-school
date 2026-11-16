import Link from "next/link";
import { cookies } from "next/headers";
import AppsStudioShell, { StudioCard, StudioPageHeader } from "@/components/apps-studio/AppsStudioShell";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; status?: string; account?: string; primary?: string; page?: string };
type MappAdminRow = { attempt_id: string; participant_id: string; first_name: string | null; last_name: string | null; email: string | null; attempt_status: string; started_at: string; completed_at: string | null; primary_code: string | null; secondary_code: string | null; pressure_code: string | null; total_count: number };
type ArchivedAttempt = { id: string; name: string; email: string | null; accountLinked: boolean; status: string; completedAt: string | null; startedAt: string; primary: string | null; secondary: string | null };
type Summary = { total: number; completed: number; inProgress: number; abandoned: number; linked: number; unlinked: number; completionRate: number; primary: Record<string, number>; secondary: Record<string, number>; pressure: Record<string, number>; combinations: Array<{ code: string; count: number }> };

const PAGE_SIZE = 50;
const profileKeys = ["conquerant", "communiquant", "facilitateur", "analyste"] as const;
const profileLabels: Record<string, string> = { D: "Conquérant", I: "Communicant", S: "Facilitateur", C: "Analyste", conquerant: "Conquérant", communiquant: "Communicant", communicant: "Communicant", facilitateur: "Facilitateur", analyste: "Analyste" };
const profileColors: Record<string, string> = { conquerant: "#f28b6d", communiquant: "#e5b33f", facilitateur: "#86b9a4", analyste: "#6f88b8" };
const codeToKey: Record<string, string> = { D: "conquerant", I: "communiquant", S: "facilitateur", C: "analyste" };
const profileLabel = (code: string | null, tie = false) => code ? (profileLabels[code] ?? "Profil à préciser") : tie ? "À départager" : "—";
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const statusLabel = (status: string) => ({ completed: "Terminé", in_progress: "En cours", finalizing: "Finalisation", abandoned: "Interrompu" } as Record<string, string>)[status] ?? status;
const emptySummary = (): Summary => ({ total: 0, completed: 0, inProgress: 0, abandoned: 0, linked: 0, unlinked: 0, completionRate: 0, primary: {}, secondary: {}, pressure: {}, combinations: [] });

function nativeSummary(rows: MappAdminRow[], linked: Set<string>): Summary {
  const completed = rows.filter((row) => row.attempt_status === "completed");
  const count = (field: "primary_code" | "secondary_code" | "pressure_code") => Object.fromEntries(profileKeys.map((key) => [key, completed.filter((row) => codeToKey[row[field] ?? ""] === key).length]));
  const combinations = new Map<string, number>();
  for (const row of completed) {
    if (!row.primary_code || !row.secondary_code) continue;
    const key = `${codeToKey[row.primary_code]}/${codeToKey[row.secondary_code]}`;
    combinations.set(key, (combinations.get(key) ?? 0) + 1);
  }
  return { total: rows.length, completed: completed.length, inProgress: rows.filter((row) => row.attempt_status === "in_progress" || row.attempt_status === "finalizing").length, abandoned: rows.filter((row) => row.attempt_status === "abandoned").length, linked: rows.filter((row) => linked.has(row.participant_id)).length, unlinked: rows.filter((row) => !linked.has(row.participant_id)).length, completionRate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0, primary: count("primary_code"), secondary: count("secondary_code"), pressure: count("pressure_code"), combinations: [...combinations.entries()].map(([code, value]) => ({ code, count: value })).sort((a, b) => b.count - a.count) };
}

function mergeSummary(a: Summary, b: Summary): Summary {
  const mergeCounts = (left: Record<string, number>, right: Record<string, number>) => Object.fromEntries(profileKeys.map((key) => [key, Number(left[key] ?? 0) + Number(right[key] ?? 0)]));
  const combinations = new Map<string, number>();
  for (const item of [...a.combinations, ...b.combinations]) combinations.set(item.code, (combinations.get(item.code) ?? 0) + item.count);
  const total = a.total + b.total; const completed = a.completed + b.completed;
  return { total, completed, inProgress: a.inProgress + b.inProgress, abandoned: a.abandoned + b.abandoned, linked: a.linked + b.linked, unlinked: a.unlinked + b.unlinked, completionRate: total ? Math.round((completed / total) * 100) : 0, primary: mergeCounts(a.primary, b.primary), secondary: mergeCounts(a.secondary, b.secondary), pressure: mergeCounts(a.pressure, b.pressure), combinations: [...combinations.entries()].map(([code, count]) => ({ code, count })).sort((x, y) => y.count - x.count).slice(0, 8) };
}

export default async function ProfilMappResultsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase(); const status = (params.status ?? "").trim();
  const account = (params.account ?? "").trim(); const primary = (params.primary ?? "").trim();
  const currentPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const service = createServiceClient(); const mapp = service.schema("mapp");
  const first = await mapp.rpc("admin_list_attempts_page", { p_offset: 0, p_limit: 100, p_search: null, p_status: null });
  const nativeRows = [...((first.data ?? []) as MappAdminRow[])];
  const nativeTotal = Number(nativeRows[0]?.total_count ?? 0); const pageCount = Math.ceil(nativeTotal / 100);
  if (pageCount > 1) {
    const pages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) => mapp.rpc("admin_list_attempts_page", { p_offset: (index + 1) * 100, p_limit: 100, p_search: null, p_status: null })));
    for (const page of pages) nativeRows.push(...((page.data ?? []) as MappAdminRow[]));
  }
  const participantIds = [...new Set(nativeRows.map((row) => row.participant_id))];
  const { data: identities } = participantIds.length ? await mapp.from("participant_auth_identities").select("participant_id,auth_user_id").in("participant_id", participantIds).is("revoked_at", null) : { data: [] };
  const accountByParticipant = new Map((identities ?? []).map((identity) => [identity.participant_id, identity.auth_user_id]));
  const linkedParticipants = new Set(accountByParticipant.keys());
  const filteredNative = nativeRows.filter((row) => {
    const haystack = `${row.first_name ?? ""} ${row.last_name ?? ""} ${row.email ?? ""}`.toLowerCase();
    if (q && !haystack.includes(q)) return false;
    if (status && row.attempt_status !== status) return false;
    if (account === "linked" && !linkedParticipants.has(row.participant_id)) return false;
    if (account === "unlinked" && linkedParticipants.has(row.participant_id)) return false;
    return !primary || codeToKey[row.primary_code ?? ""] === primary;
  });
  const nativePageRows = filteredNative.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join("; ");
  const archivedResponse = await fetch("https://profil-mapp.vercel.app/apps/profil-mapp/api/integrations/ministry/admin-results", { method: "POST", headers: { cookie: cookieHeader, "content-type": "application/json" }, body: JSON.stringify({ page: currentPage, pageSize: PAGE_SIZE, search: q, status, account, primary }), cache: "no-store" }).catch(() => null);
  const archivedPayload = archivedResponse?.ok ? await archivedResponse.json() as { attempts?: ArchivedAttempt[]; total?: number; summary?: Summary } : { attempts: [], total: 0, summary: emptySummary() };
  const archivedAttempts = archivedPayload.attempts ?? []; const archivedTotal = Number(archivedPayload.total ?? 0);
  const summary = mergeSummary(nativeSummary(nativeRows, linkedParticipants), archivedPayload.summary ?? emptySummary());
  const queryFor = (updates: Record<string, string>) => { const search = new URLSearchParams(); if (q) search.set("q", q); if (status) search.set("status", status); if (account) search.set("account", account); if (primary) search.set("primary", primary); for (const [key, value] of Object.entries(updates)) value ? search.set(key, value) : search.delete(key); return `?${search.toString()}`; };

  return <AppsStudioShell active="results" appTab="results" appSlug="profil-mapp" appName="Profil MAPP" appIconUrl="/apps/profil-mapp/icon.svg" hasResults hasEditor={false}>
    <StudioPageHeader eyebrow="PROFIL MAPP" title="Résultats" description="Une vue complète des passages MAPP, des profils et des comptes à rattacher, réunie sans modifier les scores." action={<Link href="/admin/apps/profil-mapp/invitations" className="rounded-xl bg-[#27302f] px-4 py-2.5 text-sm font-semibold text-white">Invitations MAPP</Link>} />
    <nav className="mb-6 flex flex-wrap gap-2 text-sm font-semibold"><a href="#vue-ensemble" className="rounded-full bg-[#27302f] px-4 py-2 text-white">Vue d’ensemble</a><a href="#resultats" className="rounded-full border border-border bg-white px-4 py-2">Résultats par personne</a><Link href={queryFor({ account: "unlinked", page: "1" }) + "#resultats"} className="rounded-full border border-border bg-white px-4 py-2">Comptes non liés · {summary.unlinked}</Link></nav>
    <section id="vue-ensemble" className="scroll-mt-24 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{[["Tests enregistrés", summary.total], ["Terminés", summary.completed], ["En cours", summary.inProgress], ["Taux de complétion", `${summary.completionRate} %`], ["Comptes liés", summary.linked], ["Comptes non liés", summary.unlinked]].map(([label, value]) => <StudioCard key={String(label)}><p className="text-sm text-muted">{label}</p><p className="mt-2 font-title text-3xl font-semibold">{value}</p></StudioCard>)}</div>
      <div className="grid gap-5 xl:grid-cols-2">{[{ title: "Profils principaux", values: summary.primary }, { title: "Profils secondaires", values: summary.secondary }].map((group) => <StudioCard key={group.title}><h2 className="font-title text-2xl">{group.title}</h2><div className="mt-5 space-y-4">{profileKeys.map((key) => { const value = Number(group.values[key] ?? 0); const max = Math.max(1, ...profileKeys.map((item) => Number(group.values[item] ?? 0))); return <div key={key}><div className="mb-1.5 flex justify-between text-sm"><span className="font-semibold">{profileLabels[key]}</span><strong>{value}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, background: profileColors[key] }} /></div></div>; })}</div></StudioCard>)}</div>
      <StudioCard><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Combinaisons</p><h2 className="mt-1 font-title text-2xl">Profils les plus fréquents</h2></div><p className="text-sm text-muted">Principal + secondaire</p></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{summary.combinations.length ? summary.combinations.map((item) => { const [a, b] = item.code.split("/"); return <div key={item.code} className="rounded-2xl bg-surface p-4"><strong>{profileLabels[a] ?? a} + {profileLabels[b] ?? b}</strong><p className="mt-1 text-sm text-muted">{item.count} résultat{item.count > 1 ? "s" : ""}</p></div>; }) : <p className="text-sm text-muted">Aucune combinaison calculée.</p>}</div></StudioCard>
    </section>
    <section id="resultats" className="mt-8 scroll-mt-24 space-y-5">
      <StudioCard><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">Recherche consolidée</p><h2 className="mt-1 font-title text-2xl">Résultats par personne</h2></div><p className="text-sm text-muted">{filteredNative.length + archivedTotal} résultat{filteredNative.length + archivedTotal > 1 ? "s" : ""}</p></div><form className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_180px_auto]"><input name="q" defaultValue={params.q ?? ""} placeholder="Nom ou e-mail" className="min-h-11 rounded-xl border border-border bg-white px-3" /><select name="status" defaultValue={status} className="min-h-11 rounded-xl border border-border bg-white px-3"><option value="">Tous les statuts</option><option value="completed">Terminés</option><option value="in_progress">En cours</option><option value="abandoned">Interrompus</option></select><select name="account" defaultValue={account} className="min-h-11 rounded-xl border border-border bg-white px-3"><option value="">Tous les comptes</option><option value="linked">Comptes liés</option><option value="unlinked">Comptes non liés</option></select><select name="primary" defaultValue={primary} className="min-h-11 rounded-xl border border-border bg-white px-3"><option value="">Tous les profils</option>{profileKeys.map((key) => <option key={key} value={key}>{profileLabels[key]}</option>)}</select><button className="min-h-11 rounded-xl bg-[#27302f] px-5 text-sm font-semibold text-white">Appliquer</button></form></StudioCard>
      <ResultTable title="Résultats Ministry School" subtitle="Nouveau moteur MAPP" rows={nativePageRows.map((row) => ({ id: row.attempt_id, name: [row.first_name, row.last_name].filter(Boolean).join(" ") || "Sans nom", email: row.email, status: row.attempt_status, completedAt: row.completed_at, startedAt: row.started_at, primary: row.primary_code, secondary: row.secondary_code, linked: linkedParticipants.has(row.participant_id), href: `/admin/apps/profil-mapp/results/${row.attempt_id}`, tie: row.attempt_status === "completed" && (!row.primary_code || !row.secondary_code) }))} unavailable={Boolean(first.error)} />
      <ResultTable title="Résultats historiques" subtitle="Ancien moteur MAPP, consultable au même endroit" rows={archivedAttempts.map((row) => ({ id: row.id, name: row.name, email: row.email, status: row.status, completedAt: row.completedAt, startedAt: row.startedAt, primary: row.primary, secondary: row.secondary, linked: row.accountLinked, href: `https://profil-mapp.vercel.app/apps/profil-mapp/admin/participants/${row.id}`, tie: false }))} unavailable={!archivedResponse?.ok} />
      {Math.max(Math.ceil(filteredNative.length / PAGE_SIZE), Math.ceil(archivedTotal / PAGE_SIZE)) > 1 && <nav className="flex items-center justify-between"><span>{currentPage > 1 ? <Link href={queryFor({ page: String(currentPage - 1) }) + "#resultats"} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">Précédent</Link> : null}</span><span className="text-sm text-muted">Page {currentPage}</span><span>{currentPage < Math.max(Math.ceil(filteredNative.length / PAGE_SIZE), Math.ceil(archivedTotal / PAGE_SIZE)) ? <Link href={queryFor({ page: String(currentPage + 1) }) + "#resultats"} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold">Suivant</Link> : null}</span></nav>}
    </section>
  </AppsStudioShell>;
}

function ResultTable({ title, subtitle, rows, unavailable }: { title: string; subtitle: string; unavailable: boolean; rows: Array<{ id: string; name: string; email: string | null; status: string; completedAt: string | null; startedAt: string; primary: string | null; secondary: string | null; linked: boolean; href: string; tie: boolean }> }) {
  return <StudioCard><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-title text-xl">{title}</h3><p className="text-sm text-muted">{subtitle}</p></div><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold">{rows.length} affiché{rows.length > 1 ? "s" : ""}</span></div>{unavailable ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Cette source est momentanément indisponible.</div> : rows.length === 0 ? <p className="rounded-2xl bg-surface p-6 text-sm text-muted">Aucun résultat ne correspond aux filtres.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-border text-muted"><th className="p-3">Participant</th><th className="p-3">Statut</th><th className="p-3">Date</th><th className="p-3">Principal</th><th className="p-3">Secondaire</th><th className="p-3">Compte</th><th className="p-3" /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border/70"><td className="p-3"><strong className="block">{row.name}</strong><span className="text-xs text-muted">{row.email || "E-mail non renseigné"}</span></td><td className="p-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${row.tie ? "bg-violet-50 text-violet-900" : row.status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{row.tie ? "Départage requis" : statusLabel(row.status)}</span></td><td className="p-3">{formatDate(row.completedAt ?? row.startedAt)}</td><td className="p-3 font-semibold">{profileLabel(row.primary, row.tie)}</td><td className="p-3">{profileLabel(row.secondary, row.tie)}</td><td className="p-3"><span className={row.linked ? "text-emerald-800" : "font-semibold text-amber-800"}>{row.linked ? "Lié" : "Non lié"}</span></td><td className="p-3 text-right"><Link href={row.href} className="font-semibold underline underline-offset-4">Ouvrir</Link></td></tr>)}</tbody></table></div>}</StudioCard>;
}
