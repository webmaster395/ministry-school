"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, MoreHorizontal, Presentation, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeneropolySession, GeneropolySnapshot, GeneropolyTable } from "@/lib/apps/generopoly";
import { completedTables, extractAnswers } from "@/lib/apps/generopoly-results";
import GeneropolyFocusRings from "@/components/apps-studio/GeneropolyFocusRings";
import GeneropolySituationCharts from "@/components/apps-studio/GeneropolySituationCharts";

export default function GeneropolyResults({ sessions, snapshot }: { sessions: GeneropolySession[]; snapshot: GeneropolySnapshot }) {
  const router = useRouter();
  const [liveSnapshot, setLiveSnapshot] = useState(snapshot);
  const [group, setGroup] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [menuSession, setMenuSession] = useState<string | null>(null);
  const [deletingSession, setDeletingSession] = useState<GeneropolySession | null>(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [sessionActionError, setSessionActionError] = useState("");
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  useEffect(() => { setLiveSnapshot(snapshot); }, [snapshot]);
  const activeSnapshot = liveSnapshot.session?.id === snapshot.session?.id ? liveSnapshot : snapshot;
  const refresh = useCallback(async () => {
    if (!activeSnapshot.session?.id) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/apps/generopoly/snapshot?session=${encodeURIComponent(activeSnapshot.session.id)}`, { cache: "no-store" });
      if (response.ok) setLiveSnapshot(await response.json());
    } finally { setRefreshing(false); }
  }, [activeSnapshot.session?.id]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const completed = completedTables(activeSnapshot);
  const selectedScope = activeSnapshot.session?.id === "all" ? "all" : activeSnapshot.session?.id ?? "";
  const selectedGroup = completed.some((table) => table.id === group) ? group : "all";
  const tables = selectedGroup === "all" ? completed : completed.filter((table) => table.id === selectedGroup);
  const participants = completed.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0);
  const completeAnswers = completed.filter((table) => Array.isArray(table.state.mirror) && table.state.mirror.filter((answer) => String(answer).trim()).length >= 4).length;
  const lastUpdate = completed.length ? Math.max(...completed.map((table) => table.updatedAt)) : activeSnapshot.syncedAt;
  const currentParisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const includedSessions = sessions.filter((session) => !session.isExcluded);
  const excludedSessions = sessions.filter((session) => session.isExcluded);
  async function updateSession(session: GeneropolySession, action: "exclude" | "include" | "delete", confirmation?: string) {
    setSessionActionLoading(true); setSessionActionError("");
    try {
      const response = await fetch("/api/admin/apps/generopoly/sessions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id, action, confirmation }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Action impossible.");
      setMenuSession(null); setDeletingSession(null); setDeleteConfirmation(""); setDeleteStep(1);
      if (action === "delete" && selectedScope === session.id) router.push("/admin/apps/generopoly/results"); else router.refresh();
    } catch (cause) { setSessionActionError(cause instanceof Error ? cause.message : "Action impossible."); }
    finally { setSessionActionLoading(false); }
  }

  return <div className="space-y-8">
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-title text-xl font-normal">Journées disponibles</h2><p className="mt-1 text-xs text-muted">Chaque participation est classée selon sa date de validation finale, en heure de Paris.</p></div>
      <div className="border-b border-border bg-surface/50 px-4 py-4 sm:px-5"><label className="grid max-w-lg gap-2 text-xs font-semibold">Périmètre analysé<select aria-label="Périmètre analysé" className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-normal" value={selectedScope} onChange={(event) => router.push(event.target.value === "all" ? "/admin/apps/generopoly/results?session=all" : `/admin/apps/generopoly/results?session=${encodeURIComponent(event.target.value)}`)}><option value="all">Toutes les sessions</option><optgroup label="Sessions incluses">{includedSessions.map((session) => <option key={session.id} value={session.id}>Atelier du {formatDate(session.session_date)}</option>)}</optgroup>{excludedSessions.length > 0 && <optgroup label="Sessions exclues">{excludedSessions.map((session) => <option key={session.id} value={session.id}>Atelier du {formatDate(session.session_date)} — exclue</option>)}</optgroup>}</select></label></div>
      <div className="divide-y divide-border">{includedSessions.map((session) => {
        const active = session.id === activeSnapshot.session?.id;
        const today = session.session_date === currentParisDay;
        return <div className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 ${active ? "bg-surface" : ""}`} key={session.id}>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-semibold">{formatDate(session.session_date) || session.title}</strong>{today && <span className="rounded-full bg-[#dcece7] px-2 py-1 text-[10px] font-semibold text-[#245e57]">Aujourd’hui</span>}</div><p className="mt-1 text-xs text-muted">{session.groupCount} groupe{session.groupCount > 1 ? "s" : ""} validé{session.groupCount > 1 ? "s" : ""} · {session.participantCount} participant{session.participantCount > 1 ? "s" : ""}</p></div>
          <div className="relative flex flex-wrap gap-2"><button type="button" disabled={active} onClick={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium disabled:border-transparent disabled:bg-foreground disabled:text-on-accent"><ExternalLink size={14} />{active ? "Résultats affichés" : "Voir les résultats"}</button><Link href={`/admin/apps/generopoly/projection?session=${encodeURIComponent(session.id)}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><Presentation size={14} /> Projeter</Link><button type="button" onClick={() => setMenuSession(menuSession === session.id ? null : session.id)} aria-label={`Actions pour ${formatDate(session.session_date)}`} className="grid min-h-10 min-w-10 place-items-center rounded-full border border-border bg-background"><MoreHorizontal size={17} /></button>{menuSession === session.id && <SessionMenu session={session} onView={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} onExclude={() => void updateSession(session, "exclude")} onDelete={() => { setDeletingSession(session); setDeleteStep(1); setSessionActionError(""); setMenuSession(null); }} />}</div>
        </div>;
      })}</div>
      {excludedSessions.length > 0 && <div className="border-t border-border"><div className="bg-[#f9f5ee] px-4 py-3 text-xs font-semibold text-muted sm:px-5">Sessions exclues</div><div className="divide-y divide-border">{excludedSessions.map((session) => <div className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5" key={session.id}><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-semibold">{formatDate(session.session_date) || session.title}</strong><span className="rounded-full bg-[#efe5d6] px-2 py-1 text-[10px] font-semibold text-[#775c36]">Exclue des statistiques</span></div><p className="mt-1 text-xs text-muted">{session.groupCount} groupe{session.groupCount > 1 ? "s" : ""} · {session.participantCount} participant{session.participantCount > 1 ? "s" : ""}</p></div><div className="relative flex flex-wrap gap-2"><button type="button" onClick={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><ExternalLink size={14} /> Voir les résultats</button><button type="button" onClick={() => setMenuSession(menuSession === session.id ? null : session.id)} aria-label={`Actions pour ${formatDate(session.session_date)}`} className="grid min-h-10 min-w-10 place-items-center rounded-full border border-border bg-background"><MoreHorizontal size={17} /></button>{menuSession === session.id && <SessionMenu session={session} onView={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} onExclude={() => void updateSession(session, "include")} onDelete={() => { setDeletingSession(session); setDeleteStep(1); setSessionActionError(""); setMenuSession(null); }} />}</div></div>)}</div></div>}
      {!sessions.length && <p className="px-5 py-8 text-center text-sm text-muted">Aucune participation définitivement validée pour le moment.</p>}
    </section>

    {activeSnapshot.session && <>
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div><p className="label text-[10px] text-link">{activeSnapshot.session.id === "all" ? "TOUTES LES SESSIONS" : `ATELIER DU ${formatDate(activeSnapshot.session.session_date).toLocaleUpperCase("fr-FR")}`}</p><h2 className="mt-2 font-title text-3xl font-normal">{activeSnapshot.session.id === "all" ? "Résultats cumulés" : "Résultats de la journée"}</h2><p className="mt-2 text-sm text-muted">Moyennes calculées par groupe, uniquement à partir des participations définitivement validées.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void refresh()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Actualiser</button><Link href={`/admin/apps/generopoly/projection?session=${encodeURIComponent(activeSnapshot.session.id)}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-4 text-xs font-medium text-on-accent"><Presentation size={14} /> Projeter</Link></div>
      </header>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-border pb-6 lg:grid-cols-4"><Metric label="Groupes validés" value={completed.length} /><Metric label="Participants" value={participants} /><Metric label="Réponses finales complètes" value={completeAnswers} /><Metric label="Dernière mise à jour" value={lastUpdate ? formatTime(lastUpdate) : "—"} /></dl>
      <label className="grid max-w-md gap-2 text-xs font-semibold">Afficher<select className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={selectedGroup} onChange={(event) => setGroup(event.target.value)}><option value="all">Tous les groupes validés de cette journée</option>{completed.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></label>

      {!tables.length ? <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted">Aucune participation définitivement enregistrée pour ce filtre.</div> : <>
        <ResultSection number="01" title="Quand tout va bien" question="Comment les groupes répartissent-ils leurs ressources en situation normale ?">
          <GeneropolySituationCharts tables={tables} situation="normal" />
        </ResultSection>
        <ResultSection number="02" title="Face à l’imprévu ponctuel" question="Que changent les groupes lorsqu’un imprévu survient ?">
          <GeneropolySituationCharts tables={tables} situation="event" />
        </ResultSection>
        <ResultSection number="03" title="Face à la baisse durable" question="Quelles priorités les groupes conservent-ils lorsque leur situation se dégrade durablement ?">
          <GeneropolySituationCharts tables={tables} situation="durable" />
        </ResultSection>
        <ResultSection number="04" title="Votre vie spirituelle, votre église locale et les autres dans vos priorités" question="Une lecture descriptive des arbitrages collectifs, sans mesurer ni qualifier la foi des participants."><Focus tables={tables} /></ResultSection>
        <ResultSection number="05" title="Les réponses des groupes" question="Les formulations sont restituées telles qu’elles ont été saisies."><GroupAnswers tables={tables} /></ResultSection>
      </>}
    </>}
  {deletingSession && <DeleteSessionDialog session={deletingSession} step={deleteStep} value={deleteConfirmation} error={sessionActionError} loading={sessionActionLoading} onClose={() => { if (!sessionActionLoading) { setDeletingSession(null); setDeleteConfirmation(""); setDeleteStep(1); setSessionActionError(""); } }} onContinue={() => setDeleteStep(2)} onValueChange={setDeleteConfirmation} onDelete={() => void updateSession(deletingSession, "delete", deleteConfirmation)} />}</div>;
}

function SessionMenu({ session, onView, onExclude, onDelete }: { session: GeneropolySession; onView: () => void; onExclude: () => void; onDelete: () => void }) {
  return <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-border bg-background p-1.5 shadow-lg"><button type="button" onClick={onView} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface">Voir les résultats</button><Link href={`/admin/apps/generopoly/projection?session=${encodeURIComponent(session.id)}`} target="_blank" className="block rounded-lg px-3 py-2 text-xs hover:bg-surface">Projeter</Link><button type="button" onClick={onExclude} className="w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface">{session.isExcluded ? "Réintégrer aux statistiques" : "Exclure des statistiques"}</button><button type="button" onClick={onDelete} className="w-full rounded-lg px-3 py-2 text-left text-xs text-[#a63832] hover:bg-[#fbe8e5]">Supprimer définitivement</button></div>;
}

function DeleteSessionDialog({ session, step, value, error, loading, onClose, onContinue, onValueChange, onDelete }: { session: GeneropolySession; step: number; value: string; error: string; loading: boolean; onClose: () => void; onContinue: () => void; onValueChange: (value: string) => void; onDelete: () => void }) {
  const phrase = `SUPPRIMER ${session.session_date}`;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Supprimer une journée"><div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl"><h2 className="font-title text-2xl font-normal">Supprimer définitivement&nbsp;?</h2>{step === 1 ? <><p className="mt-3 text-sm leading-6 text-muted">Cette action supprimera l’atelier du {formatDate(session.session_date)} et ses {session.groupCount} groupe{session.groupCount > 1 ? "s" : ""} validé{session.groupCount > 1 ? "s" : ""}. Cette opération est irréversible.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-10 rounded-xl border border-border px-4 text-sm">Annuler</button><button type="button" onClick={onContinue} className="min-h-10 rounded-xl bg-[#a63832] px-4 text-sm text-white">Continuer</button></div></> : <><p className="mt-3 text-sm leading-6 text-muted">Pour confirmer, saisissez exactement <strong>{phrase}</strong>.</p><input autoFocus value={value} onChange={(event) => onValueChange(event.target.value)} className="mt-4 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" aria-label="Confirmation de suppression" />{error && <p className="mt-2 text-xs text-[#a63832]">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" disabled={loading} onClick={onClose} className="min-h-10 rounded-xl border border-border px-4 text-sm">Annuler</button><button type="button" disabled={loading || value !== phrase} onClick={onDelete} className="min-h-10 rounded-xl bg-[#a63832] px-4 text-sm text-white disabled:opacity-40">{loading ? "Suppression…" : "Supprimer définitivement"}</button></div></>}</div></div>;
}

function ResultSection({ number, title, question, children }: { number: string; title: string; question: string; children: React.ReactNode }) {
  return <section className="scroll-mt-24 rounded-2xl border border-border bg-background p-5 sm:p-7"><div className="mb-7 max-w-4xl"><p className="label text-[10px] text-link">{number}</p><h2 className="mt-2 font-title text-2xl font-normal sm:text-3xl">{title}</h2><p className="mt-2 text-sm leading-6 text-muted">{question}</p></div>{children}</section>;
}

function Focus({ tables }: { tables: GeneropolyTable[] }) {
  return <GeneropolyFocusRings tables={tables} />;
}

function GroupAnswers({ tables }: { tables: GeneropolyTable[] }) {
  const [query, setQuery] = useState("");
  const [mission, setMission] = useState("Miroir");
  const [answerGroup, setAnswerGroup] = useState("all");
  const [selectionOverrides, setSelectionOverrides] = useState<Record<string, boolean>>({});
  const answers = useMemo(() => extractAnswers(tables).filter((answer) => (mission === "all" || answer.mission === mission) && (answerGroup === "all" || answer.tableId === answerGroup) && `${answer.group} ${answer.question} ${answer.text}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))), [tables, query, mission, answerGroup]);
  async function toggle(answer: ReturnType<typeof extractAnswers>[number]) {
    const nextSelected = !(selectionOverrides[answer.id] ?? answer.selected);
    setSelectionOverrides((current) => ({ ...current, [answer.id]: nextSelected }));
    const response = await fetch("/api/admin/apps/generopoly/project", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ tableId: answer.tableId, key: answer.key, selected: nextSelected }) });
    if (!response.ok) setSelectionOverrides((current) => ({ ...current, [answer.id]: !nextSelected }));
  }
  return <div><div className="grid gap-3 md:grid-cols-3"><label className="relative"><Search className="absolute left-3 top-3.5 text-muted" size={15} /><input className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" /></label><select aria-label="Question" className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={mission} onChange={(event) => setMission(event.target.value)}><option value="Miroir">Quatre questions finales</option><option value="Argent">Justifications — Argent</option><option value="Temps">Justifications — Temps</option><option value="all">Toutes les réponses</option></select><select aria-label="Groupe" className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={answerGroup} onChange={(event) => setAnswerGroup(event.target.value)}><option value="all">Tous les groupes</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{answers.map((answer) => { const isSelected = selectionOverrides[answer.id] ?? answer.selected; return <article className={`rounded-xl border p-4 ${isSelected ? "border-[#2c6d65] bg-[#edf6f3]" : "border-transparent bg-surface"}`} key={answer.id}><div className="flex items-start justify-between gap-3"><div><p className="label text-[9px] text-link">{answer.group} · {answer.mission}</p><p className="mt-2 text-xs text-muted">{answer.question}</p></div><button type="button" aria-pressed={isSelected} onClick={() => void toggle(answer)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-muted" title={isSelected ? "Retirer de la projection" : "Afficher dans la projection"}>{isSelected ? <Eye size={15} /> : <EyeOff size={15} />}</button></div><p className="mt-3 text-sm leading-6">{answer.text}</p>{isSelected && <p className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-[#2c6d65]"><Check size={12} /> Sélectionnée pour la projection</p>}</article>; })}</div>{!answers.length && <p className="py-8 text-center text-sm text-muted">Aucune réponse pour ces filtres.</p>}</div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div><dt className="text-[11px] text-muted">{label}</dt><dd className="mt-1 font-title text-2xl font-normal">{value}</dd></div>; }
function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function formatTime(value: number) { return new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
