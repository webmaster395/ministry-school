"use client";

import { useState } from "react";
import type { GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, financeCategories, timeCategories } from "@/lib/apps/generopoly-results";

const situations = [
  { label: "Situation normale", financeAvailable: 750, timeAvailable: 28 },
  { label: "Imprévu ponctuel", financeAvailable: 450, timeAvailable: 22 },
  { label: "Baisse durable", financeAvailable: 500, timeAvailable: 18 },
] as const;

const dimensions = [
  { emoji: "💚", title: "Générosité financière", key: "generosity", fields: ["financeInitial", "financeAfterOne", "financeFinal"], categories: financeCategories, unit: "€", ring: "#83DDAE", kind: "finance" },
  { emoji: "✝️", title: "Vie spirituelle", key: "spiritual", fields: ["timeInitial", "timeAfterOne", "timeFinal"], categories: timeCategories, unit: "h", ring: "#E9A3B3", kind: "time" },
  { emoji: "🤝", title: "Service et solidarité", key: "service", fields: ["timeInitial", "timeAfterOne", "timeFinal"], categories: timeCategories, unit: "h", ring: "#F4A340", kind: "time" },
] as const;

type Dimension = typeof dimensions[number];
type AllocationValue = ReturnType<typeof averageAllocation>[number] | undefined;

export default function GeneropolyFocusRings({ tables }: { tables: GeneropolyTable[] }) {
  const [situation, setSituation] = useState(0);
  const current = situations[situation];
  return <div className="rounded-[24px] bg-[#173F45] p-5 text-white sm:p-7">
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Situation des priorités">{situations.map((item, index) => <button type="button" role="tab" aria-selected={situation === index} onClick={() => setSituation(index)} key={item.label} className={`rounded-full border px-3 py-1.5 text-xs transition ${situation === index ? "border-white/50 bg-white text-[#173F45]" : "border-white/20 bg-white/5 text-white/75 hover:bg-white/10"}`}>{item.label}</button>)}</div>
    <p className="mt-4 min-h-11 rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 text-sm leading-5 text-white/78">{situation === 2 ? "Vos ressources diminuent durablement. En parallèle, votre église locale a besoin de soutien financier et recherche des bénévoles." : situation === 1 ? "Un imprévu ponctuel réduit les ressources disponibles : les groupes doivent réorganiser leurs priorités." : "Voici les choix des groupes lorsque leurs ressources sont pleinement disponibles."}</p>
    <div className="mt-6 grid gap-4 lg:grid-cols-3">{dimensions.map((dimension) => {
      const values = dimension.fields.map((field) => averageAllocation(tables, field, dimension.categories).find((row) => row.key === dimension.key));
      const available = dimension.kind === "finance" ? current.financeAvailable : current.timeAvailable;
      return <FocusRing key={dimension.key} dimension={dimension} normal={values[0]} value={values[situation]} available={available} comparison={situation > 0} />;
    })}</div>
  </div>;
}

function FocusRing({ dimension, normal, value, available, comparison }: { dimension: Dimension; normal: AllocationValue; value: AllocationValue; available: number; comparison: boolean }) {
  const hasValue = Boolean(value?.sampleCount);
  const hasNormal = Boolean(normal?.sampleCount);
  const share = hasValue ? Math.max(0, Math.min(100, value!.value / available * 100)) : null;
  const percentChange = hasValue && hasNormal && normal!.value > 0 ? (value!.value - normal!.value) / normal!.value * 100 : null;
  const circumference = 289.03;
  const dash = share === null ? 0 : circumference * share / 100;
  return <article className="rounded-2xl border border-white/10 bg-white/[.075] p-5 text-center"><div className="flex items-center justify-center gap-2"><span className="text-xl">{dimension.emoji}</span><h3 className="text-sm font-medium sm:text-base">{dimension.title}</h3></div><div className="relative mx-auto mt-5 grid h-36 w-36 place-items-center"><svg viewBox="0 0 112 112" className="h-36 w-36 -rotate-90" aria-hidden><circle cx="56" cy="56" r="46" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="9"/><circle cx="56" cy="56" r="46" fill="none" stroke={dimension.ring} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} className="transition-all duration-1000 ease-out motion-reduce:transition-none"/></svg><div className="absolute inset-0 grid place-items-center"><div><strong className="block text-2xl font-medium leading-none">{share === null ? "—" : `${format(share)} %`}</strong><span className="mt-1 block text-[9px] uppercase tracking-[.1em] text-white/55">du {dimension.kind === "finance" ? "budget" : "temps"}</span></div></div></div><p className="mt-4 text-sm text-white/65">{hasValue ? `${format(value!.value)} ${dimension.unit}` : "Donnée indisponible"}</p>{comparison && <div className="mt-3 min-h-10 text-xs">{hasValue && hasNormal ? <><p className="text-white/50">vs {format(normal!.value)} {dimension.unit} en temps normal</p><p className="mt-1 font-semibold" style={{ color: percentChange === null ? "#c6d5d3" : percentChange > 0 ? "#83DDAE" : percentChange < 0 ? "#ff9f91" : "#c6d5d3" }}>{evolution(percentChange, normal!.value, value!.value)}</p></> : <p className="text-white/45">Comparaison indisponible</p>}</div>}</article>;
}

function evolution(percentChange: number | null, initial: number, current: number) {
  if (initial === 0 && current === 0) return "= Maintenu à zéro";
  if (percentChange === null) return current > initial ? "↗ Augmenté depuis zéro" : "= Maintenu";
  if (percentChange === 0) return "= Maintenu";
  if (current === 0) return "↘ −100 % · Suspendu";
  return `${percentChange > 0 ? "↗" : "↘"} ${signed(percentChange)} %`;
}

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`; }
