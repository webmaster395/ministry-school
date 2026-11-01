"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Eye, EyeOff, Presentation, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeneropolySession, GeneropolySnapshot, GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, comparisonAllocation, completedTables, evolutionSummary, extractAnswers, financeCategories, timeCategories } from "@/lib/apps/generopoly-results";

const palette = { normal: "#2c6d65", event: "#ef8c24", durable: "#c97992" };

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
          <div className="grid gap-8 xl:grid-cols-2"><AverageChart title="Votre argent" amount="750 €" unit="€" color={palette.normal} rows={averageAllocation(tables, "financeInitial", financeCategories)} /><AverageChart title="Votre temps" amount="28 h" unit="h" color={palette.normal} rows={averageAllocation(tables, "timeInitial", timeCategories)} /></div>
        </ResultSection>
        <ResultSection number="02" title="Face à l’imprévu ponctuel" question="Que changent les groupes lorsqu’un imprévu survient ?">
          <div className="grid gap-8 xl:grid-cols-2"><ComparisonChart title="Votre argent" amount="450 €" unit="€" color={palette.event} rows={comparisonAllocation(tables, "financeInitial", "financeAfterOne", financeCategories)} /><ComparisonChart title="Votre temps" amount="22 h" unit="h" color={palette.event} rows={comparisonAllocation(tables, "timeInitial", "timeAfterOne", timeCategories)} /></div>
        </ResultSection>
        <ResultSection number="03" title="Face à la baisse durable" question="Quelles priorités les groupes conservent-ils lorsque leur situation se dégrade durablement ?">
          <div className="grid gap-8 xl:grid-cols-2"><ComparisonChart title="Votre argent" amount="500 €" unit="€" color={palette.durable} rows={comparisonAllocation(tables, "financeInitial", "financeFinal", financeCategories)} /><ComparisonChart title="Votre temps" amount="18 h" unit="h" color={palette.durable} rows={comparisonAllocation(tables, "timeInitial", "timeFinal", timeCategories)} /></div>
          <DurableTrends tables={tables} />
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

