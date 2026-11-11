"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PreviewShell from "@/app/preview/resultat/preview-shell";
import {
  createMappLocalStoragePersistence,
  MappAnswerQueue,
} from "@/lib/mapp/answer-queue";
import {
  finalizeMappAttempt,
  saveMappAnswerBatch,
} from "@/lib/mapp/client";
import { applyTieBreak, type TieBreakRecord } from "@/lib/results/tie-breaker";
import type { ResultProfileCode } from "@/lib/results/premium-result-model";
import { toRelativePercentages } from "@/lib/results/relative-percentages";
import type {
  MappAnswerValue,
  MappQuestion,
  MappQuestionnaireContext,
  MappResultBundle,
} from "@/lib/mapp/types";
import styles from "./profil-mapp.module.css";

const pageSize = 5;
const fallbackOptions = [
  { value: 1, label: "Pas du tout vrai" },
  { value: 2, label: "Plutôt faux" },
  { value: 3, label: "Moyennement vrai" },
  { value: 4, label: "Plutôt vrai" },
  { value: 5, label: "Tout à fait vrai" },
];

type SaveState = "saved" | "pending" | "saving" | "offline" | "error";

function resultScores(bundle: MappResultBundle) {
  return bundle.scores
    .filter((row) => !row.context || row.context === "natural")
    .map((row) => ({
      code: String(row.dimensionCode ?? ""),
      name: String(row.dimensionName ?? row.dimensionCode ?? "Profil"),
      percentage: Number(row.percentage ?? 0),
    }))
    .filter((row) => Number.isFinite(row.percentage))
    .sort((left, right) => right.percentage - left.percentage);
}

const profileCodeByDimension: Record<string, ResultProfileCode> = {
  D: "conquerant",
  I: "communiquant",
  S: "facilitateur",
  C: "analyste",
  conquerant: "conquerant",
  communiquant: "communiquant",
  facilitateur: "facilitateur",
  analyste: "analyste",
};

