"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, Maximize2, RefreshCw, RotateCcw, X } from "lucide-react";
import type { GeneropolySession, GeneropolySnapshot, GeneropolyTable } from "@/lib/apps/generopoly";
import { averageAllocation, comparisonAllocation, completedTables, extractAnswers, financeCategories, resultMarkers, sortAllocationRows, timeCategories, type ResultMarker } from "@/lib/apps/generopoly-results";
import GeneropolyFocusRings from "@/components/apps-studio/GeneropolyFocusRings";

const slides = [
  "Quand tout va bien",
  "Face à l’imprévu",
  "Face à la baisse durable",
  "Quelle place dans nos priorités ?",
  "Question finale",
];
const colors = { normal: "#75b5a9", event: "#f39a42", durable: "#d88aa1" };

export default function GeneropolyProjection({ sessions, initial }: { sessions: GeneropolySession[]; initial: GeneropolySnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [sessionId, setSessionId] = useState(initial.session?.id ?? "");
  const [slide, setSlide] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/apps/generopoly/snapshot?session=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
      if (response.ok) setSnapshot(await response.json());
    } finally { setRefreshing(false); }
  }, [sessionId]);
  const replay = useCallback(() => { setRevealed(false); setAnimationKey((value) => value + 1); }, []);
  const selectSession = useCallback(async (nextSessionId: string) => {
    setSessionId(nextSessionId);
    setRefreshing(true);
    try {
      const response = await fetch(`/api/admin/apps/generopoly/snapshot?session=${encodeURIComponent(nextSessionId)}`, { cache: "no-store" });
      if (response.ok) setSnapshot(await response.json());
      setSlide(0);
      setRevealed(false);
      setAnimationKey((value) => value + 1);
    } finally { setRefreshing(false); }
  }, []);
  const changeSlide = useCallback(async (next: number) => {
    const bounded = Math.max(0, Math.min(slides.length - 1, next));
    if (bounded === slide) return;
    await load();
    setSlide(bounded);
    setRevealed(false);
    setAnimationKey((value) => value + 1);
  }, [load, slide]);
  useEffect(() => { const timer = window.setTimeout(() => setRevealed(true), 180); return () => window.clearTimeout(timer); }, [slide, animationKey]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") void changeSlide(slide + 1);
      if (event.key === "ArrowLeft") void changeSlide(slide - 1);
      if (event.key === " " || event.key === "Enter") { event.preventDefault(); setRevealed(true); }
      if (event.key.toLowerCase() === "r") replay();
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [changeSlide, replay, slide]);

  const tables = completedTables(snapshot);
  const selectedAnswers = useMemo(() => extractAnswers(tables).filter((answer) => answer.selected && answer.mission === "Miroir"), [tables]);
  const participants = tables.reduce((sum, table) => sum + Number(table.participantCount ?? 0), 0);
  return <main className="min-h-screen overflow-x-hidden bg-[#173F45] text-white">
    <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
      <div><strong className="font-title text-lg font-normal">Généropoly</strong><p className="text-[10px] text-white/50">{formatDate(snapshot.session?.session_date)} · {tables.length} groupes · {participants} participants</p></div>
      <select aria-label="Journée projetée" className="ml-auto min-h-9 max-w-[190px] rounded-full border border-white/15 bg-white/10 px-3 text-xs" value={sessionId} onChange={(event) => void selectSession(event.target.value)}>{sessions.map((session) => <option className="text-black" value={session.id} key={session.id}>{formatDate(session.session_date)}</option>)}</select>
      <button type="button" onClick={() => void load()} className="rounded-full p-2 hover:bg-white/10" aria-label="Actualiser"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button>
      <button type="button" onClick={() => document.documentElement.requestFullscreen()} className="rounded-full p-2 hover:bg-white/10" aria-label="Plein écran"><Maximize2 size={17} /></button>
      <Link href="/admin/apps/generopoly/results" className="rounded-full p-2 hover:bg-white/10" aria-label="Quitter"><X size={19} /></Link>
    </header>

    <section key={`${slide}-${animationKey}`} className="mx-auto flex min-h-[calc(100vh-118px)] max-w-[1380px] flex-col justify-center px-5 pb-24 pt-7 sm:px-9 lg:px-12">
      <p className="label text-[10px] tracking-[.2em] text-[#a9c5be]">{String(slide + 1).padStart(2, "0")} / 05</p>
      {slide === 0 && <SituationSlide title="Quand tout va bien" eyebrow="Situation normale" financeAmount="750 €" timeAmount="28 h" color={colors.normal} financeRows={averageAllocation(tables, "financeInitial", financeCategories)} timeRows={averageAllocation(tables, "timeInitial", timeCategories)} revealed={revealed} />}
      {slide === 1 && <SituationSlide title="Face à l’imprévu" eyebrow="Vos ressources diminuent ponctuellement" financeAmount="450 €" timeAmount="22 h" color={colors.event} financeRows={comparisonAllocation(tables, "financeInitial", "financeAfterOne", financeCategories)} timeRows={comparisonAllocation(tables, "timeInitial", "timeAfterOne", timeCategories)} revealed={revealed} />}
      {slide === 2 && <SituationSlide title="Face à la baisse durable" eyebrow="Vos ressources diminuent durablement" financeAmount="500 €" timeAmount="18 h" color={colors.durable} financeRows={comparisonAllocation(tables, "financeInitial", "financeFinal", financeCategories)} timeRows={comparisonAllocation(tables, "timeInitial", "timeFinal", timeCategories)} revealed={revealed} durableContext />}
      {slide === 3 && <FocusSlide tables={tables} revealed={revealed} />}
      {slide === 4 && <AnswersSlide answers={selectedAnswers} revealed={revealed} />}
    </section>

    <footer className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-white/10 bg-[#173F45]/95 px-4 py-3 backdrop-blur sm:px-6">
      <button type="button" disabled={slide === 0} onClick={() => void changeSlide(slide - 1)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs disabled:opacity-20"><ArrowLeft size={17} /><span className="hidden sm:inline">Précédent</span></button>
      <div className="flex min-w-0 items-center justify-center gap-2"><button type="button" onClick={() => setRevealed(true)} disabled={revealed} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs disabled:opacity-35"><Eye size={14} /> Révéler</button><button type="button" onClick={replay} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs"><RotateCcw size={14} /> Rejouer</button><div className="hidden gap-1.5 lg:flex">{slides.map((_, index) => <button type="button" aria-label={`Écran ${index + 1}`} onClick={() => void changeSlide(index)} className={`h-1.5 rounded-full transition-all ${slide === index ? "w-7 bg-[#fbeeda]" : "w-1.5 bg-white/25"}`} key={index} />)}</div></div>
      <button type="button" disabled={slide === slides.length - 1} onClick={() => void changeSlide(slide + 1)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs disabled:opacity-20"><span className="hidden sm:inline">Suivant</span><ArrowRight size={17} /></button>
    </footer>
  </main>;
}

type AverageRow = { key: string; label: string; value: number; sampleCount: number };
type ComparisonRow = ReturnType<typeof comparisonAllocation>[number];
function SituationSlide({ title, eyebrow, financeAmount, timeAmount, color, financeRows, timeRows, revealed, durableContext = false }: { title: string; eyebrow: string; financeAmount: string; timeAmount: string; color: string; financeRows: AverageRow[] | ComparisonRow[]; timeRows: AverageRow[] | ComparisonRow[]; revealed: boolean; durableContext?: boolean }) {
  const comparison = "current" in financeRows[0];
  return <div className="w-full"><p className="mt-3 text-[11px] font-semibold uppercase tracking-[.2em] text-[#a9c5be]">{eyebrow}</p><h1 className="mt-3 font-title text-3xl font-normal leading-tight text-[#fbeeda] sm:text-5xl">{title}</h1>{comparison && <p className="mt-2 text-sm text-white/60">Comparaison avec la situation normale</p>}{durableContext && <p className="mt-5 max-w-4xl rounded-2xl border border-white/10 bg-white/[.07] px-4 py-3 text-sm leading-6 text-white/80">Vos ressources diminuent durablement. En parallèle, votre église locale a besoin de soutien financier et recherche des bénévoles.</p>}<div className="mt-7 grid gap-8 xl:grid-cols-2"><ProjectionAllocation title="Votre argent" amount={financeAmount} unit="€" color={color} rows={financeRows} revealed={revealed} /><ProjectionAllocation title="Votre temps" amount={timeAmount} unit="h" color={color} rows={timeRows} revealed={revealed} /></div></div>;
}

function ProjectionAllocation({ title, amount, unit, color, rows, revealed }: { title: string; amount: string; unit: string; color: string; rows: AverageRow[] | ComparisonRow[]; revealed: boolean }) {
  const comparison = "current" in rows[0];
  const comparisonRows = comparison ? rows as ComparisonRow[] : [];
  const normalized = comparison ? comparisonRows : (rows as AverageRow[]).map((row) => ({ ...row, initial: row.value, current: row.value, difference: 0, percent: null, evolution: "maintained" as const }));
  const ordered = sortAllocationRows(normalized);
  const markers = comparison ? resultMarkers(comparisonRows) : new Map<string, ResultMarker[]>();
  const maximum = Math.max(...ordered.flatMap((row) => comparison ? [row.initial, row.current] : [row.current]), 1);
  return <article className="rounded-[22px] border border-white/10 bg-white/[.055] p-5 sm:p-6"><div className="mb-6 flex items-end justify-between gap-4"><h2 className="text-lg font-medium text-white">{title}</h2><strong className="font-title text-3xl font-normal text-[#fbeeda]">{amount}</strong></div><div className="space-y-4">{ordered.map((row, index) => {
    const current = row.current;
    const initial = row.initial;
    const sampleCount = row.sampleCount;
    return <div className="transition-all duration-700 motion-reduce:transition-none" style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(10px)", transitionDelay: `${index * 80}ms` }} key={row.key}><div className="mb-1.5 flex flex-wrap items-end justify-between gap-x-3 gap-y-1"><span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-white"><span>{row.label}</span>{(markers.get(row.key) ?? []).map((marker) => <ProjectionMarker marker={marker} key={marker} />)}</span><span className="flex items-center gap-2"><strong className="text-base font-medium text-white">{sampleCount ? `${format(current)} ${unit}` : "—"}</strong>{comparison && sampleCount > 0 && <ProjectionVariation row={row} unit={unit} />}</span></div><div className="relative h-3 overflow-hidden rounded-full bg-white/10">{comparison && <div className="absolute inset-y-0 left-0 rounded-full bg-white/20" style={{ width: sampleCount ? `${initial / maximum * 100}%` : "0%" }} />}<div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none" style={{ width: revealed && sampleCount ? `${current / maximum * 100}%` : "0%", backgroundColor: color, transitionDelay: `${index * 80}ms` }} /></div>{comparison && <p className="mt-1 text-[10px] text-white/50">Situation normale : {sampleCount ? `${format(initial)} ${unit}` : "donnée manquante"}</p>}</div>;
  })}</div></article>;
}

function ProjectionMarker({ marker }: { marker: ResultMarker }) {
  const labels: Record<ResultMarker, string> = { decrease: "↘ Plus forte baisse", preserved: "✓ La plus préservée", increase: "↗ Plus forte hausse" };
  const tones: Record<ResultMarker, string> = { decrease: "bg-[#8d302d] text-white", preserved: "bg-[#2c7158] text-white", increase: "bg-[#2c7158] text-white" };
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-normal ${tones[marker]}`}>{labels[marker]}</span>;
}

function SlideTitle({ title, subtitle, amount }: { title: string; subtitle: string; amount: string }) { return <div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-title text-3xl font-normal leading-tight sm:text-5xl">{title}</h1><p className="mt-2 text-xl text-[#a9c5be] sm:text-2xl">{subtitle}</p></div><strong className="font-title text-3xl font-normal text-[#fbeeda] sm:text-5xl">{amount}</strong></div>; }

function ProjectionVariation({ row, unit }: { row: ComparisonRow; unit: string }) {
  const colorsByEvolution: Record<string, string> = { increased: "#8bd4a7", decreased: "#ff9f91", suspended: "#ff9f91", maintained: "#b8c9c5" };
  const text = row.evolution === "suspended" ? "↘ −100 % · Suspendu" : row.evolution === "maintained" ? "= Maintenu" : `${signed(row.difference)} ${unit}${row.percent === null ? "" : ` · ${signed(row.percent)} %`}`;
  return <span className="text-xs font-semibold sm:text-sm" style={{ color: colorsByEvolution[row.evolution] }}>{text}</span>;
}

function FocusSlide({ tables, revealed }: { tables: GeneropolyTable[]; revealed: boolean }) {
  return <div className="mx-auto w-full max-w-6xl">
    <p className="mt-3 text-[11px] font-semibold uppercase tracking-[.2em] text-[#a9c5be]">Focus final</p>
    <h1 className="mt-3 font-title text-3xl font-normal leading-tight text-[#fbeeda] sm:text-5xl">Quelle place dans nos priorités&nbsp;?</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65 sm:text-base">Face aux changements, quelle part de leurs ressources les groupes ont-ils choisi de consacrer à Dieu, à l’église locale et aux autres&nbsp;?</p>
    <div className={`mt-7 transition-opacity duration-700 ${revealed ? "opacity-100" : "opacity-0"}`}><GeneropolyFocusRings tables={tables} autoPlay /></div>
    <p className="mt-5 text-xs leading-5 text-white/45">Les évolutions comparent les moyennes réelles des participations validées à la situation normale. Elles décrivent des arbitrages, sans juger les choix des groupes.</p>
  </div>;
}

function AnswersSlide({ answers, revealed }: { answers: ReturnType<typeof extractAnswers>; revealed: boolean }) {
  return <div><p className="mt-3 max-w-5xl font-title text-2xl font-normal leading-snug text-[#fbeeda] sm:text-4xl">« Face à l’imprévu, puis à la baisse durable de vos ressources, que révèlent vos choix sur la place que vous accordez à votre vie spirituelle, à votre église locale et aux autres ? »</p><div className="mt-8 grid gap-4 lg:grid-cols-2">{answers.slice(0, 6).map((answer, index) => <blockquote className="rounded-[20px] bg-white/8 p-5 text-base leading-7 transition-all duration-700 sm:text-lg" style={{ opacity: revealed ? 1 : 0, transform: revealed ? "translateY(0)" : "translateY(12px)", transitionDelay: `${index * 100}ms` }} key={answer.id}>« {answer.text} »<footer className="mt-3 text-xs text-[#a9c5be]">{answer.group} · {answer.question}</footer></blockquote>)}{answers.length === 0 && <p className="text-lg text-white/50">Sélectionnez les réponses à projeter depuis la page des résultats.</p>}</div></div>;
}

function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ","); }
function signed(value: number) { return `${value > 0 ? "+" : value < 0 ? "−" : ""}${format(Math.abs(value))}`; }
function percentage(value: number, total: number) { return total ? `${Math.round(value / total * 100)} %` : "—"; }
function formatDate(value?: string) { return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "Aucune journée"; }
