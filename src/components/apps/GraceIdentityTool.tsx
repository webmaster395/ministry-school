"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, Heart, Lightbulb, Save, Sparkles, UsersRound } from "lucide-react";
import { fruitTraits, naturalSkillCategories, spiritualGifts, type GraceTestKey } from "@/lib/apps/grace-identity";
import SkillReviewLink from "@/components/apps/SkillReviewLink";

type RecordRow = { test_key: GraceTestKey; answers: Record<string, unknown>; results: Record<string, unknown>; completed_at: string | null; updated_at: string };
const testMeta: Record<GraceTestKey, { title: string; text: string; icon: typeof Heart }> = {
  fruit: { title: "Le fruit de l’Esprit", text: "Évalue les neuf caractéristiques du fruit de l’Esprit.", icon: Heart },
  gifts: { title: "Mes dons spirituels", text: "Découvre sept dons spirituels et ce que tu reconnais dans ta vie.", icon: Sparkles },
  skills: { title: "Mes compétences naturelles", text: "Identifie les compétences que tu aimes utiliser naturellement.", icon: Lightbulb },
};

export default function GraceIdentityTool({ initial, preview }: { initial: RecordRow[]; preview: boolean }) {
  const [records, setRecords] = useState<RecordRow[]>(initial);
  const [active, setActive] = useState<GraceTestKey | null>(null);
  const [saving, setSaving] = useState(false);
  const byKey = useMemo(() => new Map(records.map((item) => [item.test_key, item])), [records]);
  const save = async (testKey: GraceTestKey, answers: Record<string, unknown>) => {
    setSaving(true);
    const response = await fetch("/api/apps/grace-identity", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ testKey, answers }) });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) throw new Error(payload.error ?? "Enregistrement impossible.");
    setRecords((current) => [...current.filter((item) => item.test_key !== testKey), payload.record]);
    setActive(null);
  };
  if (active) return <TestScreen testKey={active} initial={byKey.get(active)?.answers ?? {}} saving={saving} onBack={() => setActive(null)} onSave={save} />;
  return <div className="mx-auto max-w-5xl space-y-7 pb-10">
    <header className="max-w-3xl"><p className="label text-[11px] text-muted">MES OUTILS</p><h1 className="mt-2 font-title text-4xl tracking-tight sm:text-5xl">Je suis ce que je suis par la grâce de Dieu</h1><p className="mt-4 text-base leading-7 text-muted">Découvre le fruit de l’Esprit, explore tes dons spirituels et identifie tes compétences naturelles. Avance à ton rythme et prends le temps de mieux te connaître.</p>{preview && <p className="mt-4 inline-flex rounded-full bg-[#f8e7bd] px-3 py-1.5 text-xs font-medium text-[#765311]">Aperçu Super admin — cet outil reste invisible aux étudiants.</p>}</header>
    <div className="grid gap-4 md:grid-cols-3">{(Object.keys(testMeta) as GraceTestKey[]).map((key) => { const item = testMeta[key]; const Icon = item.icon; const done = byKey.has(key); return <section key={key} className="flex min-h-64 flex-col rounded-[24px] border border-border bg-background p-5 sm:p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface"><Icon size={22} /></span><h2 className="mt-6 font-title text-2xl">{item.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{item.text}</p><button type="button" onClick={() => setActive(key)} className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-on-accent">{done ? <><Check size={16} /> Voir mes résultats</> : "Commencer"}</button></section>; })}</div>
  </div>;
}

function TestScreen({ testKey, initial, saving, onBack, onSave }: { testKey: GraceTestKey; initial: Record<string, unknown>; saving: boolean; onBack: () => void; onSave: (key: GraceTestKey, answers: Record<string, unknown>) => Promise<void> }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");
  const set = (key: string, value: unknown) => setAnswers((current) => ({ ...current, [key]: value }));
  const submit = async () => { setError(""); try { await onSave(testKey, answers); } catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); } };
  const meta = testMeta[testKey];
  return <div className="mx-auto max-w-4xl space-y-6 pb-10"><button type="button" onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft size={16} /> Tous les tests</button><header><p className="label text-[11px] text-muted">AUTOÉVALUATION PERSONNELLE</p><h1 className="mt-2 font-title text-4xl tracking-tight">{meta.title}</h1></header>{testKey === "fruit" ? <Fruit answers={answers} set={set} /> : testKey === "gifts" ? <Gifts answers={answers} set={set} /> : <Skills answers={answers} set={set} />}<div className="sticky bottom-3 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur"><span className="mr-auto text-xs text-muted">Tes réponses restent personnelles et peuvent être modifiées.</span>{error && <span className="text-xs text-red-700">{error}</span>}<button type="button" disabled={saving} onClick={submit} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-on-accent disabled:opacity-50"><Save size={16} />{saving ? "Enregistrement…" : "Enregistrer mes réponses"}</button></div></div>;
}

function Fruit({ answers, set }: { answers: Record<string, unknown>; set: (key: string, value: unknown) => void }) { return <section className="space-y-3">{fruitTraits.map(([key, name, description]) => <article key={key} className="rounded-2xl border border-border bg-background p-4 sm:flex sm:items-center sm:gap-6 sm:p-5"><div className="min-w-0 flex-1"><h2 className="font-title text-xl">{name}</h2><p className="mt-1 text-sm leading-6 text-muted">{description}</p></div><div className="mt-4 flex gap-2 sm:mt-0" aria-label={`Autoévaluation : ${name}`}>{[1,2,3,4,5].map((score) => <button type="button" key={score} aria-pressed={answers[key] === score} onClick={() => set(key, score)} className={`grid h-10 w-10 place-items-center rounded-full border text-sm ${answers[key] === score ? "border-foreground bg-foreground text-on-accent" : "border-border bg-background"}`}>{score}</button>)}</div></article>)}</section>; }
function Gifts({ answers, set }: { answers: Record<string, unknown>; set: (key: string, value: unknown) => void }) { return <section className="space-y-4">{spiritualGifts.map(([key, name, definition, example]) => <article key={key} className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-xl">{name}</h2><p className="mt-2 text-sm leading-6 text-muted">{definition}</p><p className="mt-3 rounded-xl bg-surface p-3 text-xs leading-5 text-muted">{example}</p><div className="mt-4 flex flex-wrap gap-2">{["Oui", "Peut-être", "Non"].map((choice) => <button type="button" key={choice} onClick={() => set(key, choice)} aria-pressed={answers[key] === choice} className={`min-h-10 rounded-full border px-4 text-sm ${answers[key] === choice ? "border-foreground bg-foreground text-on-accent" : "border-border"}`}>{choice}</button>)}</div></article>)}<p className="rounded-xl bg-surface p-4 text-xs leading-5 text-muted">Cette synthèse est une autoévaluation personnelle : elle n’est pas une certification spirituelle.</p></section>; }
function Skills({ answers, set }: { answers: Record<string, unknown>; set: (key: string, value: unknown) => void }) { const selected = new Set(Array.isArray(answers.selected) ? answers.selected.filter((item): item is string => typeof item === "string") : []); const toggle = (skill: string) => { selected.has(skill) ? selected.delete(skill) : selected.add(skill); set("selected", [...selected]); }; return <section className="space-y-5"><p className="rounded-2xl border border-border bg-background p-5 text-sm leading-6 text-muted">Parmi les compétences suivantes, sélectionne celles que tu aimes utiliser naturellement et dans lesquelles tu te sens particulièrement à l’aise.</p><p className="text-sm font-medium text-foreground">{selected.size} compétence{selected.size > 1 ? "s" : ""} sélectionnée{selected.size > 1 ? "s" : ""}</p>{naturalSkillCategories.map((category) => <section key={category.title} className="rounded-2xl border border-border bg-background p-5"><h2 className="font-title text-2xl">{category.title}</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{category.skills.map((skill) => <label key={skill} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border-soft px-3 text-sm"><input type="checkbox" checked={selected.has(skill)} onChange={() => toggle(skill)} className="h-4 w-4 accent-foreground" />{skill}</label>)}</div></section>)}{selected.size > 0 && <section className="space-y-5"><div className="rounded-2xl bg-surface p-5"><div className="flex items-center gap-2"><UsersRound size={18} /><h2 className="font-title text-xl">Ma sélection</h2></div><p className="mt-3 text-sm leading-6 text-muted">{[...selected].join(" · ")}</p></div><SkillReviewLink skills={[...selected]} /></section>}</section>; }