type AverageRow = { key: string; label: string; value: number; sampleCount: number };
function AverageChart({ title, amount, unit, color, rows }: { title: string; amount: string; unit: string; color: string; rows: AverageRow[] }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <article><div className="mb-5 flex items-end justify-between gap-4"><h3 className="text-base font-semibold">{title}</h3><strong className="font-title text-2xl font-normal" style={{ color }}>{amount}</strong></div><div className="space-y-5">{rows.map((row) => <div key={row.key}><div className="mb-2 flex items-end justify-between gap-4 text-sm"><span className="min-w-0 text-muted">{row.label}</span><strong>{row.sampleCount ? `${formatNumber(row.value)} ${unit}` : "—"}</strong></div><div className="h-3 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: row.sampleCount ? `${row.value / maximum * 100}%` : "0%", backgroundColor: color }} /></div></div>)}</div></article>;
}

type ComparisonRow = ReturnType<typeof comparisonAllocation>[number];
function ComparisonChart({ title, amount, unit, color, rows }: { title: string; amount: string; unit: string; color: string; rows: ComparisonRow[] }) {
  const maximum = Math.max(...rows.flatMap((row) => [row.initial, row.current]), 1);
  return <article><div className="mb-5 flex items-end justify-between gap-4"><h3 className="text-base font-semibold">{title}</h3><strong className="font-title text-2xl font-normal" style={{ color }}>{amount}</strong></div><div className="space-y-6">{rows.map((row) => <div key={row.key}><div className="mb-2 flex flex-wrap items-end justify-between gap-2 text-sm"><span className="text-muted">{row.label}</span><span className="flex items-center gap-2"><strong>{row.sampleCount ? `${formatNumber(row.current)} ${unit}` : "—"}</strong>{row.sampleCount > 0 && <Variation difference={row.difference} percent={row.percent} unit={unit} evolution={row.evolution} />}</span></div><div className="relative h-4 overflow-hidden rounded-full bg-surface"><div className="absolute inset-y-0 left-0 rounded-full bg-[#d9ddda]" style={{ width: row.sampleCount ? `${row.initial / maximum * 100}%` : "0%" }} /><div className="absolute inset-y-[3px] left-0 rounded-full transition-[width] duration-700" style={{ width: row.sampleCount ? `${row.current / maximum * 100}%` : "0%", backgroundColor: color }} /></div><p className="mt-1.5 text-[10px] text-muted">Référence : {row.sampleCount ? `${formatNumber(row.initial)} ${unit}` : "donnée manquante"}</p></div>)}</div></article>;
}

function Variation({ difference, percent, unit, evolution }: { difference: number; percent: number | null; unit: string; evolution: string }) {
  const tones: Record<string, string> = { increased: "text-[#28704c]", decreased: "text-[#b23b35]", suspended: "text-[#b23b35]", maintained: "text-[#60736f]" };
  const label = evolution === "suspended" ? "Suspendu" : `${signed(difference)} ${unit}${percent === null ? "" : ` · ${signed(percent)} %`}`;
  return <span className={`text-[11px] font-semibold ${tones[evolution] ?? tones.maintained}`}>{label}</span>;
}

function DurableTrends({ tables }: { tables: GeneropolyTable[] }) {
  const rows = [...comparisonAllocation(tables, "financeInitial", "financeFinal", financeCategories).map((row) => ({ ...row, unit: "€" })), ...comparisonAllocation(tables, "timeInitial", "timeFinal", timeCategories).map((row) => ({ ...row, unit: "h" }))].filter((row) => row.sampleCount > 0);
  const reduced = [...rows].sort((a, b) => a.difference - b.difference).slice(0, 3);
  const preserved = [...rows].sort((a, b) => Math.abs(a.difference) - Math.abs(b.difference)).slice(0, 3);
  const increased = [...rows].filter((row) => row.difference > 0).sort((a, b) => b.difference - a.difference).slice(0, 3);
  return <div className="mt-8 grid gap-5 border-t border-border pt-7 lg:grid-cols-3"><Trend title="Plus réduites" rows={reduced} /><Trend title="Plus préservées" rows={preserved} /><Trend title="Plus augmentées" rows={increased} empty="Aucune catégorie en augmentation." /></div>;
}

function Trend({ title, rows, empty = "Aucune donnée comparable." }: { title: string; rows: Array<{ key: string; label: string; difference: number; unit: string }>; empty?: string }) {
  return <div><h3 className="text-sm font-semibold">{title}</h3>{rows.length ? <ol className="mt-3 space-y-2">{rows.map((row, index) => <li className="flex gap-3 text-sm text-muted" key={`${row.key}-${row.unit}`}><span className="text-foreground/35">0{index + 1}</span><span>{row.label} · {signed(row.difference)} {row.unit}</span></li>)}</ol> : <p className="mt-3 text-sm text-muted">{empty}</p>}</div>;
}

function Focus({ tables }: { tables: GeneropolyTable[] }) {
  const dimensions = [
    { emoji: "💚", title: "Générosité financière", description: "Dîme, offrandes, dons aux associations, etc.", key: "generosity", fields: ["financeInitial", "financeAfterOne", "financeFinal"], unit: "€" },
    { emoji: "✝️", title: "Vie spirituelle", description: "Prière, lecture de la Bible, études bibliques.", key: "spiritual", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
    { emoji: "🤝", title: "Service et solidarité", description: "Église locale, associations, bénévolat, etc.", key: "service", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
  ];
  return <div className="grid gap-4 lg:grid-cols-3">{dimensions.map((dimension) => {
    const categories = dimension.unit === "€" ? financeCategories : timeCategories;
    const averages = dimension.fields.map((field) => averageAllocation(tables, field, categories).find((row) => row.key === dimension.key));
    const counts = evolutionSummary(tables, dimension.fields[0], dimension.fields[2], dimension.key);
    return <article className="rounded-2xl bg-foreground p-5 text-on-accent" key={dimension.title}><span className="text-2xl">{dimension.emoji}</span><h3 className="mt-3 text-sm font-semibold">{dimension.title}</h3><p className="mt-1 text-xs leading-5 text-white/55">{dimension.description}</p><div className="mt-5 grid grid-cols-3 gap-2 text-center">{averages.map((row, index) => <div key={dimension.fields[index]}><strong className="block text-lg">{row?.sampleCount ? `${formatNumber(row.value)}${dimension.unit}` : "—"}</strong><span className="text-[9px] text-white/50">{["Normal", "Imprévu", "Durable"][index]}</span></div>)}</div><ul className="mt-5 grid grid-cols-2 gap-2 text-[11px] text-white/65"><li>{percent(counts.increased, counts.total)} augmenté</li><li>{percent(counts.decreased, counts.total)} diminué</li><li>{percent(counts.maintained, counts.total)} maintenu</li><li>{percent(counts.suspended, counts.total)} suspendu</li></ul></article>;
  })}</div>;
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
function signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value))}`; }
function percent(value: number, total: number) { return total ? `${Math.round(value / total * 100)} %` : "—"; }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function formatTime(value: number) { return new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
