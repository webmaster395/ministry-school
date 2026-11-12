"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
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

type Page = "discover" | "intro" | "evaluate" | "overview" | "results";

const resultLevelOrder: FruitSpiritLevel[] = ["practice", "develop", "discover"];

export default function FruitSpiritJourney({ initial, saving, onBack, onSave }: {
  initial: Record<string, unknown>;
  saving: boolean;
  onBack: () => void;
  onSave: (answers: Record<string, unknown>, completed: boolean) => Promise<void>;
}) {
  const complete = isFruitSpiritV2Complete(initial);
  const firstIncompleteSituation = Math.max(0, fruitSpiritSituationsV2.findIndex((item) => item.questions.some((question) => !validFruitSpiritAnswer(initial[question.id]))));
  const [page, setPage] = useState<Page>(complete ? "overview" : "discover");
  const [step, setStep] = useState(firstIncompleteSituation);
  const [resultStep, setResultStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>(initial);
  const [error, setError] = useState("");
  const result = useMemo(() => calculateFruitSpiritV2(answers), [answers]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page, step, resultStep]);

  const situation = fruitSpiritSituationsV2[step];
  const situationComplete = situation?.questions.every((question) => validFruitSpiritAnswer(answers[question.id])) ?? false;
  const resultFruit = fruitSpiritFruitsV2[resultStep];
  const resultLevel = result.levels[resultFruit.key];
  const resultEditorial = fruitSpiritRestitutionByKeyV2[resultFruit.key];
  const resultRestitution = resultEditorial.levels[resultLevel];
  const resultGroups = resultLevelOrder.map((level) => ({
    level,
    label: fruitSpiritLevelLabels[level],
    fruits: fruitSpiritFruitsV2.flatMap((fruit, index) => result.levels[fruit.key] === level
      ? [{ fruit, index, score: result.scores[fruit.key] }]
      : []),
  }));

  const continueJourney = async () => {
    if (!situationComplete) return;
    const last = step === fruitSpiritSituationsV2.length - 1;
    const completed = last && isFruitSpiritV2Complete(answers);
    setError("");
    try {
      await onSave(answers, completed);
      if (completed) setPage("overview");
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

  if (page === "overview") return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.resultsFrame} ${styles.overviewFrame}`}>
      <header className={styles.overviewHeader}>
        <p className={styles.eyebrow}>TES RÉSULTATS</p>
        <h1>TES NEUF FRUITS.</h1>
        <p>Retrouve chaque fruit dans son niveau d’avancement. Sélectionne un fruit pour découvrir son résultat détaillé.</p>
      </header>
      <div className={styles.overviewGroups}>
        {resultGroups.map((group) => <section className={`${styles.overviewGroup} ${styles[`overviewGroup_${group.level}`]}`} key={group.level}>
          <header className={styles.overviewGroupHeader}>
            <div><span>NIVEAU D’AVANCEMENT</span><h2>{group.label}</h2></div>
            <strong>{group.fruits.length}<small> fruit{group.fruits.length > 1 ? "s" : ""}</small></strong>
          </header>
          {group.fruits.length > 0
            ? <div className={styles.overviewFruitList}>
              {group.fruits.map(({ fruit, index, score }) => <button type="button" className={styles.overviewFruit} key={fruit.key} onClick={() => { setResultStep(index); setPage("results"); }}>
                <span className={styles.overviewFruitIndex}>{String(index + 1).padStart(2, "0")}</span>
                <strong>{fruit.name}</strong>
                <span className={styles.overviewFruitScore}>{score.toFixed(2).replace(".", ",")}<small>/5</small></span>
                <span className={styles.overviewFruitAction}>Voir le détail <ArrowRight size={17} /></span>
              </button>)}
            </div>
            : <p className={styles.overviewEmpty}>Aucun fruit dans cette catégorie.</p>}
        </section>)}
      </div>
      <p className={styles.resultDisclaimer}>Ces résultats indiquent des pistes de croissance à partir de tes réponses. Ils ne mesurent pas définitivement ta maturité spirituelle.</p>
      <div className={styles.resultSecondary}>
        <button type="button" onClick={onBack} className={styles.ghost}>Retour à Mon identité</button>
        <button type="button" onClick={() => { setStep(0); setPage("evaluate"); }} className={styles.ghost}>Modifier mes réponses</button>
      </div>
    </div>
  </Shell>;

  return <Shell className={styles.softGreen}>
    <div className={`${styles.frame} ${styles.resultsFrame}`}>
      <button type="button" onClick={() => setPage("overview")} className={`${styles.ghost} ${styles.resultOverviewBack}`}><ArrowLeft size={16} /> Vue d’ensemble des 9 fruits</button>
      <div className={styles.resultReaderProgress}>
        <p className={styles.eyebrow}>TON PARCOURS · FRUIT {String(resultStep + 1).padStart(2, "0")} SUR 09</p>
        <div className={styles.resultDots} aria-label={`Fruit ${resultStep + 1} sur 9`}>
          {fruitSpiritFruitsV2.map((fruit, index) => <span key={fruit.key} className={index === resultStep ? styles.resultDotActive : index < resultStep ? styles.resultDotRead : styles.resultDot} />)}
        </div>
      </div>
      <header className={styles.resultHero}>
        <div><h1 id={`fruit-result-${resultFruit.key}`}>{resultEditorial.name}</h1><p>{fruitSpiritLevelLabels[resultLevel]}</p></div>
        <strong>{result.scores[resultFruit.key].toFixed(2).replace(".", ",")}<small>/5</small></strong>
      </header>
      <p className={styles.resultDisclaimer}>Ce résultat indique une piste de croissance à partir de tes réponses. Il ne mesure pas définitivement ta maturité spirituelle.</p>
      <article className={styles.restitution} aria-labelledby={`fruit-result-${resultFruit.key}`}>
        <div className={styles.restitutionBody}>
          <blockquote>{resultEditorial.verse}</blockquote>
          <EditorialSection title={resultEditorial.overviewTitle} content={resultEditorial.overview} />
          <div className={styles.levelMarker}><span>TON NIVEAU</span><strong>{fruitSpiritLevelLabels[resultLevel]}</strong></div>
          <EditorialSection title="Ce que tu peux découvrir sur toi" content={resultRestitution.discovery} />
          <EditorialSection title="Comment laisser ce fruit grandir ?" content={resultRestitution.growth} />
          <EditorialSection title="Ton défi cette semaine" content={`${resultRestitution.challengeTitle}\n\n${resultRestitution.challenge}`} featured />
          <EditorialSection title="Pour aller plus loin" content={resultRestitution.reflection} reflection />
        </div>
      </article>
      <nav className={styles.resultPager} aria-label="Navigation entre les fruits">
        {resultStep > 0
          ? <button type="button" onClick={() => setResultStep((current) => Math.max(0, current - 1))}><ArrowLeft size={18} /><span><small>FRUIT PRÉCÉDENT</small>{fruitSpiritRestitutionByKeyV2[fruitSpiritFruitsV2[resultStep - 1].key].name}</span></button>
          : <button type="button" onClick={() => setPage("overview")}><ArrowLeft size={18} /><span><small>VUE D’ENSEMBLE</small>Les 9 fruits</span></button>}
        {resultStep < fruitSpiritFruitsV2.length - 1
          ? <button type="button" onClick={() => setResultStep((current) => Math.min(fruitSpiritFruitsV2.length - 1, current + 1))}><span><small>FRUIT SUIVANT</small>{fruitSpiritRestitutionByKeyV2[fruitSpiritFruitsV2[resultStep + 1].key].name}</span><ArrowRight size={18} /></button>
          : <button type="button" onClick={() => setPage("overview")}><span><small>RETOUR AUX RÉSULTATS</small>Les 9 fruits</span><ArrowRight size={18} /></button>}
      </nav>
      <div className={styles.resultSecondary}>
        <button type="button" onClick={onBack} className={styles.ghost}>Retour à Mon identité</button>
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