function storedNaturalOrder(bundle: MappResultBundle) {
  const ranking = bundle.rankings.find((row) => row.context === "natural");
  if (!ranking) return [];
  const values = [
    ranking.primary_code,
    ranking.secondary_code,
    ...(Array.isArray(ranking.resolved_order) ? ranking.resolved_order : []),
    ...(Array.isArray(ranking.initial_order) ? ranking.initial_order : []),
  ];
  return values
    .map((value) => profileCodeByDimension[String(value)] ?? null)
    .filter((value): value is ResultProfileCode => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function ResultPanel({ bundle }: { bundle: MappResultBundle }) {
  const scores = resultScores(bundle);
  const calculated = applyTieBreak(
    scores.map((score) => ({ code: score.code, value: score.percentage })),
    bundle.tieBreak as TieBreakRecord | null,
  );
  const storedOrder = storedNaturalOrder(bundle);
  const scoreOrder = scores
    .map((score) => profileCodeByDimension[score.code] ?? null)
    .filter((value): value is ResultProfileCode => Boolean(value));
  const primary = calculated.primary ?? storedOrder[0] ?? scoreOrder[0] ?? null;
  const secondary = calculated.secondary
    ?? storedOrder.find((code) => code !== primary)
    ?? scoreOrder.find((code) => code !== primary)
    ?? null;
  const displayScores = toRelativePercentages(scores.map((score) => ({ code: score.code, value: score.percentage })));

  if (!primary || !secondary) return <main className={styles.resultShell}><header className={styles.resultHero}><a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a><p className={styles.eyebrow}>PROFIL MAPP · RÉSULTAT</p><h1>Résultat indisponible</h1><p>Le classement de ce passage doit être vérifié par l’équipe Ministry.</p></header></main>;

  return <div className={styles.resultShell}>
    <a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a>
    <PreviewShell
    initialProfile={primary}
    initialSecondary={secondary}
    participantName={bundle.participantName || "Ton résultat"}
    scores={displayScores}
    showControls={false}
    isPreview={false}
    attemptId={bundle.attemptId}
    revisionId={bundle.resultRevisionId}
    />
  </div>;
}

function QuestionScale({
  question,
  value,
  onChange,
}: {
  question: MappQuestion;
  value: MappAnswerValue | undefined;
  onChange: (value: number) => void;
}) {
  const options = question.options.length ? question.options : fallbackOptions;
  return (
    <fieldset className={styles.scale}>
      <legend className={styles.srOnly}>Réponse à la question {question.position}</legend>
      <div className={styles.choiceRow}>
        {options.map((option) => (
          <button
            aria-checked={value === option.value}
            aria-label={`${option.value}. ${option.label}`}
            className={value === option.value ? styles.choiceSelected : styles.choice}
            key={option.value}
            onClick={() => onChange(Number(option.value))}
            role="radio"
            type="button"
          >
            {value === option.value ? "✓" : option.value}
          </button>
        ))}
      </div>
      <div className={styles.scaleLabels} aria-hidden="true">
        <span>{options[0]?.label}</span>
        <span>{options.at(-1)?.label}</span>
      </div>
    </fieldset>
  );
}

export default function MappNativeExperience({
  initialQuestionnaire,
  initialResult,
}: {
  initialQuestionnaire: MappQuestionnaireContext;
  initialResult: MappResultBundle | null;
}) {
  const [result, setResult] = useState(initialResult);
  const [answers, setAnswers] = useState<Record<string, MappAnswerValue>>(() => Object.fromEntries(
    initialQuestionnaire.answers.map((answer) => [answer.questionId, answer.value]),
  ));
  const firstMissing = initialQuestionnaire.questions.findIndex((question) => answers[question.id] === undefined);
  const [pageIndex, setPageIndex] = useState(
    firstMissing < 0
      ? Math.max(0, Math.ceil(initialQuestionnaire.questions.length / pageSize) - 1)
      : Math.floor(firstMissing / pageSize),
  );
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const queueRef = useRef<MappAnswerQueue | null>(null);
  const persistenceRef = useRef<ReturnType<typeof createMappLocalStoragePersistence> | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- restaure les réponses locales après l’hydratation */
  useEffect(() => {
    if (initialQuestionnaire.status === "completed") return;
    const persistence = createMappLocalStoragePersistence(`ministry:mapp:${initialQuestionnaire.attemptId}`);
    const restored = persistence.load();
    if (restored) {
      setAnswers((current) => ({
        ...current,
        ...Object.fromEntries(restored.pending.map((answer) => [answer.questionId, answer.value])),
      }));
      setSaveState(restored.pending.length || restored.retryBatch ? "pending" : "saved");
    }
    persistenceRef.current = persistence;
    queueRef.current = new MappAnswerQueue({
      attemptId: initialQuestionnaire.attemptId,
      serverRevision: initialQuestionnaire.serverRevision,
      initialSequence: Math.max(0, ...initialQuestionnaire.answers.map((answer) => answer.clientSequence)),
      restored,
      sender: saveMappAnswerBatch,
      persist: persistence.save,
    });
  }, [initialQuestionnaire]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const retry = () => {
      const queue = queueRef.current;
      if (!queue?.pendingCount) return;
      setSaveState("saving");
      void queue.flushAll()
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("offline"));
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  const pageCount = Math.ceil(initialQuestionnaire.questions.length / pageSize);
  const pageQuestions = useMemo(
    () => initialQuestionnaire.questions.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
    [initialQuestionnaire.questions, pageIndex],
  );
  const pageComplete = pageQuestions.length > 0 && pageQuestions.every((question) => answers[question.id] !== undefined);
  const answeredCount = initialQuestionnaire.questions.filter((question) => answers[question.id] !== undefined).length;
  const allComplete = answeredCount === initialQuestionnaire.expectedAnswerCount;

  async function answer(questionId: string, value: number) {
    const queue = queueRef.current;
    if (!queue) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    setSaveState("pending");
    setMessage("");
    try {
      await queue.enqueue(questionId, value);
      setSaveState(queue.pendingCount ? "pending" : "saved");
    } catch {
      setSaveState("offline");
      setMessage("Vos réponses restent sur cet appareil. La synchronisation reprendra avec le réseau.");
    }
  }

  async function flushAndMove(nextPage: number) {
    const queue = queueRef.current;
    if (!queue) return;
    setSaveState("saving");
    setMessage("");
    try {
      await queue.flushAll();
      setSaveState("saved");
      setPageIndex(nextPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSaveState("offline");
      setMessage("Connexion interrompue : cette étape est conservée, mais doit être confirmée avant de continuer.");
    }
  }

  async function finalize() {
    const queue = queueRef.current;
    if (!queue || !allComplete) return;
    setFinalizing(true);
    setSaveState("saving");
    setMessage("");
    try {
      await queue.flushAll();
      const finalized = await finalizeMappAttempt(initialQuestionnaire.attemptId);
      persistenceRef.current?.clear();
      setSaveState("saved");
      setResult(finalized.bundle);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setSaveState("error");
      setFinalizing(false);
      setMessage(cause instanceof Error ? cause.message : "La finalisation n’a pas pu être confirmée.");
    }
  }

  if (result) return <ResultPanel bundle={result} />;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <a href="/apps" className={styles.backLink}>← Mes outils</a>
        <div>
          <strong>Profil MAPP</strong>
          <span>Ministry School</span>
        </div>
        <span>{pageIndex + 1} / {pageCount}</span>
      </header>
      <div className={styles.progress} aria-label={`Étape ${pageIndex + 1} sur ${pageCount}`}>
        <span style={{ width: `${((pageIndex + 1) / pageCount) * 100}%` }} />
      </div>

      <section className={styles.questionnaire}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>ÉTAPE {pageIndex + 1} SUR {pageCount}</p>
          <h1>Répondez spontanément</h1>
          <p>{answeredCount} réponse{answeredCount > 1 ? "s" : ""} sur {initialQuestionnaire.expectedAnswerCount}</p>
        </div>

        <ol className={styles.questionList} start={pageIndex * pageSize + 1}>
          {pageQuestions.map((question) => (
            <li key={question.id}>
              <div className={styles.questionCopy}>
                <span>{String(question.position).padStart(2, "0")}</span>
                <h2>{question.prompt}</h2>
              </div>
              <QuestionScale
                question={question}
                value={answers[question.id]}
                onChange={(value) => void answer(question.id, value)}
              />
            </li>
          ))}
        </ol>

        <footer className={styles.navigation}>
          <button disabled={pageIndex === 0 || saveState === "saving"} onClick={() => void flushAndMove(pageIndex - 1)} type="button">
            Précédent
          </button>
          <p aria-live="polite" className={styles.saveState} data-state={saveState}>
            {saveState === "saved" && "✓ Enregistré sur le serveur"}
            {saveState === "pending" && "À synchroniser"}
            {saveState === "saving" && "Enregistrement…"}
            {saveState === "offline" && "Conservé sur cet appareil"}
            {saveState === "error" && "Vérification nécessaire"}
          </p>
          {pageIndex < pageCount - 1 ? (
            <button
              className={styles.primaryButton}
              disabled={!pageComplete || saveState === "saving"}
              onClick={() => void flushAndMove(pageIndex + 1)}
              type="button"
            >
              Continuer
            </button>
          ) : (
            <button
              className={styles.primaryButton}
              disabled={!allComplete || finalizing}
              onClick={() => void finalize()}
              type="button"
            >
              {finalizing ? "Calcul en cours…" : "Découvrir mon profil"}
            </button>
          )}
        </footer>
        {!pageComplete && <p className={styles.hint}>Répondez aux cinq affirmations pour continuer.</p>}
        {message && <p className={styles.error} role="alert">{message}</p>}
      </section>
    </main>
  );
}
