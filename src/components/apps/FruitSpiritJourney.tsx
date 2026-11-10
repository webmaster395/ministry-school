"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Save, Sparkles } from "lucide-react";
import { fruitTraits } from "@/lib/apps/grace-identity";
import styles from "./FruitSpiritJourney.module.css";

type Page = "discover" | "intro" | "evaluate" | "results";

const scoreLabels = [
  [1, "Très peu"],
  [2, "Un peu"],
  [3, "Parfois"],
  [4, "Souvent"],
  [5, "Beaucoup"],
] as const;

export default function FruitSpiritJourney({ initial, saving, onBack, onSave }: {
  initial: Record<string, unknown>;
  saving: boolean;
  onBack: () => void;
  onSave: (answers: Record<string, unknown>) => Promise<void>;
}) {
  const isComplete = fruitTraits.every((trait) => validScore(initial[trait.key]));
  const firstMissing = Math.max(0, fruitTraits.findIndex((trait) => !validScore(initial[trait.key])));
  const [page, setPage] = useState<Page>(isComplete ? "results" : "discover");
  const [step, setStep] = useState(firstMissing);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page, step]);

  const groups = useMemo(() => {
    const strong = fruitTraits.filter((trait) => Number(answers[trait.key]) >= 4);
    const growing = fruitTraits.filter((trait) => Number(answers[trait.key]) === 3);
    const cultivate = fruitTraits.filter((trait) => Number(answers[trait.key]) <= 2);
    return { strong, growing, cultivate };
  }, [answers]);

  const choose = async (score: number) => {
    const trait = fruitTraits[step];
    const nextAnswers = { ...answers, [trait.key]: score };
    setAnswers(nextAnswers);
    setError("");
    if (step < fruitTraits.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    try {
      await onSave(nextAnswers);
      setPage("results");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    }
  };

  const saveChallenges = async () => {
    setError("");
    try { await onSave(answers); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Enregistrement impossible."); }
  };

  if (page === "discover") return <Shell>
    <div className={`${styles.frame} ${styles.coverFrame}`}>
      <p className={styles.eyebrow}>MINISTRY SCHOOL <span /></p>
      <div className={styles.coverCopy}>
        <p className={styles.eyebrow}>UN CHEMIN DE CROISSANCE</p>
        <h1 className={styles.title}>LE FRUIT<br />DE L’ESPRIT.</h1>
        <p className={styles.lead}>Découvre ce qui grandit déjà dans ta vie et ce que tu peux encore laisser mûrir.</p>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={onBack} className={styles.ghost}><ArrowLeft size={16} /> Tous les tests</button>
        <button type="button" onClick={() => setPage("intro")} className={styles.pill}>Commencer mon parcours <ArrowRight size={18} /></button>
      </div>
    </div>
  </Shell>;

  if (page === "intro") return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.introFrame}`}>
      <p className={styles.eyebrow}>01 — DÉCOUVRIR</p>
      <div className={styles.introCopy}>
        <h1 className={styles.title}>UN FRUIT.<br />NEUF EXPRESSIONS.</h1>
        <p className={styles.lead}>Le caractère de Jésus prend forme en nous, un pas après l’autre.</p>
      </div>
      <div className={styles.traitList}>{fruitTraits.map((trait, index) => <span key={trait.key}><b>{String(index + 1).padStart(2, "0")}</b>{trait.name}</span>)}</div>
      <div className={styles.actions}>
        <button type="button" onClick={() => setPage("discover")} className={styles.ghost}><ArrowLeft size={16} /> Retour</button>
        <button type="button" onClick={() => setPage("evaluate")} className={styles.pill}>Continuer <ArrowRight size={18} /></button>
      </div>
    </div>
  </Shell>;

  if (page === "evaluate") {
    const trait = fruitTraits[step];
    return <Shell className={styles.softIvory}>
      <div className={`${styles.frame} ${styles.questionFrame}`}>
        <div className={styles.progress}><span>{String(step + 1).padStart(2, "0")} / 09</span><i><b style={{ width: `${((step + 1) / fruitTraits.length) * 100}%` }} /></i></div>
        <div className={styles.questionCopy}>
          <p className={styles.eyebrow}>TON PARCOURS · {trait.name.toUpperCase()}</p>
          <h1 className={styles.question}>{trait.description}</h1>
        </div>
        <div className={styles.scale} aria-label={`Autoévaluation : ${trait.name}`}>
          {scoreLabels.map(([score, label]) => <button type="button" key={score} aria-pressed={Number(answers[trait.key]) === score} onClick={() => void choose(score)} className={Number(answers[trait.key]) === score ? styles.choiceActive : styles.choice}><b>{score}</b><span>{label}</span></button>)}
        </div>
        <p className={styles.hint}>Choisis ce qui te ressemble aujourd’hui. Il n’y a pas de bonne ou de mauvaise réponse.</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button type="button" onClick={() => step === 0 ? setPage("intro") : setStep((current) => current - 1)} className={styles.ghost}><ArrowLeft size={16} /> Retour</button>
          {saving && <span className={styles.saving}>Enregistrement…</span>}
        </div>
      </div>
    </Shell>;
  }

  return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.resultsFrame}`}>
      <p className={styles.eyebrow}>TON JARDIN AUJOURD’HUI</p>
      <h1 className={`${styles.title} ${styles.resultsTitle}`}>CE QUI GRANDIT EN TOI.</h1>
      <p className={styles.lead}>Un regard bienveillant sur ton chemin d’aujourd’hui, accompagné d’actions simples à essayer cette semaine.</p>
      <section className={styles.summaryGrid}>
        <Summary count={groups.strong.length} title="Ce qui porte déjà du fruit" text="Les qualités que tu reconnais régulièrement dans ta vie." tone="red" />
        <Summary count={groups.growing.length} title="Ce qui est en train de grandir" text="Les qualités présentes que tu peux encore fortifier." tone="green" />
        <Summary count={groups.cultivate.length} title="Ce qui demande de l’attention" text="Les qualités à cultiver avec douceur et persévérance." tone="orange" />
      </section>
      <section className={styles.fruitGrid}>{fruitTraits.map((trait) => {
        const score = Math.min(5, Math.max(1, Number(answers[trait.key]) || 1));
        const doneKey = `challenge_${trait.key}`;
        return <article key={trait.key} className={styles.fruitCard}>
          <div className={styles.fruitHeading}><div><p className={styles.eyebrow}>{score >= 4 ? "PORTE DU FRUIT" : score === 3 ? "EN CROISSANCE" : "À CULTIVER"}</p><h2>{trait.name}</h2></div><strong>{score}<small>/5</small></strong></div>
          <p>{trait.encouragements[score - 1]}</p>
          <div className={styles.challenge}><b>TON DÉFI CETTE SEMAINE</b><p>{trait.challenges[score - 1]}</p></div>
          <label><input type="checkbox" checked={Boolean(answers[doneKey])} onChange={(event) => setAnswers((current) => ({ ...current, [doneKey]: event.target.checked }))} /> <span className={Boolean(answers[doneKey]) ? styles.done : ""}>{Boolean(answers[doneKey]) && <Check size={14} />} Défi réalisé</span></label>
        </article>;
      })}</section>
      <div className={styles.actions}>
        <button type="button" onClick={onBack} className={styles.ghost}><Sparkles size={16} /> Faire les autres tests</button>
        <div className={styles.saveArea}>{error && <span className={styles.error}>{error}</span>}<button type="button" disabled={saving} onClick={() => void saveChallenges()} className={styles.pill}><Save size={16} /> {saving ? "Enregistrement…" : "Enregistrer mes défis"}</button></div>
      </div>
    </div>
  </Shell>;
}

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`${styles.shell} ${className}`}>{children}</main>;
}

function Summary({ count, title, text, tone }: { count: number; title: string; text: string; tone: "red" | "green" | "orange" }) {
  return <article className={`${styles.summary} ${styles[tone]}`}><b>{String(count).padStart(2, "0")}</b><div><h2>{title}</h2><p>{text}</p></div></article>;
}

function validScore(value: unknown) {
  const score = Number(value);
  return score >= 1 && score <= 5;
}
