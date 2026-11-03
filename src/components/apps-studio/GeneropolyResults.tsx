"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, Presentation, RefreshCw, Search } from "lucide-react";
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
  const selectedGroup = completed.some((table) => table.id === group) ? group : "all";
  const tables = selectedGroup === "all" ? completed : completed.filter((table) => table.id === selectedGroup);
  const participants = completed.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0);
  const completeAnswers = completed.filter((table) => Array.isArray(table.state.mirror) && table.state.mirror.filter((answer) => String(answer).trim()).length >= 4).length;
  const lastUpdate = completed.length ? Math.max(...completed.map((table) => table.updatedAt)) : activeSnapshot.syncedAt;
  const currentParisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

  return <div className="space-y-8">
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-title text-xl font-normal">Journées disponibles</h2><p className="mt-1 text-xs text-muted">Chaque participation est classée selon sa date de validation finale, en heure de Paris.</p></div>
      <div className="divide-y divide-border">{sessions.map((session) => {
        const active = session.id === activeSnapshot.session?.id;
        const today = session.session_date === currentParisDay;
        return <div className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 ${active ? "bg-surface" : ""}`} key={session.id}>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-semibold">{formatDate(session.session_date) || session.title}</strong>{today && <span className="rounded-full bg-[#dcece7] px-2 py-1 text-[10px] font-semibold text-[#245e57]">Aujourd’hui</span>}</div><p className="mt-1 text-xs text-muted">{session.groupCount} groupe{session.groupCount > 1 ? "s" : ""} validé{session.groupCount > 1 ? "s" : ""} · {session.participantCount} participant{session.participantCount > 1 ? "s" : ""}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={active} onClick={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium disabled:border-transparent disabled:bg-foreground disabled:text-on-accent"><ExternalLink size={14} />{active ? "Résultats affichés" : "Voir les résultats"}</button><Link href={`/admin/apps/generopoly/projection?session=${encodeURIComponent(session.id)}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><Presentation size={14} /> Projeter</Link></div>
        </div>;
      })}</div>
      {!sessions.length && <p className="px-5 py-8 text-center text-sm text-muted">Aucune participation définitivement validée pour le moment.</p>}
    </section>

    {activeSnapshot.session && <>
      <header className="grid gap-5 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div><p className="label text-[10px] text-link">ATELIER DU {formatDate(activeSnapshot.session.session_date).toLocaleUpperCase("fr-FR")}</p><h2 className="mt-2 font-title text-3xl font-normal">Résultats de la journée</h2><p className="mt-2 text-sm text-muted">Moyennes calculées par groupe, uniquement à partir des participations définitivement validées.</p></div>
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
  </div>;
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
