"use client";

import { useEffect, useState } from "react";
import type { MappResultBundle } from "@/lib/mapp/types";
import styles from "./profil-mapp.module.css";

type Dimension = "D" | "I" | "S" | "C";
type PendingTieBreak = {
  done: false;
  context: "natural" | "under_pressure";
  rankScope: "primary" | "secondary";
  sequence: number;
  candidates: Dimension[];
  question: string;
  options: Array<{ dimension: Dimension; text: string }>;
};
type TieBreakState = PendingTieBreak | { done: true };

const labels: Record<Dimension, string> = {
  D: "Conquérant",
  I: "Communicant",
  S: "Facilitateur",
  C: "Analyste",
};

function candidateCount(ranking: Record<string, unknown>) {
  const primary = Array.isArray(ranking.primary_candidates) ? ranking.primary_candidates : [];
  const secondary = Array.isArray(ranking.secondary_candidates) ? ranking.secondary_candidates : [];
  return Math.max(primary.length, secondary.length);
}

export function hasPendingHybridTieBreak(bundle: MappResultBundle) {
  return bundle.rankings.some((ranking) => {
    const scoringVersion = String(ranking.scoring_version ?? "");
    const isHybrid = scoringVersion.includes("hybrid") || scoringVersion.includes("pressure-duels");
    return isHybrid && !ranking.resolved_order && candidateCount(ranking) > 1;
  });
}

async function requestTieBreak(revisionId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/mapp/hybrid-44/results/${encodeURIComponent(revisionId)}/tie-break`, { cache: "no-store", signal });
  const payload = await response.json() as TieBreakState & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Le départage est momentanément indisponible.");
  return payload;
}

export default function MappHybridTieBreakExperience({ bundle }: { bundle: MappResultBundle }) {
  const [current, setCurrent] = useState<TieBreakState | null>(null);
  const [selected, setSelected] = useState<Dimension | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      const payload = await requestTieBreak(bundle.resultRevisionId);
      if (payload.done) {
        window.location.reload();
        return;
      }
      setCurrent(payload);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Le départage est momentanément indisponible.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const abort = new AbortController();
    void requestTieBreak(bundle.resultRevisionId, abort.signal).then((payload) => {
      if (payload.done) window.location.reload();
      else {
        setCurrent(payload);
        setSelected(null);
        setBusy(false);
      }
    }).catch((cause: unknown) => {
      if (abort.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : "Le départage est momentanément indisponible.");
      setBusy(false);
    });
    return () => abort.abort();
  }, [bundle.resultRevisionId]);

  async function submit() {
    if (!current || current.done || !selected) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/mapp/hybrid-44/results/${encodeURIComponent(bundle.resultRevisionId)}/tie-break`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selectedCode: selected }),
      });
      const payload = await response.json() as TieBreakState & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "La réponse n’a pas pu être enregistrée.");
      if (payload.done) {
        window.location.reload();
        return;
      }
      setCurrent(payload);
      setSelected(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "La réponse n’a pas pu être enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  const pressure = current && !current.done && current.context === "under_pressure";
  return <main className={styles.shell}>
    <header className={styles.header}>
      <a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a>
      <div><strong>Profil MAPP</strong><span>Dernière étape</span></div>
      <span>Départage</span>
    </header>
    <div className={styles.progress}><span style={{ width: "100%" }} /></div>
    <section className={styles.questionnaire}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>TON TEST EST CONSERVÉ</p>
        <h1>{pressure ? "Précise ta réaction sous pression" : "Précise ton profil"}</h1>
        <p>Deux tendances arrivent exactement au même niveau. Ce choix final permet d’enregistrer un classement unique, sans recommencer le test.</p>
      </div>
      {busy && !current ? <p className={styles.hint}>Préparation du départage…</p> : null}
      {current && !current.done ? <div className={styles.tieBreakQuestions}>
        <fieldset>
          <legend><span>{String(current.sequence).padStart(2, "0")}</span><strong>{current.question}</strong><small>Choisis la description qui ressemble le plus à ton premier réflexe.</small></legend>
          <div>{current.options.map((option) => <label className={selected === option.dimension ? styles.tieSelected : undefined} key={option.dimension}>
            <input type="radio" name="hybrid-tie-break" value={option.dimension} checked={selected === option.dimension} onChange={() => setSelected(option.dimension)} />
            <b>{labels[option.dimension]}</b><span>{option.text}</span>
          </label>)}</div>
        </fieldset>
      </div> : null}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {error && !current ? <button className={styles.primaryButton} onClick={() => void load()} type="button">Réessayer</button> : null}
      {current && !current.done ? <button className={styles.primaryButton} disabled={!selected || busy} onClick={() => void submit()} type="button">{busy ? "Enregistrement…" : "Valider ce choix"}</button> : null}
    </section>
  </main>;
}
