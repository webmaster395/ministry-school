"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Heart, Lightbulb, Save, Sparkles, UsersRound } from "lucide-react";
import { naturalSkillCategories, spiritualGifts, type GraceTestKey } from "@/lib/apps/grace-identity";
import SkillReviewLink from "@/components/apps/SkillReviewLink";
import SpiritualGiftsJourney from "@/components/apps/SpiritualGiftsJourney";
import FruitSpiritJourney from "@/components/apps/FruitSpiritJourney";

type RecordRow = { test_key: GraceTestKey; answers: Record<string, unknown>; results: Record<string, unknown>; completed_at: string | null; updated_at: string };
const testMeta: Record<GraceTestKey, { title: string; text: string; icon: typeof Heart }> = {
  fruit: { title: "Le fruit de l’Esprit", text: "Évalue les neuf caractéristiques du fruit de l’Esprit.", icon: Heart },
  gifts: { title: "Mes dons spirituels", text: "Découvre sept dons spirituels et ce que tu reconnais dans ta vie.", icon: Sparkles },
  skills: { title: "Mes compétences naturelles", text: "Identifie les compétences que tu aimes utiliser naturellement.", icon: Lightbulb },
};

export default function GraceIdentityTool({ initial, preview, initialTest = null }: { initial: RecordRow[]; preview: boolean; initialTest?: GraceTestKey | null }) {
  const [records, setRecords] = useState<RecordRow[]>(initial);
  const [active, setActive] = useState<GraceTestKey | null>(() => initialTest && initial.some((item) => item.test_key === initialTest && item.completed_at) ? initialTest : null);
  const [saving, setSaving] = useState(false);
  const byKey = useMemo(() => new Map(records.map((item) => [item.test_key, item])), [records]);
  const save = async (testKey: GraceTestKey, answers: Record<string, unknown>, close = true) => {
    setSaving(true);
    const response = await fetch("/api/apps/grace-identity", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ testKey, answers }) });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) throw new Error(payload.error ?? "Enregistrement impossible.");
    setRecords((current) => [...current.filter((item) => item.test_key !== testKey), payload.record]);
    if (close) setActive(null);
  };
  if (active === "fruit") return <FruitSpiritJourney initial={byKey.get("fruit")?.answers ?? {}} saving={saving} onBack={() => setActive(null)} onSave={(answers) => save("fruit", answers, false)} />;
  if (active === "gifts") return <SpiritualGiftsJourney initial={byKey.get("gifts")?.answers ?? {}} saving={saving} onBack={() => setActive(null)} onSave={(answers) => save("gifts", answers, false)} />;
  if (active) return <TestScreen testKey={active} initial={byKey.get(active)?.answers ?? {}} saving={saving} onBack={() => setActive(null)} onSave={save} />;
  return <div className="mx-auto max-w-5xl space-y-7 pb-10">
    <header className="max-w-3xl"><Link href="/etudiant/identite" className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Mon identité</Link><p className="label text-[11px] text-muted">MES OUTILS</p><h1 className="mt-2 font-title text-4xl tracking-tight sm:text-5xl">Je suis ce que je suis par la grâce de Dieu</h1><p className="mt-4 text-base leading-7 text-muted">Découvre le fruit de l’Esprit, explore tes dons spirituels et identifie tes compétences naturelles. Avance à ton rythme et prends le temps de mieux te connaître.</p>{preview && <p className="mt-4 inline-flex rounded-full bg-[#f8e7bd] px-3 py-1.5 text-xs font-medium text-[#765311]">Aperçu Super admin — cet outil reste invisible aux étudiants.</p>}</header>
    <div className="grid gap-4 md:grid-cols-3">{(Object.keys(testMeta) as GraceTestKey[]).map((key) => { const item = testMeta[key]; const Icon = item.icon; const done = byKey.has(key); return <section key={key} className="flex min-h-64 flex-col rounded-[24px] border border-border bg-background p-5 sm:p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface"><Icon size={22} /></span><h2 className="mt-6 font-title text-2xl">{item.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{item.text}</p><button type="button" onClick={() => setActive(key)} className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-on-accent">{done ? <><Check size={16} /> Voir mes résultats</> : "Commencer"}</button></section>; })}</div>
  </div>;
}

function TestScreen({ testKey, initial, saving, onBack, onSave }: { testKey: "skills"; initial: Record<string, unknown>; saving: boolean; onBack: () => void; onSave: (key: GraceTestKey, answers: Record<string, unknown>) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");
  const set = (key: string, value: unknown) => setAnswers((current) => ({ ...current, [key]: value }));
  const submit = async () => { setError(""); try { await onSave(testKey, answers); } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); } };
  const meta = testMeta[testKey];
  return <div className="mx-auto max-w-4xl space-y-6 pb-10"><button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Tous les tests</button><header><p className="label text-[11px] text-muted">AUTOÉVALUATION PERSONNELLE</p><h1 className="mt-2 font-title text-4xl tracking-tight">{meta.title}</h1></header><Skills answers={answers} set={set} /><div className="sticky bottom-3 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur"><span className="mr-auto text-xs text-muted">Tes réponses restent personnelles et peuvent être modifiées.</span>{error && <span className="text-xs text-red-700">{error}</span>}<button type="button" disabled={saving} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-on-accent disabled:opacity-50"><Save size={16} />{saving ? "Enregistrement…" : "Enregistrer mes réponses"}</button></div></div>;
}

function GiftsJourney({ initial, saving, onBack, onSave }: { initial: Record<string, unknown>; saving: boolean; onBack: () => void; onSave: (answers: Record<string, unknown>) => Promise<void> }) {
  const completed = spiritualGifts.every(([key]) => ["Oui", "Peut-être", "Non"].includes(String(initial[key] ?? "")));
  const [step, setStep] = useState(completed ? spiritualGifts.length : 0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const answer = (value: "Oui" | "Peut-être" | "Non") => {
    const [key] = spiritualGifts[step];
    setAnswers((current) => ({ ...current, [key]: value }));
    if (step < spiritualGifts.length - 1) setStep((current) => current + 1);
  };
  const finish = async () => {
    setError("");
    try { await onSave(answers); setStep(spiritualGifts.length); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); setStep(spiritualGifts.length - 1); }
  };

  if (step === spiritualGifts.length) {
    return <div className="mx-auto max-w-4xl space-y-7 pb-10"><button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Tous les tests</button><header className="max-w-2xl"><p className="label text-[11px] text-muted">MES DONS SPIRITUELS</p><h1 className="mt-2 font-title text-4xl tracking-tight sm:text-5xl">Ce que tu reconnais aujourd’hui</h1><p className="mt-3 leading-7 text-muted">Cette autoévaluation est une invitation à prier, à mettre en pratique et à échanger avec d’autres chrétiens — pas une certitude définitive.</p></header><section className="grid gap-4 md:grid-cols-2">{spiritualGifts.map(([key, name, definition, , , guidance]) => { const value = answers[key]; const highlighted = value === "Oui"; return <article key={key} className={`rounded-[22px] border p-5 ${highlighted ? "border-[#b6d4d1] bg-[#edf6f4]" : "border-border bg-background"}`}><div className="flex items-start justify-between gap-3"><h2 className="font-title text-2xl">{name}</h2><span className={`shrink-0 rounded-full px-3 py-1 text-xs ${highlighted ? "bg-[#173f45] text-white" : value === "Peut-être" ? "bg-[#f8e7bd] text-[#765311]" : "bg-surface text-muted"}`}>{highlighted ? "Je le reconnais" : value === "Peut-être" ? "À explorer" : "À discerner"}</span></div><p className="mt-2 text-sm leading-6 text-muted">{definition}</p><p className="mt-5 border-l-[3px] border-[#d8ec6a] pl-3 text-sm leading-6">{guidance}</p></article>; })}</section><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4"><button type="button" onClick={() => setStep(0)} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Modifier mes réponses</button><button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-on-accent"><Sparkles size={16} /> Faire les autres tests</button></div></div>;
  }

  const [, name, , , question] = spiritualGifts[step];
  const choice = answers[spiritualGifts[step][0]];
  return <div className="mx-auto flex min-h-[72vh] max-w-3xl flex-col justify-center py-8"><div className="mb-9 flex items-center justify-between"><button type="button" onClick={() => step === 0 ? onBack() : setStep((current) => current - 1)} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> {step === 0 ? "Tous les tests" : "Retour"}</button><span className="text-sm text-muted">Question {step + 1} sur {spiritualGifts.length}</span></div><div className="h-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-[#173f45] transition-all duration-500" style={{ width: `${((step + 1) / spiritualGifts.length) * 100}%` }} /></div><p className="label mt-9 text-[11px] text-muted">MES DONS SPIRITUELS</p><h1 className="mt-3 font-title text-2xl leading-snug tracking-tight sm:text-3xl">{question}</h1><p className="mt-5 text-sm text-muted">Il n’y a pas de bonne ou de mauvaise réponse.</p><div className="mt-9 grid gap-3"><button type="button" aria-pressed={choice === "Oui"} onClick={() => answer("Oui")} className="min-h-16 rounded-2xl border border-[#173f45] bg-[#173f45] px-5 text-left text-base font-medium text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f45]">Oui, ça me ressemble</button><button type="button" aria-pressed={choice === "Peut-être"} onClick={() => answer("Peut-être")} className="min-h-16 rounded-2xl border border-[#e2c684] bg-[#fffaf0] px-5 text-left text-base font-medium text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a65e16]">Peut-être, parfois</button><button type="button" aria-pressed={choice === "Non"} onClick={() => answer("Non")} className="min-h-16 rounded-2xl border border-border bg-background px-5 text-left text-base font-medium text-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173f45]">Non, pas vraiment</button></div>{step === spiritualGifts.length - 1 && <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" disabled={!choice || saving} onClick={finish} className="min-h-11 rounded-full bg-foreground px-5 text-sm font-medium text-on-accent disabled:opacity-50">{saving ? "Enregistrement…" : "Voir mes résultats"}</button>{error && <span className="text-sm text-red-700">{error}</span>}</div>}</div>;
}

function Gifts({ answers, set }: { answers: Record<string, unknown>; set: (key: string, value: unknown) => void }) { return <section className="space-y-4">{spiritualGifts.map(([key, name, definition, example]) => <article key={key} className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-xl">{name}</h2><p className="mt-2 text-sm leading-6 text-muted">{definition}</p><p className="mt-3 rounded-xl bg-surface p-3 text-xs leading-5 text-muted">{example}</p><div className="mt-4 flex flex-wrap gap-2">{["Oui", "Peut-être", "Non"].map((choice) => <button type="button" key={choice} onClick={() => set(key, choice)} aria-pressed={answers[key] === choice} className={`min-h-10 rounded-full border px-4 text-sm ${answers[key] === choice ? "border-foreground bg-foreground text-on-accent" : "border-border"}`}>{choice}</button>)}</div></article>)}<p className="rounded-xl bg-surface p-4 text-xs leading-5 text-muted">Cette synthèse est une autoévaluation personnelle : elle n’est pas une certification spirituelle.</p></section>; }
function Skills({ answers, set }: { answers: Record<string, unknown>; set: (key: string, value: unknown) => void }) { const selected = new Set(Array.isArray(answers.selected) ? answers.selected.filter((item): item is string => typeof item === "string") : []); const toggle = (skill: string) => { selected.has(skill) ? selected.delete(skill) : selected.add(skill); set("selected", [...selected]); }; return <section className="space-y-5"><p className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted">Parmi les compétences suivantes, sélectionne celles que tu aimes utiliser naturellement et dans lesquelles tu te sens particulièrement à l’aise.</p><p className="text-sm font-medium text-foreground">{selected.size} compétence{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</p>{naturalSkillCategories.map((category) => <section key={category.title} className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-2xl">{category.title}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{category.skills.map((skill) => <label key={skill} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border-soft px-3 text-sm"><input type="checkbox" checked={selected.has(skill)} onChange={() => toggle(skill)} className="h-4 w-4 accent-foreground" />{skill}</label>)}</div></section>)}{selected.size > 0 && <section className="space-y-5"><div className="rounded-2xl bg-surface p-5"><div className="flex items-center gap-2"><UsersRound size={18} /><h2 className="font-title text-xl">Ma sélection</h2></div><p className="mt-3 text-sm leading-6 text-muted">{[...selected].join(" · ")}</p></div><SkillReviewLink skills={[...selected]} /></section>}</section>; }
