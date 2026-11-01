"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import type { GeneropolySession, GeneropolySnapshot, GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, completedTables, evolutionSummary, extractAnswers, financeCategories, timeCategories } from "@/lib/apps/generopoly-results";

export default function GeneropolyResults({ sessions, snapshot }: { sessions: GeneropolySession[]; snapshot: GeneropolySnapshot }) {
  const router = useRouter();
  const completed = completedTables(snapshot);
  const [group, setGroup] = useState("all");
  const tables = group === "all" ? completed : completed.filter((table) => table.id === group);
  return <div className="space-y-6">
    <section className="grid gap-4 rounded-[24px] border border-[#20302e]/10 bg-white p-5 sm:grid-cols-2 sm:p-6">
      <Select label="Journée" value={snapshot.session?.id ?? ""} onChange={(value) => router.push(`/admin/apps/generopoly/results?session=${encodeURIComponent(value)}`)}>{sessions.map((session) => <option value={session.id} key={session.id}>{formatDate(session.session_date) || session.title}</option>)}</Select>
      <Select label="Groupe" value={group} onChange={setGroup}><option value="all">Tous les groupes de cette journée</option>{completed.map((table) => <option key={table.id} value={table.id}>{table.name}</option>)}</Select>
    </section>
    <div className="grid gap-4 sm:grid-cols-3"><Metric label="Participations validées" value={completed.length} /><Metric label="Groupes affichés" value={tables.length} /><Metric label="Participants" value={tables.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0)} /></div>
    {tables.length ? <>
      <Situation title="Situation normale" subtitle="Répartition moyenne du budget initial de 750 € et des 28 h disponibles." tables={tables} financeField="financeInitial" timeField="timeInitial" />
      <Situation title="Face à un imprévu ponctuel" subtitle="Nouvelles moyennes : budget de 450 € et temps disponible de 22 h." tables={tables} financeField="financeAfterOne" timeField="timeAfterOne" compareFinance="financeInitial" compareTime="timeInitial" />
      <Situation title="Face à une baisse durable" subtitle="Nouvelles moyennes : budget de 500 € et temps disponible de 18 h." tables={tables} financeField="financeFinal" timeField="timeFinal" compareFinance="financeInitial" compareTime="timeInitial" />
      <Focus tables={tables} />
      <GroupAnswers tables={tables} />
    </> : <div className="rounded-[24px] border border-dashed border-[#20302e]/20 bg-white p-12 text-center text-[#697572]">Aucune participation définitivement enregistrée pour ce filtre.</div>}
  </div>;
}

function Situation({ title, subtitle, tables, financeField, timeField, compareFinance, compareTime }: { title: string; subtitle: string; tables: GeneropolyTable[]; financeField: string; timeField: string; compareFinance?: string; compareTime?: string }) {
  return <section className="rounded-[24px] border border-[#20302e]/10 bg-white p-5 sm:p-7"><h2 className="font-title text-2xl">{title}</h2><p className="mt-2 text-sm leading-6 text-[#6d7976]">{subtitle}</p><div className="mt-6 grid gap-8 xl:grid-cols-2"><Allocation title="Budget" unit="€" rows={averageAllocation(tables, financeField, financeCategories)} comparisons={compareFinance ? financeCategories.map(([key]) => evolutionSummary(tables, compareFinance, financeField, key)) : undefined} /><Allocation title="Temps" unit="h" rows={averageAllocation(tables, timeField, timeCategories)} comparisons={compareTime ? timeCategories.map(([key]) => evolutionSummary(tables, compareTime, timeField, key)) : undefined} /></div></section>;
}

