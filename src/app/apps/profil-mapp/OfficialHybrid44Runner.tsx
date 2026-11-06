"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveMappAnswerBatch, saveMappDuelAnswer } from "@/lib/mapp/client";
import type { MappAnswerValue as AnswerValue, MappQuestionnaireContext } from "@/lib/mapp/types";
import { AnswerScale } from "./OfficialAnswerScale";

type Option = { id: string; option_key: string; label: string; position: number };
type Kind = "natural_duel" | "natural_likert" | "pressure_duel";
type Question = { id: string; prompt: string; position: number; metadata: { mapp_kind: Kind; source_id: string; dimension_code?: string }; question_options: Option[] };
const pageSize = 4;
const totalCount = 44;
const totalPages = 11;

export function Hybrid44Runner({ questionnaire }: { questionnaire: MappQuestionnaireContext }) {
  const attemptId = questionnaire.attemptId;
  const router = useRouter();
  const questions = useMemo<Question[]>(() => questionnaire.questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    position: question.position,
    metadata: question.metadata as Question["metadata"],
    question_options: (question.questionOptions ?? []).map((option) => ({
      id: option.id,
      option_key: option.key,
      label: option.label,
      position: option.position,
    })),
  })), [questionnaire.questions]);
  const [duels, setDuels] = useState<Record<string, string>>(() => Object.fromEntries((questionnaire.duelAnswers ?? []).map((row) => [row.questionId, row.optionId])));
  const [scales, setScales] = useState<Record<string, AnswerValue>>(() => Object.fromEntries(questionnaire.answers.map((row) => [row.questionId, row.value])));
  const initialMissing = questions.findIndex((question) => question.metadata.mapp_kind === "natural_likert" ? scales[question.id] === undefined : !duels[question.id]);
  const [pageIndex, setPageIndex] = useState(initialMissing < 0 ? totalPages - 1 : Math.floor(initialMissing / pageSize));
  const [state, setState] = useState<"saved" | "saving" | "error">("saved");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sequence = useRef(Math.max(0, ...questionnaire.answers.map((row) => row.clientSequence), ...(questionnaire.duelAnswers ?? []).map((row) => row.clientSequence)));

  const pageQuestions = useMemo(() => questions.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize), [pageIndex, questions]);
  const complete = pageQuestions.length === pageSize && pageQuestions.every((question) => question.metadata.mapp_kind === "natural_likert" ? scales[question.id] !== undefined : Boolean(duels[question.id]));
  const answered = questions.filter((question) => question.metadata.mapp_kind === "natural_likert" ? scales[question.id] !== undefined : Boolean(duels[question.id])).length;

  async function saveDuel(question: Question, optionId: string) {
    await saveMappDuelAnswer(attemptId, question.id, optionId, ++sequence.current);
  }
  async function choose(question: Question, optionId: string) {
    setDuels((current) => ({ ...current, [question.id]: optionId })); setState("saving");
    try { await saveDuel(question, optionId); setMessage(""); setState("saved"); } catch { setMessage("Impossible d’enregistrer cette réponse. Elle reste affichée : réessaie."); setState("error"); }
  }
  async function answerScale(question: Question, value: AnswerValue) {
    setScales((current) => ({ ...current, [question.id]: value })); setState("saving");
    try {
      await saveMappAnswerBatch({
        attemptId,
        mutationId: crypto.randomUUID(),
        expectedRevision: questionnaire.serverRevision,
        clientSequence: ++sequence.current,
        answers: [{ questionId: question.id, value }],
      });
      setMessage(""); setState("saved");
    } catch { setMessage("Impossible d’enregistrer cette réponse. Elle reste affichée : réessaie."); setState("error"); }
  }
  function revealMissing() {
    const missing = pageQuestions.find((question) => question.metadata.mapp_kind === "natural_likert" ? scales[question.id] === undefined : !duels[question.id]);
    if (!missing) return;
    setMessage(`Réponds à la question ${missing.metadata.source_id.replace(/^[NPE]/, "")} avant de continuer.`);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-question-id="${missing.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  async function savePage() {
    setState("saving"); setMessage("");
    try {
      // Les réponses sont déjà confirmées au fil de la saisie. Ne pas les écrire une seconde fois.
      setState("saved"); return true;
    } catch { setState("error"); setMessage("Impossible d’enregistrer cette étape. Tes réponses restent affichées : vérifie ta connexion et réessaie."); return false; }
  }
  async function advance() {
    if (busy) return;
    if (!complete) { revealMissing(); return; }
    setBusy(true);
    if (await savePage()) { setPageIndex((current) => current + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    setBusy(false);
  }
  async function finalize() {
    if (busy || !complete || answered !== totalCount) return;
    setBusy(true);
    try {
      if (!await savePage()) { setBusy(false); return; }
      const response = await fetch(`/api/mapp/hybrid-44/attempts/${attemptId}/finalize`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Finalisation impossible");
      router.push(`/apps/profil-mapp/test/${attemptId}/departage?revision=${payload.revisionId}`);
    } catch { setMessage("Impossible de calculer le résultat. Tes réponses sont conservées : réessaie."); setBusy(false); }
  }

  if (!pageQuestions.length) return <main className="center-shell"><h1>Questionnaire indisponible</h1><p>{message}</p></main>;
  const isScalePage = pageQuestions[0]?.metadata.mapp_kind === "natural_likert";
  return <main className="assessment-shell assessment-pages multi-question-pages disc-assessment duel-v1-assessment">
    <header className="assessment-header"><div className="assessment-wordmark"><strong>Profil MAPP</strong><span>par l’Église MLK</span></div><span className="assessment-count">{pageIndex + 1} / {totalPages}</span></header>
    <div className="page-progress" aria-label={`Progression : étape ${pageIndex + 1} sur ${totalPages}`}><span style={{ width: `${((pageIndex + 1) / totalPages) * 100}%` }} /></div>
    <section key={pageIndex} className="question-page duel-v1-page"><p className="duel-v1-step"><b>Étape {pageIndex + 1}</b> sur {totalPages}</p>
      {isScalePage ? <ol className="five-question-list disc-pressure-list" start={pageIndex * pageSize + 1}>{pageQuestions.map((question) => <li key={question.id} data-question-id={question.id}><div className="five-question-copy"><span>{String(question.position).padStart(2, "0")}</span><h2>{question.prompt}</h2></div><AnswerScale questionNumber={question.position} value={scales[question.id]} labels={questionnaire.questions.find((item) => item.id === question.id)?.options.map((option) => option.label)} onChange={(value) => void answerScale(question, value)} /></li>)}</ol>
      : <ol className="duel-v1-list" start={pageIndex * pageSize + 1}>{pageQuestions.map((question) => <li key={question.id} data-question-id={question.id}><div className="duel-v1-copy"><span>{String(question.position).padStart(2, "0")}</span><h2>{question.prompt}</h2></div><div className="duel-v1-options" role="radiogroup" aria-label={question.prompt}>{question.question_options.map((option) => <button key={option.id} type="button" role="radio" aria-checked={duels[question.id] === option.id} className={duels[question.id] === option.id ? "selected" : ""} onClick={() => void choose(question, option.id)}><i aria-hidden="true">{duels[question.id] === option.id ? <Check size={16} /> : null}</i><span>{option.label}</span></button>)}</div></li>)}</ol>}
      <footer className="page-navigation"><button className="question-back" disabled={pageIndex === 0 || busy} onClick={() => { setMessage(""); setPageIndex((current) => current - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ArrowLeft size={16}/> Précédent</button><div className={`page-save-state ${state} ${complete ? "page-complete" : ""}`} aria-live="polite">{state === "saving" || busy ? "Enregistrement…" : complete ? <><Check size={13}/> Étape complète</> : `${answered}/${totalCount} réponses`}</div>{pageIndex < totalPages - 1 ? <button className="question-next" disabled={busy} onClick={() => void advance()}>{busy ? "Enregistrement…" : <>Continuer <ArrowRight size={16}/></>}</button> : <button className="question-next" disabled={!complete || answered !== totalCount || busy} onClick={() => void finalize()}>{busy ? "Calcul…" : <>Découvrir mon profil <ArrowRight size={16}/></>}</button>}</footer>
      {!complete && <p className="completion-hint">Réponds aux quatre questions pour continuer.</p>}{message && <p className="form-error" role="alert">{message}</p>}
    </section>
  </main>;
}
