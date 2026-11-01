"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Presentation, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GeneropolySession, GeneropolySnapshot, GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, completedTables, evolutionSummary, extractAnswers, financeCategories, timeCategories } from "@/lib/apps/generopoly-results";

type View = "overview" | "money" | "time" | "commitments" | "answers";
const views: { key: View; label: string }[] = [{ key: "overview", label: "Vue d’ensemble" }, { key: "money", label: "Argent" }, { key: "time", label: "Temps" }, { key: "commitments", label: "Engagements" }, { key: "answers", label: "Réponses" }];

export default function GeneropolyResults({ sessions, snapshot }: { sessions: GeneropolySession[]; snapshot: GeneropolySnapshot }) {
  const router = useRouter();
  const completed = completedTables(snapshot);
  const [group, setGroup] = useState("all");
  const [view, setView] = useState<View>("overview");
  const tables = group === "all" ? completed : completed.filter((table) => table.id === group);
  const participants = completed.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0);
  const lastUpdate = completed.length ? Math.max(...completed.map((table) => table.updatedAt)) : snapshot.syncedAt;
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-border px-4 py-4 sm:px-5"><h2 className="font-title text-xl font-normal">Journées disponibles</h2><p className="mt-1 text-xs text-muted">Chaque participation est classée selon sa date de validation finale, en heure de Paris.</p></div>
      <div className="divide-y divide-border">{sessions.map((session) => { const active = session.id === snapshot.session?.id; return <div className={`grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5 ${active ? "bg-surface" : ""}`} key={session.id}><div><strong className="text-sm font-semibold">{formatDate(session.session_date) || session.title}</strong><p className="mt-1 text-xs text-muted">{session.groupCount} groupe{session.groupCount > 1 ? "s" : ""} validé{session.groupCount > 1 ? "s" : ""} · {session.participantCount} participant{session.participantCount > 1 ? "s" : ""}</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={active} onClick={() => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(session.id)}`)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium disabled:border-transparent disabled:bg-foreground disabled:text-on-accent"><ExternalLink size={14} />{active ? "Résultats affichés" : "Voir les résultats"}</button><Link href={`/admin/apps/generopoly/projection?session=${encodeURIComponent(session.id)}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-background px-4 text-xs font-medium"><Presentation size={14} /> Projeter</Link></div></div>; })}</div>
      {!sessions.length && <p className="px-5 py-8 text-center text-sm text-muted">Aucune participation définitivement validée pour le moment.</p>}
    </section>
    <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <Select label="Afficher" value={group} onChange={setGroup}><option value="all">Tous les groupes validés de cette journée</option>{completed.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</Select>
    </section>
    <dl className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-border py-4 lg:grid-cols-4"><Metric label="Groupes validés" value={completed.length} /><Metric label="Participants" value={participants} /><Metric label="Réponses complètes" value={completed.length} /><Metric label="Dernière mise à jour" value={lastUpdate ? formatTime(lastUpdate) : "—"} /></dl>
    <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Analyser les résultats">{views.map((item) => <button key={item.key} type="button" onClick={() => setView(item.key)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium ${view === item.key ? "bg-foreground text-on-accent" : "bg-background text-muted hover:text-foreground"}`}>{item.label}</button>)}</nav>
    {!tables.length ? <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center text-sm text-muted">Aucune participation définitivement enregistrée pour ce filtre.</div> : <>
      {view === "overview" && <Overview tables={tables} />}
      {view === "money" && <ScenarioComparison kind="money" tables={tables} />}
      {view === "time" && <ScenarioComparison kind="time" tables={tables} />}
      {view === "commitments" && <Focus tables={tables} />}
      {view === "answers" && <GroupAnswers tables={tables} />}
    </>}
  </div>;
}

function Overview({ tables }: { tables: GeneropolyTable[] }) {
  const financeInitial = averageAllocation(tables, "financeInitial", financeCategories);
  const timeInitial = averageAllocation(tables, "timeInitial", timeCategories);
  const decreases = [...financeCategories.map(([key, label]) => ({ label, change: delta(tables, "financeInitial", "financeFinal", key), unit: "€" })), ...timeCategories.map(([key, label]) => ({ label, change: delta(tables, "timeInitial", "timeFinal", key), unit: "h" }))].sort((a, b) => a.change - b.change);
  const preserved = [...decreases].sort((a, b) => Math.abs(a.change) - Math.abs(b.change));
  const leaders = [...financeInitial.map((row) => ({ ...row, unit: "€" })), ...timeInitial.map((row) => ({ ...row, unit: "h" }))].sort((a, b) => b.value - a.value).slice(0, 3);
  return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-2xl font-normal">Tendances principales</h2><p className="mt-1 text-sm text-muted">Calculées uniquement à partir des groupes ayant validé leur participation.</p><div className="mt-6 grid gap-6 lg:grid-cols-3"><Trend title="Choix les plus importants" rows={leaders.map((row) => `${row.label} · ${formatNumber(row.value)} ${row.unit}`)} /><Trend title="Plus fortes diminutions" rows={decreases.slice(0, 3).map((row) => `${row.label} · ${signed(row.change)} ${row.unit}`)} /><Trend title="Choix les plus préservés" rows={preserved.slice(0, 3).map((row) => `${row.label} · ${signed(row.change)} ${row.unit}`)} /></div></section>;
}

function Trend({ title, rows }: { title: string; rows: string[] }) { return <div><h3 className="text-sm font-semibold">{title}</h3><ol className="mt-3 space-y-2">{rows.map((row, index) => <li className="flex gap-3 text-sm text-muted" key={`${row}-${index}`}><span className="text-foreground/40">0{index + 1}</span><span>{row}</span></li>)}</ol></div>; }

function ScenarioComparison({ kind, tables }: { kind: "money" | "time"; tables: GeneropolyTable[] }) {
  const specs = kind === "money" ? [
    { title: "Situation normale", amount: "750 €", field: "financeInitial", color: "#2c6d65" },
    { title: "Imprévu ponctuel", amount: "450 €", field: "financeAfterOne", color: "#ef8c24" },
    { title: "Baisse durable", amount: "500 €", field: "financeFinal", color: "#c97992" },
  ] : [
    { title: "Situation normale", amount: "28 h", field: "timeInitial", color: "#2c6d65" },
    { title: "Imprévu", amount: "22 h", field: "timeAfterOne", color: "#ef8c24" },
    { title: "Baisse durable", amount: "18 h", field: "timeFinal", color: "#c97992" },
  ];
  const categories = kind === "money" ? financeCategories : timeCategories;
  const unit = kind === "money" ? "€" : "h";
  return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-2xl font-normal">{kind === "money" ? "Répartition de l’argent" : "Répartition du temps"}</h2><div className="mt-6 grid gap-7 xl:grid-cols-3">{specs.map((spec) => <Allocation key={spec.field} title={spec.title} amount={spec.amount} color={spec.color} unit={unit} rows={averageAllocation(tables, spec.field, categories)} />)}</div></section>;
}

function Allocation({ title, amount, color, unit, rows }: { title: string; amount: string; color: string; unit: string; rows: { key: string; label: string; value: number }[] }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <div><div className="mb-4 flex items-end justify-between gap-3"><h3 className="text-sm font-semibold">{title}</h3><strong className="font-title text-xl font-normal" style={{ color }}>{amount}</strong></div><div className="space-y-4">{rows.map((row) => <div key={row.key}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="truncate text-muted">{row.label}</span><strong>{formatNumber(row.value)} {unit}</strong></div><div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full" style={{ width: `${row.value / maximum * 100}%`, backgroundColor: color }} /></div></div>)}</div></div>;
}

function Focus({ tables }: { tables: GeneropolyTable[] }) {
  const dimensions = [
    { emoji: "💚", title: "Générosité financière", key: "generosity", fields: ["financeInitial", "financeAfterOne", "financeFinal"], unit: "€" },
    { emoji: "✝️", title: "Vie spirituelle", key: "spiritual", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
    { emoji: "🤝", title: "Service et solidarité", key: "service", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
  ];
  return <section className="rounded-2xl bg-foreground p-5 text-on-accent sm:p-6"><h2 className="font-title text-2xl font-normal">Engagements envers Dieu, l’Église et les autres</h2><div className="mt-6 grid gap-4 lg:grid-cols-3">{dimensions.map((dimension) => { const categories = dimension.unit === "€" ? financeCategories : timeCategories; const averages = dimension.fields.map((field) => averageAllocation(tables, field, categories).find((row) => row.key === dimension.key)?.value ?? 0); const counts = evolutionSummary(tables, dimension.fields[0], dimension.fields[2], dimension.key); const total = tables.length || 1; return <article className="rounded-2xl bg-white/8 p-5" key={dimension.title}><span className="text-2xl">{dimension.emoji}</span><h3 className="mt-3 text-sm font-semibold">{dimension.title}</h3><div className="mt-5 grid grid-cols-3 gap-2 text-center">{averages.map((value, index) => <div key={index}><strong className="block text-lg">{formatNumber(value)}{dimension.unit}</strong><span className="text-[9px] text-white/55">{["Normal", "Imprévu", "Durable"][index]}</span></div>)}</div><ul className="mt-5 grid grid-cols-2 gap-2 text-[11px] text-white/65"><li>{percent(counts.increased, total)} augmenté</li><li>{percent(counts.decreased, total)} diminué</li><li>{percent(counts.maintained, total)} maintenu</li><li>{percent(counts.suspended, total)} suspendu</li></ul></article>; })}</div></section>;
}

function GroupAnswers({ tables }: { tables: GeneropolyTable[] }) {
  const [query, setQuery] = useState(""); const [mission, setMission] = useState("all"); const [answerGroup, setAnswerGroup] = useState("all");
  const answers = useMemo(() => extractAnswers(tables).filter((answer) => (mission === "all" || answer.mission === mission) && (answerGroup === "all" || answer.tableId === answerGroup) && `${answer.group} ${answer.question} ${answer.text}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))), [tables, query, mission, answerGroup]);
  return <section className="rounded-2xl border border-border bg-background p-5 sm:p-6"><h2 className="font-title text-2xl font-normal">Réponses collectives</h2><div className="mt-5 grid gap-3 md:grid-cols-3"><label className="relative"><Search className="absolute left-3 top-3.5 text-muted" size={15} /><input className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…" /></label><select className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={mission} onChange={(event) => setMission(event.target.value)}><option value="all">Toutes les questions</option><option value="Argent">Argent</option><option value="Temps">Temps</option><option value="Miroir">Questions finales</option></select><select className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={answerGroup} onChange={(event) => setAnswerGroup(event.target.value)}><option value="all">Tous les groupes</option>{tables.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</select></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{answers.map((answer) => <article className="rounded-xl bg-surface p-4" key={answer.id}><p className="label text-[9px] text-link">{answer.group} · {answer.mission}</p><p className="mt-2 text-xs text-muted">{answer.question}</p><p className="mt-3 text-sm leading-6">{answer.text}</p></article>)}</div></section>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label className="grid gap-2 text-xs font-semibold">{label}<select className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div><dt className="text-[11px] text-muted">{label}</dt><dd className="mt-1 font-title text-2xl font-normal">{value}</dd></div>; }
function values(table: GeneropolyTable, field: string) { const value = table.state[field]; return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number | ""> : {}; }
function delta(tables: GeneropolyTable[], initial: string, current: string, key: string) { return tables.reduce((sum, table) => sum + Number(values(table, current)[key] || 0) - Number(values(table, initial)[key] || 0), 0) / Math.max(tables.length, 1); }
function signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatNumber(Math.abs(value))}`; }
function percent(value: number, total: number) { return `${Math.round(value / total * 100)} %`; }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; }
function formatTime(value: number) { return new Date(value).toLocaleString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); }