function Allocation({ title, unit, rows, comparisons }: { title: string; unit: string; rows: { key: string; label: string; value: number }[]; comparisons?: ReturnType<typeof evolutionSummary>[] }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <div><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">{title}</h3>{comparisons && <span className="text-xs text-[#72807c]">comparaison au départ</span>}</div><div className="space-y-4">{rows.map((row, index) => <div key={row.key}><div className="mb-1.5 flex justify-between gap-4 text-sm"><span>{row.label}</span><strong>{formatNumber(row.value)} {unit}</strong></div><div className="h-2 overflow-hidden rounded-full bg-[#edf0ec]"><div className="h-full rounded-full bg-[#2c6d65]" style={{ width: `${row.value / maximum * 100}%` }} /></div>{comparisons?.[index] && <EvolutionLine counts={comparisons[index]} total={Object.values(comparisons[index]).reduce((a, b) => a + b, 0)} />}</div>)}</div></div>;
}

function EvolutionLine({ counts, total }: { counts: ReturnType<typeof evolutionSummary>; total: number }) {
  return <p className="mt-1.5 text-[11px] text-[#76817e]">{counts.increased} augmenté · {counts.decreased} diminué · {counts.maintained} maintenu · {counts.suspended} suspendu{total ? ` · ${Math.round(counts.increased / total * 100)} % en hausse` : ""}</p>;
}

function Focus({ tables }: { tables: GeneropolyTable[] }) {
  const dimensions = [
    { emoji: "💚", title: "Générosité financière", key: "generosity", fields: ["financeInitial", "financeAfterOne", "financeFinal"], unit: "€" },
    { emoji: "✝️", title: "Vie spirituelle", key: "spiritual", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
    { emoji: "🤝", title: "Service et solidarité", key: "service", fields: ["timeInitial", "timeAfterOne", "timeFinal"], unit: "h" },
  ];
  return <section className="rounded-[24px] bg-[#20302e] p-5 text-white sm:p-7"><h2 className="font-title text-2xl">Dieu, l’Église et les autres</h2><p className="mt-2 text-sm text-white/60">Moyennes des trois situations et évolution finale des groupes.</p><div className="mt-6 grid gap-4 lg:grid-cols-3">{dimensions.map((dimension) => { const categories = dimension.unit === "€" ? financeCategories : timeCategories; const averages = dimension.fields.map((field) => averageAllocation(tables, field, categories).find((row) => row.key === dimension.key)?.value ?? 0); const counts = evolutionSummary(tables, dimension.fields[0], dimension.fields[2], dimension.key); return <article className="rounded-[20px] bg-white/8 p-5" key={dimension.title}><span className="text-2xl">{dimension.emoji}</span><h3 className="mt-3 font-semibold">{dimension.title}</h3><div className="mt-5 grid grid-cols-3 gap-2 text-center">{averages.map((value, index) => <div key={index}><strong className="block text-xl">{formatNumber(value)}{dimension.unit}</strong><span className="text-[10px] text-white/55">{["Normal", "Imprévu", "Durable"][index]}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-white/60">{counts.increased} augmenté · {counts.decreased} diminué · {counts.maintained} maintenu · {counts.suspended} suspendu</p></article>; })}</div></section>;
}

function GroupAnswers({ tables }: { tables: GeneropolyTable[] }) {
  const [query, setQuery] = useState(""); const [mission, setMission] = useState("all");
  const answers = useMemo(() => extractAnswers(tables).filter((answer) => (mission === "all" || answer.mission === mission) && `${answer.group} ${answer.question} ${answer.text}`.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"))), [tables, query, mission]);
  return <section className="rounded-[24px] border border-[#20302e]/10 bg-white p-5 sm:p-7"><h2 className="font-title text-2xl">Justifications et réponses</h2><div className="mt-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-4 top-3.5 text-[#7b8582]" size={16} /><input className="min-h-11 w-full rounded-xl border pl-11 pr-4" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher dans les réponses…" /></label><select className="min-h-11 rounded-xl border px-4" value={mission} onChange={(event) => setMission(event.target.value)}><option value="all">Toutes les questions</option><option value="Argent">Argent</option><option value="Temps">Temps</option><option value="Miroir">Questions finales</option></select></div><div className="mt-5 grid gap-3 lg:grid-cols-2">{answers.map((answer) => <article className="rounded-2xl bg-[#f5f7f4] p-4" key={answer.id}><p className="label text-[9px] text-[#477168]">{answer.group} · {answer.mission}</p><p className="mt-2 text-xs text-[#74807d]">{answer.question}</p><p className="mt-3 text-sm leading-6">{answer.text}</p></article>)}</div></section>;
}

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <label className="grid gap-2 text-sm font-semibold">{label}<select className="min-h-12 rounded-xl border px-4" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[22px] border border-[#20302e]/10 bg-white p-5"><span className="flex items-center gap-2 text-sm text-[#6d7976]"><Users size={15} />{label}</span><strong className="mt-3 block font-title text-4xl">{value}</strong></div>; }
function formatNumber(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; }

