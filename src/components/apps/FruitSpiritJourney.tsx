"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import {
  calculateFruitSpiritV2,
  fruitSpiritAnswerScale,
  fruitSpiritFruitsV2,
  fruitSpiritLevelLabels,
  fruitSpiritSituationsV2,
  isFruitSpiritV2Complete,
  validFruitSpiritAnswer,
  type FruitSpiritLevel,
} from "@/lib/apps/fruit-spirit-v2";
import { fruitSpiritRestitutionByKeyV2 } from "@/lib/apps/fruit-spirit-restitutions-v2";
import styles from "./FruitSpiritJourney.module.css";

type Page = "discover" | "intro" | "evaluate" | "results";
const resultOrder: FruitSpiritLevel[] = ["practice", "develop", "discover"];

export default function FruitSpiritJourney({ initial, saving, onBack, onSave }: {
  initial: Record<string, unknown>;
  saving: boolean;
  onBack: () => void;
  onSave: (answers: Record<string, unknown>, completed: boolean) => Promise<void>;
}) {
  const complete = isFruitSpiritV2Complete(initial);
  const firstIncompleteSituation = Math.max(0, fruitSpiritSituationsV2.findIndex((item) => item.questions.some((question) => !validFruitSpiritAnswer(initial[question.id]))));
  const [page, setPage] = useState<Page>(complete ? "results" : "discover");
  const [step, setStep] = useState(firstIncompleteSituation);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");
  const result = useMemo(() => calculateFruitSpiritV2(answers), [answers]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page, step]);

  const situation = fruitSpiritSituationsV2[step];
  const situationComplete = situation?.questions.every((question) => validFruitSpiritAnswer(answers[question.id])) ?? false;

  const continueJourney = async () => {
    if (!situationComplete) return;
    const last = step === fruitSpiritSituationsV2.length - 1;
    const completed = last && isFruitSpiritV2Complete(answers);
    setError("");
    try {
      await onSave(answers, completed);
      if (completed) setPage("results");
      else setStep((current) => current + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    }
  };

  if (page === "discover") return <Shell>
    <div className={`${styles.frame} ${styles.coverFrame}`}>
      <p className={styles.eyebrow}>MINISTRY SCHOOL <span /></p>
      <div className={styles.coverCopy}>
        <p className={styles.eyebrow}>UN CHEMIN DE CROISSANCE</p>
        <h1 className={styles.title}>LE FRUIT<br />DE L’ESPRIT.</h1>
        <p className={styles.lead}>Découvre comment les fruits de l’Esprit se manifestent dans ton quotidien et identifie des pistes concrètes de croissance.</p>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={onBack} className={styles.ghost}><ArrowLeft size={16} /> Mon identité</button>
        <button type="button" onClick={() => setPage("intro")} className={styles.pill}>{Object.keys(initial).some((key) => key.startsWith("q")) ? "Reprendre mon parcours" : "Commencer mon parcours"} <ArrowRight size={18} /></button>
      </div>
    </div>
  </Shell>;

  if (page === "intro") return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.introFrame}`}>
      <p className={styles.eyebrow}>AVANT DE COMMENCER</p>
      <div className={styles.introCopy}>
        <h1 className={`${styles.title} ${styles.introTitle}`}>Fruit de l’Esprit</h1>
        <p className={styles.lead}>Réponds selon ton comportement habituel, et non selon ce que tu aimerais faire. Il n’y a pas de bonne ou de mauvaise réponse.</p>
      </div>
      <div className={styles.traitList}>{fruitSpiritFruitsV2.map((fruit, index) => <span key={fruit.key}><b>{String(index + 1).padStart(2, "0")}</b>{fruit.name}</span>)}</div>
      <div className={styles.actions}>
        <button type="button" onClick={() => setPage("discover")} className={styles.ghost}><ArrowLeft size={16} /> Retour</button>
        <button type="button" onClick={() => setPage("evaluate")} className={styles.pill}>Continuer <ArrowRight size={18} /></button>
      </div>
    </div>
  </Shell>;

  if (page === "evaluate") return <Shell className={styles.softIvory}>
    <div className={`${styles.frame} ${styles.questionFrame}`}>
      <div className={styles.progress}><span>{String(step + 1).padStart(2, "0")} / 09</span><i><b style={{ width: `${((step + 1) / fruitSpiritSituationsV2.length) * 100}%` }} /></i></div>
      <header className={styles.situationHeader}>
        <p className={styles.eyebrow}>SITUATION {String(step + 1).padStart(2, "0")}</p>
        <h1>{situation.title}</h1>
        <p>{situation.context}</p>
      </header>
      <div className={styles.questionList}>
        {situation.questions.map((question, questionIndex) => <section className={styles.questionBlock} key={question.id}>
          <div className={styles.questionHeading}><b>{String(questionIndex + 1).padStart(2, "0")}</b><h2>{question.prompt}</h2></div>
          <div className={styles.questionScale} aria-label={`Question ${question.position}`}>
            {fruitSpiritAnswerScale.map(({ value, label }) => <button type="button" key={value} aria-label={`${value} — ${label}`} aria-pressed={Number(answers[question.id]) === value} onClick={() => setAnswers((current) => ({ ...current, [question.id]: value }))} className={Number(answers[question.id]) === value ? styles.choiceActive : styles.choice}><b>{value}</b><span>{label}</span></button>)}
          </div>
        </section>)}
      </div>
      <p className={styles.hint}>Réponds selon ce que tu fais habituellement, et non selon ce que tu aimerais faire.</p>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" onClick={() => step === 0 ? setPage("intro") : setStep((current) => current - 1)} className={styles.ghost}><ArrowLeft size={16} /> Retour</button>
        <button type="button" disabled={!situationComplete || saving} onClick={() => void continueJourney()} className={styles.pill}>{saving ? "Enregistrement…" : step === fruitSpiritSituationsV2.length - 1 ? "Voir mes résultats" : "Situation suivante"} <ArrowRight size={18} /></button>
      </div>
    </div>
  </Shell>;

  return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.resultsFrame}`}>
      <p className={styles.eyebrow}>TES NEUF FRUITS AUJOURD’HUI</p>
      <h1 className={`${styles.title} ${styles.resultsTitle}`}>UN PARCOURS DE CROISSANCE.</h1>
      <p className={styles.lead}>Ces niveaux indiquent des pistes de croissance à partir de tes réponses. Ils ne mesurent pas définitivement ta maturité spirituelle.</p>
      <section className={styles.summaryGrid}>
        {resultOrder.map((level) => <article className={styles.summary} key={level}><b>{String(fruitSpiritFruitsV2.filter((fruit) => result.levels[fruit.key] === level).length).padStart(2, "0")}</b><div><h2>{fruitSpiritLevelLabels[level]}</h2></div></article>)}
      </section>
      <section className={styles.restitutionList} aria-label="Restitutions des neuf fruits">
        {fruitSpiritFruitsV2.map((fruit, index) => {
          const editorial = fruitSpiritRestitutionByKeyV2[fruit.key];
          const level = result.levels[fruit.key];
          const restitution = editorial.levels[level];
          return <details className={styles.restitution} key={fruit.key} open={index === 0}>
            <summary>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div><h2>{editorial.name}</h2><p>{fruitSpiritLevelLabels[level]}</p></div>
              <strong>{result.scores[fruit.key].toFixed(2).replace(".", ",")}<small>/5</small></strong>
            </summary>
            <div className={styles.restitutionBody}>
              <blockquote>{editorial.verse}</blockquote>
              <EditorialSection title={editorial.overviewTitle} content={editorial.overview} />
              <div className={styles.levelMarker}><span>TON NIVEAU</span><strong>{fruitSpiritLevelLabels[level]}</strong></div>
              <EditorialSection title="Ce que tu peux découvrir sur toi" content={restitution.discovery} />
              <EditorialSection title="Comment laisser ce fruit grandir ?" content={restitution.growth} />
              <EditorialSection title="Ton défi cette semaine" content={`${restitution.challengeTitle}\n\n${restitution.challenge}`} featured />
              <EditorialSection title="Pour aller plus loin" content={restitution.reflection} reflection />
            </div>
          </details>;
        })}
      </section>
      <div className={styles.actions}>
        <button type="button" onClick={onBack} className={styles.ghost}><Sparkles size={16} /> Retour à Mon identité</button>
        <button type="button" onClick={() => { setStep(0); setPage("evaluate"); }} className={styles.ghost}>Modifier mes réponses</button>
      </div>
    </div>
  </Shell>;
}

function EditorialSection({ title, content, featured = false, reflection = false }: { title: string; content: string; featured?: boolean; reflection?: boolean }) {
  return <section className={`${styles.editorialSection} ${featured ? styles.editorialFeatured : ""} ${reflection ? styles.editorialReflection : ""}`}>
    <h3>{title}</h3>
    {content.split("\n\n").map((paragraph, index) => <p key={`${title}-${index}`}>{paragraph}</p>)}
  </section>;
}

function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <main className={`${styles.shell} ${className}`}>{children}</main>;
}
