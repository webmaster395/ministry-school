"use client";

import type { GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, comparisonAllocation, financeCategories, resultMarkers, sortAllocationRows, timeCategories, type ResultMarker } from "@/lib/apps/generopoly-results";

export type GeneropolySituation = "normal" | "event" | "durable";

const definitions = {
  normal: { financeAmount: "750 €", timeAmount: "28 h", color: "#75b5a9", financeField: "financeInitial", timeField: "timeInitial" },
  event: { financeAmount: "450 €", timeAmount: "22 h", color: "#f4a340", financeField: "financeAfterOne", timeField: "timeAfterOne" },
  durable: { financeAmount: "500 €", timeAmount: "18 h", color: "#e9a3b3", financeField: "financeFinal", timeField: "timeFinal" },
} as const;

type AverageRow = ReturnType<typeof averageAllocation>[number];
type ComparisonRow = ReturnType<typeof comparisonAllocation>[number];

export default function GeneropolySituationCharts({ tables, situation, dark = false, revealed = true }: { tables: GeneropolyTable[]; situation: GeneropolySituation; dark?: boolean; revealed?: boolean }) {
  const definition = definitions[situation];
  const comparison = situation !== "normal";
  const financeRows = comparison ? comparisonAllocation(tables, "financeInitial", definition.financeField, financeCategories) : averageAllocation(tables, definition.financeField, financeCategories);
  const timeRows = comparison ? comparisonAllocation(tables, "timeInitial", definition.timeField, timeCategories) : averageAllocation(tables, definition.timeField, timeCategories);
  return <div className="grid gap-8 xl:grid-cols-2"><AllocationPanel title="Votre argent" amount={definition.financeAmount} unit="€" color={definition.color} rows={financeRows} comparison={comparison} dark={dark} revealed={revealed} /><AllocationPanel title="Votre temps" amount={definition.timeAmount} unit="h" color={definition.color} rows={timeRows} comparison={comparison} dark={dark} revealed={revealed} /></div>;
}

function AllocationPanel({ title, amount, unit, color, rows, comparison, dark, revealed }: { title: string; amount: string; unit: string; color: string; rows: AverageRow[] | ComparisonRow[]; comparison: boolean; dark: boolean; revealed: boolean }) {
  const comparisonRows = comparison ? rows as ComparisonRow[] : [];
  const normalized = comparison ? comparisonRows : (rows as AverageRow[]).map((row) => ({ ...row, initial: row.value, current: row.value, difference: 0, percent: null, evolution: "maintained" as const }));
  const ordered = sortAllocationRows(normalized);
  const markers = comparison ? resultMarkers(comparisonRows) : new Map<string, ResultMarker[]>();
  const maximum = Math.max(...ordered.flatMap((row) => comparison ? [row.initial, row.current] : [row.current]), 1);
  const card = dark ? "border-white/10 bg-white/[.055]" : "border-border bg-background";
  const primary = dark ? "text-white" : "text-foreground";
  const secondary = dark ? "text-white/55" : "text-muted";
  const track = dark ? "bg-white/10" : "bg-surface";
  return <article className={`rounded-[22px] border p-5 sm:p-6 ${card}`}><div className="mb-6 flex items-end justify-between gap-4"><h2 className={`text-lg font-medium ${primary}`}>{title}</h2><strong className="font-title text-3xl font-normal" style={{ color }}>{amount}</strong></div><div className="space-y-4">{ordered.map((row, index) => <div className="transition-all duration-700 motion-reduce:transition-none" style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(10px)", transitionDelay: `${index * 80}ms` }} key={row.key}><div className="mb-1.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1"><span className={`flex flex-wrap items-center gap-1.5 text-sm font-medium ${primary}`}><span>{row.label}</span>{(markers.get(row.key) ?? []).map((marker) => <Marker marker={marker} dark={dark} key={marker} />)}</span><span className="flex items-center gap-2"><strong className={`text-base font-medium ${primary}`}>{row.sampleCount ? `${format(row.current)} ${unit}` : "—"}</strong>{comparison && row.sampleCount > 0 && <Variation row={row} unit={unit} dark={dark} />}</span></div><div className={`relative h-3 overflow-hidden rounded-full ${track}`}>{comparison && <div className={`absolute inset-y-0 left-0 rounded-full ${dark ? "bg-white/20" : "bg-[#d9ddda]"}`} style={{ width: row.sampleCount ? `${row.initial / maximum * 100}%` : "0%" }} />}<div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none" style={{ width: revealed && row.sampleCount ? `${row.current / maximum * 100}%` : "0%", backgroundColor: color, transitionDelay: `${index * 80}ms` }} /></div>{comparison && <p className={`mt-1 text-[10px] ${secondary}`}>Situation normale : {row.sampleCount ? `${format(row.initial)} ${unit}` : "donnée manquante"}</p>}</div>)}</div></article>;
}

function Marker({ marker, dark }: { marker: ResultMarker; dark: boolean }) {
  const labels: Record<ResultMarker, string> = { decrease: "↘ Plus forte baisse", preserved: "✓ La plus préservée", increase: "↗ Plus forte hausse" };
  const tones: Record<ResultMarker, string> = dark ? { decrease: "bg-[#8d302d] text-white", preserved: "bg-[#2c7158] text-white", increase: "bg-[#2c7158] text-white" } : { decrease: "bg-[#fbe8e5] text-[#a63832]", preserved: "bg-[#e3f2e9] text-[#23704b]", increase: "bg-[#e3f2e9] text-[#23704b]" };
  return <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${tones[marker]}`}>{labels[marker]}</span>;
}

function Variation({ row, unit, dark }: { row: ComparisonRow; unit: string; dark: boolean }) {
  const colors: Record<string, string> = dark ? { increased: "#8bd4a7", decreased: "#ff9f91", suspended: "#ff9f91", maintained: "#b8c9c5" } : { increased: "#28704c", decreased: "#b23b35", suspended: "#b23b35", maintained: "#60736f" };
  const text = row.evolution === "suspended" ? "↘ −100 % · Suspendu" : row.evolution === "maintained" ? "= Maintenu" : `${signed(row.difference)} ${unit}${row.percent === null ? " · Augmenté depuis zéro" : ` · ${signed(row.percent)} %`}`;
  return <span className="text-[11px] font-semibold" style={{ color: colors[row.evolution] }}>{text}</span>;
}

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`; }
