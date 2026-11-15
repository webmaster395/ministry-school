"use client";

import { useMemo, useState } from "react";
import { tieBreakQuestions } from "@/lib/results/tie-breaker";
import type { ResultProfileCode } from "@/lib/results/premium-result-model";
import type { MappResultBundle } from "@/lib/mapp/types";
import styles from "./profil-mapp.module.css";

const labels: Record<ResultProfileCode, string> = {
  conquerant: "Conquérant", communiquant: "Communicant", facilitateur: "Facilitateur", analyste: "Analyste",
};
type TieCandidate = { value: string; profile: ResultProfileCode };
const normalize: Record<string, ResultProfileCode> = {
  D: "conquerant", I: "communiquant", S: "facilitateur", C: "analyste",
  conquerant: "conquerant", communiquant: "communiquant", facilitateur: "facilitateur", analyste: "analyste",
};
export function unresolvedTie(bundle: MappResultBundle) {
  if (bundle.tieBreak) return null;
  const ranking = bundle.rankings.find((row) => row.context === "natural");
  if (!ranking?.tie_break_required) return null;
  const primary = Array.isArray(ranking.primary_candidates) ? ranking.primary_candidates : [];
  const secondary = Array.isArray(ranking.secondary_candidates) ? ranking.secondary_candidates : [];
  const raw = primary.length > 1 ? primary : secondary;
  const candidates = raw.flatMap((code): TieCandidate[] => {
    const profile = normalize[String(code)];
    return profile ? [{ value: String(code), profile }] : [];
  });
  const unique = candidates.filter((candidate, index, all) => all.findIndex((item) => item.profile === candidate.profile) === index);
  return unique.length > 1 ? unique : null;
}

export default function MappTieBreakExperience({ bundle, onResolved }: { bundle: MappResultBundle; onResolved: (bundle: MappResultBundle) => void }) {
  const candidates = useMemo(() => unresolvedTie(bundle) ?? [], [bundle]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (tieBreakQuestions.some((question: { id: string }) => !answers[question.id])) return;
    setBusy(true); setError("");
    const response = await fetch(`/api/mapp/results/${encodeURIComponent(bundle.attemptId)}/tie-break`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ resultRevisionId: bundle.resultRevisionId, answers: tieBreakQuestions.map((question: { id: string }) => ({ questionId: question.id, selectedCode: answers[question.id] })) }),
    });
    const data = await response.json();
    if (!response.ok) { setBusy(false); setError(data.error ?? "Le départage n’a pas pu être enregistré."); return; }
    onResolved(data as MappResultBundle);
  }

  return <main className={styles.shell}>
    <header className={styles.header}><a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a><div><strong>Profil MAPP</strong><span>Dernière étape</span></div><span>Départage</span></header>
    <div className={styles.progress}><span style={{ width: "100%" }} /></div>
    <section className={styles.questionnaire}>
      <div className={styles.intro}><p className={styles.eyebrow}>TON TEST EST CONSERVÉ</p><h1>Trois situations pour préciser ton profil</h1><p>Certaines tendances ressortent à égalité. Choisis simplement ce qui ressemble le plus à ton premier réflexe.</p></div>
      <div className={styles.tieBreakQuestions}>
        {tieBreakQuestions.map((question: { id: string; title: string; prompt: string; options: Record<ResultProfileCode, string> }, index: number) => <fieldset key={question.id}>
          <legend><span>{String(index + 1).padStart(2, "0")}</span><strong>{question.title}</strong><small>{question.prompt}</small></legend>
          <div>{candidates.map((candidate) => {
            return <label className={answers[question.id] === candidate.value ? styles.tieSelected : undefined} key={candidate.value}>
            <input type="radio" name={question.id} value={candidate.value} checked={answers[question.id] === candidate.value} onChange={() => setAnswers((current) => ({ ...current, [question.id]: candidate.value }))} />
            <b>{labels[candidate.profile]}</b><span>{question.options[candidate.profile]}</span>
          </label>})}</div>
        </fieldset>)}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.primaryButton} disabled={busy || tieBreakQuestions.some((question: { id: string }) => !answers[question.id])} onClick={() => void submit()} type="button">{busy ? "Enregistrement…" : "Découvrir mon profil"}</button>
    </section>
  </main>;
}
