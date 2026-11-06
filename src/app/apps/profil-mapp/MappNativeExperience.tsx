"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  createMappLocalStoragePersistence,
  MappAnswerQueue,
} from "@/lib/mapp/answer-queue";
import {
  finalizeMappAttempt,
  saveMappAnswerBatch,
  submitMappTieBreak,
} from "@/lib/mapp/client";
import { applyTieBreak, stableOptionOrder, tieBreakQuestions, type TieBreakRecord } from "@/lib/results/tie-breaker";
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
const PreviewShell = dynamic(() => import("@/app/preview/resultat/preview-shell"), {
  ssr: false,
  loading: () => <main className={styles.resultShell}><p>Chargement de votre restitution…</p></main>,
});
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

const profileLabels: Record<ResultProfileCode, string> = {
  conquerant: "Conquérant",
  communiquant: "Communiquant",
  facilitateur: "Facilitateur",
  analyste: "Analyste",
};
const officialTieBreakQuestions = tieBreakQuestions as Array<{
  id: string;
  title: string;
  prompt: string;
  options: Record<ResultProfileCode, string>;
}>;

export function ResultPanel({ bundle, onResolved }: { bundle: MappResultBundle; onResolved: (bundle: MappResultBundle) => void }) {
  const scores = resultScores(bundle);
  const classification = applyTieBreak(
    scores.map((score) => ({ code: score.code, value: score.percentage })),
    bundle.tieBreak as TieBreakRecord | null,
  );
  const displayScores = toRelativePercentages(scores.map((score) => ({ code: score.code, value: score.percentage })));
  const [answers, setAnswers] = useState<Record<string, ResultProfileCode>>({});
  const [submitting, setSubmitting] = useState(false);
  const [tieError, setTieError] = useState("");

  if (!classification.primary || !classification.secondary) {
    const candidates = (classification.hasPrimaryTie
      ? classification.primaryCandidates
      : classification.secondaryCandidates
    ).filter((code): code is ResultProfileCode => code in profileLabels);
    if (bundle.tieBreak) {
      return <main className={styles.resultShell}>
        <header className={styles.resultHero}>
          <a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a>
          <p className={styles.eyebrow}>PROFIL MAPP · RÉSULTAT</p>
          <h1>Plusieurs tendances restent à égalité</h1>
          <p>Vos trois réponses confirment un profil mixte. Aucun classement arbitraire n’est appliqué et vos scores naturels restent inchangés.</p>
        </header>
      </main>;
    }
    async function submitTieBreak() {
      setSubmitting(true);
      setTieError("");
      try {
        const resolved = await submitMappTieBreak(
          bundle.attemptId,
          bundle.resultRevisionId,
          officialTieBreakQuestions.map((question) => ({ questionId: question.id, selectedCode: answers[question.id] })),
        );
        onResolved(resolved);
      } catch (cause) {
        setSubmitting(false);
        setTieError(cause instanceof Error ? cause.message : "Le départage n’a pas pu être confirmé.");
      }
    }
    return <main className={styles.resultShell}>
      <header className={styles.resultHero}>
        <a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a>
        <p className={styles.eyebrow}>UNE DERNIÈRE ÉTAPE</p>
        <h1>Précisons votre profil</h1>
        <p>Certaines tendances ressortent à égalité. Ces trois situations officielles précisent uniquement l’ordre de présentation, sans modifier vos scores.</p>
      </header>
      <section className={styles.tieBreakQuestions}>
        {officialTieBreakQuestions.map((question, index) => <fieldset key={question.id}>
          <legend><span>0{index + 1}</span><strong>{question.title}</strong><small>{question.prompt}</small></legend>
          <div>{stableOptionOrder(candidates, `${bundle.attemptId}:${question.id}`).map((code) => <label key={code} className={answers[question.id] === code ? styles.tieSelected : undefined}>
            <input type="radio" name={question.id} value={code} checked={answers[question.id] === code} onChange={() => setAnswers((current) => ({ ...current, [question.id]: code }))} />
            <b>{profileLabels[code]}</b><span>{question.options[code]}</span>
          </label>)}</div>
        </fieldset>)}
      </section>
      <button className={styles.primaryButton} disabled={submitting || Object.keys(answers).length !== 3} onClick={() => void submitTieBreak()} type="button">
        {submitting ? "Enregistrement…" : "Découvrir mon profil"}
      </button>
      {tieError && <p className={styles.error} role="alert">{tieError}</p>}
    </main>;
  }

  return <div className={styles.resultShell}>
    <a href="/etudiant/identite" className={styles.backLink}>← Mon identité</a>
    <PreviewShell
    initialProfile={classification.primary}
    initialSecondary={classification.secondary}
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

  if (result) return <ResultPanel bundle={result} onResolved={setResult} />;

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <a href="/etudiant/outils" className={styles.backLink}>← Mes outils</a>
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
