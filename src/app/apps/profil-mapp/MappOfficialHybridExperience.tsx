"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { createMappLocalStoragePersistence, MappAnswerQueue } from "@/lib/mapp/answer-queue";
import { saveMappAnswerBatch, saveMappDuelAnswer } from "@/lib/mapp/client";
import type { MappAnswerValue, MappQuestion, MappQuestionnaireContext } from "@/lib/mapp/types";
import styles from "./mapp-official.module.css";

const pageSize = 4;

export default function MappOfficialHybridExperience({
  questionnaire,
}: {
  questionnaire: MappQuestionnaireContext;
}) {
  const questions = questionnaire.questions;
  const totalPages = Math.ceil(questions.length / pageSize);
  const [duels, setDuels] = useState<Record<string, string>>(() =>
    Object.fromEntries((questionnaire.duelAnswers ?? []).map((answer) => [answer.questionId, answer.optionId])),
  );
  const [scales, setScales] = useState<Record<string, MappAnswerValue>>(() =>
    Object.fromEntries(questionnaire.answers.map((answer) => [answer.questionId, answer.value])),
  );
  const firstMissing = questions.findIndex((question) =>
    question.metadata?.mapp_kind === "natural_likert"
      ? scales[question.id] === undefined
      : !duels[question.id],
  );
  const [pageIndex, setPageIndex] = useState(firstMissing < 0 ? totalPages - 1 : Math.floor(firstMissing / pageSize));
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(Math.max(
    0,
    ...questionnaire.answers.map((answer) => answer.clientSequence),
    ...(questionnaire.duelAnswers ?? []).map((answer) => answer.clientSequence),
  ));
  const queue = useRef(new MappAnswerQueue({
    attemptId: questionnaire.attemptId,
    serverRevision: questionnaire.serverRevision,
    initialSequence: sequence.current,
    sender: saveMappAnswerBatch,
    persist: createMappLocalStoragePersistence(`ministry:mapp:${questionnaire.attemptId}`).save,
  }));

  const pageQuestions = useMemo(
    () => questions.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [pageIndex, questions],
  );
  const answered = questions.filter((question) =>
    question.metadata?.mapp_kind === "natural_likert"
      ? scales[question.id] !== undefined
      : Boolean(duels[question.id]),
  ).length;
  const complete = pageQuestions.length === pageSize && pageQuestions.every((question) =>
    question.metadata?.mapp_kind === "natural_likert"
      ? scales[question.id] !== undefined
      : Boolean(duels[question.id]),
  );
  const scalePage = pageQuestions[0]?.metadata?.mapp_kind === "natural_likert";

  async function choose(question: MappQuestion, optionId: string) {
    setDuels((current) => ({ ...current, [question.id]: optionId }));
    setState("saving");
    try {
      await saveMappDuelAnswer(questionnaire.attemptId, question.id, optionId, ++sequence.current);
      setMessage("");
      setState("saved");
    } catch {
      setState("error");
      setMessage("Impossible d’enregistrer cette réponse. Vérifiez votre connexion et réessayez.");
    }
  }

  async function answerScale(question: MappQuestion, value: number) {
    setScales((current) => ({ ...current, [question.id]: value }));
    setState("saving");
    try {
      await queue.current.enqueue(question.id, value);
      setMessage("");
      setState("saved");
    } catch {
      setState("error");
      setMessage("Impossible d’enregistrer cette réponse. Vérifiez votre connexion et réessayez.");
    }
  }

  async function move(nextPage: number) {
    if (!complete && nextPage > pageIndex) {
      setMessage("Répondez aux quatre questions pour continuer.");
      return;
    }
    setBusy(true);
    setState("saving");
    try {
      await queue.current.flushAll();
      setState("saved");
      setMessage("");
      setPageIndex(nextPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setState("error");
      setMessage("Impossible d’enregistrer cette étape. Vos réponses restent affichées.");
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    if (busy || !complete || answered !== questions.length) return;
    setBusy(true);
    setState("saving");
    try {
      await queue.current.flushAll();
      const response = await fetch(`/api/mapp/hybrid-44/attempts/${questionnaire.attemptId}/finalize`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Finalisation impossible");
      window.location.assign(`/apps/profil-mapp?attempt=${questionnaire.attemptId}&revision=${payload.revisionId}`);
    } catch (cause) {
      setState("error");
      setMessage(cause instanceof Error ? cause.message : "Impossible de calculer le résultat.");
      setBusy(false);
    }
  }

  return <main className={styles.shell}>
    <header className={styles.header}>
      <div className={styles.wordmark}><strong>Profil MAPP</strong><span>par l’Église MLK</span></div>
      <span>{pageIndex + 1} / {totalPages}</span>
    </header>
    <div className={styles.progress} aria-label={`Progression : étape ${pageIndex + 1} sur ${totalPages}`}>
      <span style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }} />
    </div>
    <section className={styles.page}>
      <p className={styles.step}><b>Étape {pageIndex + 1}</b> sur {totalPages}</p>
      <ol className={styles.list} start={pageIndex * pageSize + 1}>
        {pageQuestions.map((question) => <li key={question.id}>
          <div className={styles.copy}>
            <span>{String(question.position).padStart(2, "0")}</span>
            <h2>{question.prompt}</h2>
          </div>
          {scalePage ? <div className={styles.scale} role="radiogroup" aria-label={question.prompt}>
            {(question.options ?? []).map((option) => <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={scales[question.id] === option.value}
              className={scales[question.id] === option.value ? styles.scaleSelected : undefined}
              onClick={() => void answerScale(question, Number(option.value))}
            ><i>{scales[question.id] === option.value ? <Check size={16} /> : null}</i><span>{option.label}</span></button>)}
          </div> : <div className={styles.options} role="radiogroup" aria-label={question.prompt}>
            {(question.questionOptions ?? []).map((option) => <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={duels[question.id] === option.id}
              className={duels[question.id] === option.id ? styles.selected : undefined}
              onClick={() => void choose(question, option.id)}
            ><i>{duels[question.id] === option.id ? <Check size={16} /> : null}</i><span>{option.label}</span></button>)}
          </div>}
        </li>)}
      </ol>
      <footer className={styles.navigation}>
        <button disabled={pageIndex === 0 || busy} onClick={() => void move(pageIndex - 1)}><ArrowLeft size={16} /> Précédent</button>
        <div className={complete ? styles.complete : undefined} aria-live="polite">
          {state === "saving" || busy ? "Enregistrement…" : complete ? <><Check size={13} /> Étape complète</> : `${answered}/${questions.length} réponses`}
        </div>
        {pageIndex < totalPages - 1
          ? <button className={styles.next} disabled={busy} onClick={() => void move(pageIndex + 1)}>Continuer <ArrowRight size={16} /></button>
          : <button className={styles.next} disabled={!complete || answered !== questions.length || busy} onClick={() => void finalize()}>Découvrir mon profil <ArrowRight size={16} /></button>}
      </footer>
      {!complete && <p className={styles.hint}>Répondez aux quatre questions pour continuer.</p>}
      {message && <p className={styles.error} role="alert">{message}</p>}
    </section>
  </main>;
}

